import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Board,
  CHAPTERS,
  DIFFICULTIES,
  DifficultyId,
  LEVELS,
  MODES,
  ModeId,
  Piece,
  SIZE,
  applyDifficulty,
  boardWithObstacles,
  canPlace,
  cloneBoard,
  emptyBoard,
  getDifficulty,
  hasAnyPlacement,
  place,
  randomPiece,
  resolveClears,
  scoreFor,
  starsFor,
} from "@/lib/blast/engine";
import {
  ACHIEVEMENTS,
  POWERUPS,
  PowerupId,
  Profile,
  loadProfile,
  newlyUnlocked,
  rankFor,
  saveProfile,
  xpLevel,
} from "@/lib/blast/profile";
import { playSound } from "@/lib/blast/sound";
import { cn } from "@/lib/utils";

type Phase =
  | "menu"
  | "modes"
  | "difficulty"
  | "chapters"
  | "levels"
  | "achievements"
  | "playing"
  | "won"
  | "lost";

type Progress = Record<string, number>; // `${mode}:${diff}:${level}` -> stars

const STORE = "lovehub.blockblast.progress.v1";
const BEST = "lovehub.blockblast.best.v1";
const CELL_GAP = 4;

const pkey = (d: DifficultyId, n: number) => `${d}:${n}`;

function loadProgress(): Progress {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "{}");
  } catch {
    return {};
  }
}

export function BlockBlastGame() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [progress, setProgress] = useState<Progress>({});
  const [best, setBest] = useState(0);
  const [sound, setSound] = useState(true);
  const [profile, setProfile] = useState<Profile>(() => ({
    xp: 0,
    coins: 150,
    achievements: [],
    stats: {
      gamesPlayed: 0,
      linesCleared: 0,
      bestCombo: 0,
      totalScore: 0,
      levelsCleared: 0,
      powerupsUsed: 0,
      bestClassic: 0,
      bestTime: 0,
      bestSurvival: 0,
    },
  }));

  const [mode, setMode] = useState<ModeId>("adventure");
  const [diffId, setDiffId] = useState<DifficultyId>("normal");
  const [chapter, setChapter] = useState(1);
  const [level, setLevel] = useState(1);

  const [board, setBoard] = useState<Board>(emptyBoard);
  const [tray, setTray] = useState<(Piece | null)[]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [armed, setArmed] = useState<PowerupId | null>(null);
  const [reward, setReward] = useState<{ coins: number; xp: number } | null>(null);
  const [burst, setBurst] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [history, setHistory] = useState<
    { board: Board; tray: (Piece | null)[]; score: number; moves: number; combo: number }[]
  >([]);

  const diff = getDifficulty(diffId);
  const cfg = useMemo(() => applyDifficulty(LEVELS[level - 1]!, diff), [level, diff]);
  const xpInfo = xpLevel(profile.xp);
  const isAdventure = mode === "adventure";

  useEffect(() => {
    setProgress(loadProgress());
    setBest(Number(localStorage.getItem(BEST) ?? 0));
    setSound(localStorage.getItem("blockblast.sound") !== "off");
    setProfile(loadProfile());
    const d = localStorage.getItem("blockblast.diff") as DifficultyId | null;
    if (d) setDiffId(d);
  }, []);

  const say = useCallback((text: string) => {
    setToast({ id: Date.now(), text });
    setTimeout(() => setToast((t) => (t && Date.now() - t.id > 900 ? null : t)), 1100);
  }, []);

  const fx = useCallback(
    (name: Parameters<typeof playSound>[0]) => {
      if (sound) playSound(name);
    },
    [sound],
  );

  const persist = useCallback((p: Profile) => {
    saveProfile(p);
    setProfile(p);
  }, []);

  const refill = useCallback(
    (n: number, bias = diff.hardBias) => [
      randomPiece(n, bias),
      randomPiece(n, bias),
      randomPiece(n, bias),
    ],
    [diff.hardBias],
  );

  const startRun = useCallback(
    (m: ModeId, n: number, dId: DifficultyId = diffId) => {
      const d = getDifficulty(dId);
      setDiffId(dId);
      setMode(m);
      setLevel(n);
      setBoard(m === "survival" ? boardWithObstacles(d.obstacles + 6) : emptyBoard());
      setTray(refill(m === "adventure" ? n : 6, d.hardBias));
      setScore(0);
      setMoves(0);
      setCombo(0);
      setHistory([]);
      setBurst(new Set());
      setArmed(null);
      setReward(null);
      setTimeLeft(m === "time" ? d.timeSec : 0);
      setPhase("playing");
    },
    [refill, diffId],
  );


  // ---- timer ------------------------------------------------------------
  const finishRef = useRef<(won: boolean, s: number) => void>(() => {});
  useEffect(() => {
    if (phase !== "playing" || mode !== "time") return;
    const t = setInterval(() => {
      setTimeLeft((v) => {
        if (v <= 1) {
          clearInterval(t);
          finishRef.current(true, 0);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, mode]);

  // ---- drag state -------------------------------------------------------
  const boardRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{
    piece: Piece;
    slot: number;
    x: number;
    y: number;
    cell: number;
  } | null>(null);
  const [ghost, setGhost] = useState<{ r: number; c: number; ok: boolean } | null>(null);
  const boardRefState = useRef(board);
  useEffect(() => {
    boardRefState.current = board;
  }, [board]);

  const cellSize = () => {
    const el = boardRef.current;
    if (!el) return 40;
    return (el.clientWidth - CELL_GAP * (SIZE + 1)) / SIZE;
  };

  const computeGhost = useCallback((piece: Piece, clientX: number, clientY: number) => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cs = (rect.width - CELL_GAP * (SIZE + 1)) / SIZE;
    const step = cs + CELL_GAP;
    const originX = clientX - (piece.shape.w * step - CELL_GAP) / 2;
    const originY = clientY - (piece.shape.h * step - CELL_GAP) / 2 - step * 1.4;
    const c = Math.round((originX - rect.left - CELL_GAP) / step);
    const r = Math.round((originY - rect.top - CELL_GAP) / step);
    if (r < -1 || c < -1 || r > SIZE || c > SIZE) return null;
    return { r, c, ok: canPlace(boardRefState.current, piece.shape, r, c) };
  }, []);

  // ---- finishing a run --------------------------------------------------
  const finish = useCallback(
    (won: boolean, finalScore: number) => {
      const s = finalScore || score;
      const coins = Math.max(5, Math.round((s / 60) * diff.coinMul) + (won && isAdventure ? 40 : 0));
      const xp = Math.max(5, Math.round((s / 12) * diff.xpMul));

      const stats = { ...profile.stats };
      stats.gamesPlayed += 1;
      stats.totalScore += s;
      stats.bestCombo = Math.max(stats.bestCombo, combo);
      if (mode === "classic") stats.bestClassic = Math.max(stats.bestClassic, s);
      if (mode === "time") stats.bestTime = Math.max(stats.bestTime, s);
      if (mode === "survival") stats.bestSurvival = Math.max(stats.bestSurvival, s);
      if (won && isAdventure) stats.levelsCleared += 1;

      let next: Profile = {
        ...profile,
        coins: profile.coins + coins,
        xp: profile.xp + xp,
        stats,
      };
      const unlockedAch = newlyUnlocked(next);
      if (unlockedAch.length) {
        next = {
          ...next,
          coins: next.coins + unlockedAch.reduce((a, b) => a + b.reward, 0),
          achievements: [...next.achievements, ...unlockedAch.map((a) => a.id)],
        };
        setTimeout(() => say(`🏅 ${unlockedAch[0]!.name}`), 400);
      }
      persist(next);
      setReward({ coins, xp });

      if (s > best) {
        setBest(s);
        localStorage.setItem(BEST, String(s));
      }
      if (won && isAdventure) {
        const stars = starsFor(s, cfg.target);
        setProgress((prev) => {
          const k = pkey(diffId, level);
          const upd = { ...prev, [k]: Math.max(prev[k] ?? 0, stars) };
          localStorage.setItem(STORE, JSON.stringify(upd));
          return upd;
        });
      }
      fx(won ? "win" : "lose");
      setPhase(won ? "won" : "lost");
    },
    [score, combo, mode, diff, isAdventure, profile, persist, best, cfg, diffId, level, fx, say],
  );
  finishRef.current = (won) => finish(won, 0);

  const commit = useCallback(
    (piece: Piece, slot: number, r: number, c: number) => {
      setHistory((h) => [...h.slice(-9), { board, tray, score, moves, combo }]);
      let nb = place(board, piece, r, c);
      const res = resolveClears(nb);
      const lines = res.rows.length + res.cols.length;
      const nextCombo = lines > 0 ? combo + 1 : 0;
      const gained = scoreFor(piece.shape.cells.length, lines, nextCombo);

      if (lines > 0) {
        setBurst(new Set(res.cleared.map(([rr, cc]) => `${rr},${cc}`)));
        setTimeout(() => setBurst(new Set()), 320);
        nb = res.board;
        fx(lines >= 2 ? "combo" : "clear");
        if (lines >= 2) say(`${lines}x ترکیب! +${gained}`);
        else if (nextCombo > 1) say(`کمبو ${nextCombo}! +${gained}`);
        persist({
          ...profile,
          stats: { ...profile.stats, linesCleared: profile.stats.linesCleared + lines },
        });
      } else {
        fx("place");
      }

      const newScore = score + gained;
      setBoard(nb);
      setScore(newScore);
      setCombo(nextCombo);
      const newMoves = moves + 1;
      setMoves(newMoves);

      let nt = tray.map((p, i) => (i === slot ? null : p));
      if (nt.every((p) => p === null)) nt = refill(isAdventure ? level : 6);
      setTray(nt);

      setTimeout(
        () => {
          if (isAdventure && newScore >= cfg.target) return finish(true, newScore);
          const alive = nt.filter(Boolean) as Piece[];
          const stuck = alive.length > 0 && alive.every((p) => !hasAnyPlacement(nb, p.shape));
          if (stuck) return finish(false, newScore);
          if (isAdventure && newMoves >= cfg.moves) return finish(false, newScore);
        },
        lines > 0 ? 340 : 60,
      );
    },
    [
      board, tray, score, moves, combo, level, cfg, refill, fx, say, finish, isAdventure,
      profile, persist,
    ],
  );

  const onPointerDown = (e: React.PointerEvent, piece: Piece, slot: number) => {
    if (phase !== "playing" || armed) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ piece, slot, x: e.clientX, y: e.clientY, cell: cellSize() });
    setGhost(computeGhost(piece, e.clientX, e.clientY));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    e.preventDefault();
    setDrag({ ...drag, x: e.clientX, y: e.clientY });
    setGhost(computeGhost(drag.piece, e.clientX, e.clientY));
  };

  const onPointerUp = () => {
    if (!drag) return;
    const g = ghost;
    if (g && g.ok) commit(drag.piece, drag.slot, g.r, g.c);
    else if (g) fx("invalid");
    setDrag(null);
    setGhost(null);
  };

  // ---- power-ups --------------------------------------------------------
  const spend = (id: PowerupId) => {
    const p = POWERUPS.find((x) => x.id === id)!;
    if (profile.coins < p.cost) {
      say("سکه کافی نداری!");
      return false;
    }
    persist({
      ...profile,
      coins: profile.coins - p.cost,
      stats: { ...profile.stats, powerupsUsed: profile.stats.powerupsUsed + 1 },
    });
    return true;
  };

  const usePowerup = (id: PowerupId) => {
    if (phase !== "playing") return;
    if (id === "hammer" || id === "bomb") {
      setArmed((a) => (a === id ? null : id));
      return;
    }
    if (id === "undo") {
      if (!history.length) return say("حرکتی برای برگشت نیست");
      if (!spend("undo")) return;
      const h = history[history.length - 1]!;
      setBoard(h.board);
      setTray(h.tray);
      setScore(h.score);
      setMoves(h.moves);
      setCombo(h.combo);
      setHistory((x) => x.slice(0, -1));
      fx("place");
      return;
    }
    if (id === "swap") {
      if (!spend("swap")) return;
      setTray(refill(isAdventure ? level : 6));
      fx("place");
    }
  };

  const onCellClick = (r: number, c: number) => {
    if (!armed || phase !== "playing") return;
    if (armed === "hammer") {
      if (board[r]![c] === null) return;
      if (!spend("hammer")) return setArmed(null);
      const nb = cloneBoard(board);
      nb[r]![c] = null;
      setBoard(nb);
    } else {
      if (!spend("bomb")) return setArmed(null);
      const nb = cloneBoard(board);
      const hit: string[] = [];
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && cc >= 0 && rr < SIZE && cc < SIZE) {
            nb[rr]![cc] = null;
            hit.push(`${rr},${cc}`);
          }
        }
      setBurst(new Set(hit));
      setTimeout(() => setBurst(new Set()), 320);
      setBoard(nb);
    }
    fx("clear");
    setArmed(null);
  };

  const ghostCells = useMemo(() => {
    if (!ghost || !drag) return new Set<string>();
    return new Set(drag.piece.shape.cells.map(([dr, dc]) => `${ghost.r + dr},${ghost.c + dc}`));
  }, [ghost, drag]);

  const totalStars = Object.values(progress).reduce((a, b) => a + b, 0);
  const unlocked = useMemo(() => {
    let n = 1;
    while (n < LEVELS.length && (progress[pkey(diffId, n)] ?? 0) > 0) n++;
    return n;
  }, [progress, diffId]);

  return (
    <div
      dir="rtl"
      className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden select-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: drag ? "none" : "auto" }}
    >
      <Aurora />

      {phase === "menu" && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 p-7 text-center">
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="blk float h-9 w-9 rounded-xl"
                style={
                  {
                    "--bc": `var(--b${i + 2})`,
                    animationDelay: `${i * 0.15}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.35em] text-white/40">LOVEHUB</p>
            <h1 className="neon-text text-5xl font-black tracking-tight">BLOCK BLAST</h1>
            <p className="mt-1 text-xs text-white/45">ساخته‌شده توسط تیم SECTOR</p>
          </div>

          <PlayerBar profile={profile} />

          <div className="glass flex w-full max-w-xs justify-around rounded-2xl py-3 text-sm">
            <div>
              <div className="text-[11px] text-white/50">بهترین امتیاز</div>
              <div className="text-xl font-bold tabular-nums">{best}</div>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <div className="text-[11px] text-white/50">ستاره‌ها</div>
              <div className="text-xl font-bold tabular-nums">⭐ {totalStars}</div>
            </div>
          </div>

          <div className="flex w-full max-w-xs flex-col gap-3">
            <button onClick={() => setPhase("modes")} className="btn-neon">
              ▶ شروع بازی
            </button>
            <button onClick={() => setPhase("achievements")} className="btn-ghost">
              🏅 دستاوردها
            </button>
            <button
              onClick={() => {
                const v = !sound;
                setSound(v);
                localStorage.setItem("blockblast.sound", v ? "on" : "off");
              }}
              className="btn-ghost"
            >
              {sound ? "🔊 صدا روشن" : "🔇 صدا خاموش"}
            </button>
          </div>
        </div>
      )}

      {phase === "modes" && (
        <Screen title="حالت بازی" onBack={() => setPhase("menu")}>
          <div className="flex flex-col gap-3">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setMode(m.id);
                  setPhase("difficulty");
                }}
                className="glass flex items-center gap-3 rounded-2xl p-4 text-right transition active:scale-[0.98]"
              >
                <span className="text-3xl">{m.icon}</span>
                <span className="flex-1">
                  <span className="block text-base font-black">{m.name}</span>
                  <span className="block text-[11px] text-white/55">{m.desc}</span>
                </span>
                <span className="text-white/35">›</span>
              </button>
            ))}
          </div>
        </Screen>
      )}

      {phase === "difficulty" && (
        <Screen title="درجه سختی" onBack={() => setPhase("modes")}>
          <div className="flex flex-col gap-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setDiffId(d.id);
                  localStorage.setItem("blockblast.diff", d.id);
                  if (mode === "adventure") setPhase("chapters");
                  else startRun(mode, 1, d.id);
                }}
                className={cn(
                  "glass flex items-center gap-3 rounded-2xl p-4 text-right transition active:scale-[0.98]",
                  diffId === d.id && "ring-2 ring-[var(--b4)]",
                )}
              >
                <span className="text-3xl">{d.icon}</span>
                <span className="flex-1">
                  <span className="block text-base font-black">{d.name}</span>
                  <span className="block text-[11px] text-white/55">{d.desc}</span>
                </span>
                <span className="chip">×{d.coinMul} 🪙</span>
              </button>
            ))}
          </div>
        </Screen>
      )}

      {phase === "chapters" && (
        <Screen title="فصل‌ها" onBack={() => setPhase("difficulty")}>
          <div className="flex flex-col gap-3">
            {CHAPTERS.map((ch) => {
              const locked = ch.from > unlocked;
              const stars = Array.from({ length: ch.to - ch.from + 1 }, (_, i) =>
                progress[pkey(diffId, ch.from + i)] ?? 0,
              ).reduce((a, b) => a + b, 0);
              return (
                <button
                  key={ch.id}
                  disabled={locked}
                  onClick={() => {
                    setChapter(ch.id);
                    setPhase("levels");
                  }}
                  className={cn(
                    "glass flex items-center gap-3 rounded-2xl p-4 text-right transition active:scale-[0.98]",
                    locked && "opacity-40",
                  )}
                >
                  <span className="text-3xl">{locked ? "🔒" : ch.icon}</span>
                  <span className="flex-1">
                    <span className="block text-base font-black">
                      فصل {ch.id} · {ch.name}
                    </span>
                    <span className="block text-[11px] text-white/55">
                      مراحل {ch.from}–{ch.to}
                    </span>
                  </span>
                  <span className="chip">⭐ {stars}/{(ch.to - ch.from + 1) * 3}</span>
                </button>
              );
            })}
          </div>
        </Screen>
      )}

      {phase === "levels" && (
        <Screen title={`فصل ${chapter}`} onBack={() => setPhase("chapters")}>
          <div className="grid grid-cols-3 gap-3">
            {LEVELS.filter((l) => {
              const ch = CHAPTERS.find((x) => x.id === chapter)!;
              return l.n >= ch.from && l.n <= ch.to;
            }).map((l) => {
              const locked = l.n > unlocked;
              const s = progress[pkey(diffId, l.n)] ?? 0;
              return (
                <button
                  key={l.n}
                  disabled={locked}
                  onClick={() => startRun("adventure", l.n)}
                  className={cn(
                    "glass flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl transition active:scale-95",
                    locked && "opacity-35",
                  )}
                >
                  <span className="text-lg font-black">{locked ? "🔒" : l.n}</span>
                  <span className="text-[9px] text-white/60">{l.name}</span>
                  <span className="text-[9px] leading-none text-white/60">
                    {"★".repeat(s)}
                    {"☆".repeat(locked ? 0 : 3 - s)}
                  </span>
                </button>
              );
            })}
          </div>
        </Screen>
      )}

      {phase === "achievements" && (
        <Screen title="دستاوردها" onBack={() => setPhase("menu")}>
          <PlayerBar profile={profile} />
          <div className="mt-3 flex flex-col gap-2">
            {ACHIEVEMENTS.map((a) => {
              const done = profile.achievements.includes(a.id);
              return (
                <div
                  key={a.id}
                  className={cn(
                    "glass flex items-center gap-3 rounded-2xl p-3",
                    !done && "opacity-55",
                  )}
                >
                  <span className="text-2xl">{done ? a.icon : "🔒"}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold">{a.name}</span>
                    <span className="block text-[11px] text-white/55">{a.desc}</span>
                  </span>
                  <span className="chip">+{a.reward} 🪙</span>
                </div>
              );
            })}
          </div>
        </Screen>
      )}

      {(phase === "playing" || phase === "won" || phase === "lost") && (
        <div className="relative z-10 flex flex-1 flex-col gap-3 p-4">
          <header className="flex items-center gap-2">
            <button
              onClick={() => setPhase("menu")}
              className="glass grid h-10 w-10 place-items-center rounded-2xl text-lg"
              aria-label="بازگشت"
            >
              ‹
            </button>
            <div className="glass flex-1 rounded-2xl px-3 py-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-white/60">
                  {isAdventure
                    ? `مرحله ${cfg.n} · ${cfg.name}`
                    : MODES.find((m) => m.id === mode)!.name}{" "}
                  · {diff.icon} {diff.name}
                </span>
                <span className="text-[11px] text-white/60">
                  {mode === "time"
                    ? `⏱ ${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`
                    : isAdventure
                      ? `${moves}/${cfg.moves} حرکت`
                      : `${moves} حرکت`}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="neon-text text-2xl font-black tabular-nums">{score}</span>
                <span className="text-xs text-white/50">
                  {isAdventure ? `هدف ${cfg.target}` : `🪙 ${profile.coins}`}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--b3),var(--b1),var(--b5))] transition-all duration-500"
                  style={{
                    width: `${
                      isAdventure
                        ? Math.min(100, (score / cfg.target) * 100)
                        : mode === "time"
                          ? (timeLeft / diff.timeSec) * 100
                          : Math.min(100, (score / 3000) * 100)
                    }%`,
                  }}
                />
              </div>
            </div>
          </header>

          <div className="flex items-center justify-between gap-1">
            <div className="flex gap-1.5">
              {POWERUPS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => usePowerup(p.id)}
                  title={p.desc}
                  className={cn(
                    "chip flex items-center gap-1",
                    armed === p.id && "!bg-[var(--b4)]/30 ring-1 ring-[var(--b4)]",
                    profile.coins < p.cost && "opacity-45",
                  )}
                >
                  <span>{p.icon}</span>
                  <span className="tabular-nums">{p.cost}</span>
                </button>
              ))}
            </div>
            {combo > 1 && <span className="chip !text-[var(--b2)]">🔥 {combo}</span>}
          </div>

          {armed && (
            <p className="-mt-1 text-center text-[11px] text-[var(--b3)]">
              {armed === "hammer" ? "یک بلوک را لمس کن" : "مرکز انفجار را لمس کن"}
            </p>
          )}

          <div
            ref={boardRef}
            dir="ltr"
            className="board relative aspect-square w-full rounded-[26px]"
            style={{ padding: CELL_GAP }}
          >
            <div
              className="grid h-full w-full"
              style={{ gridTemplateColumns: `repeat(${SIZE},1fr)`, gap: CELL_GAP }}
            >
              {board.map((row, r) =>
                row.map((v, c) => {
                  const key = `${r},${c}`;
                  const isGhost = ghostCells.has(key);
                  return (
                    <div
                      key={key}
                      onClick={() => onCellClick(r, c)}
                      className={cn(
                        "relative rounded-[22%] transition-all duration-150",
                        v === null ? "bg-white/[0.05]" : "blk",
                        isGhost && (ghost?.ok ? "ghost-ok" : "ghost-bad"),
                        burst.has(key) && "burst",
                        armed && "cursor-crosshair",
                      )}
                      style={
                        v !== null
                          ? ({ "--bc": `var(--b${v + 1})` } as React.CSSProperties)
                          : isGhost && ghost?.ok
                            ? ({ "--bc": `var(--b${drag!.piece.color + 1})` } as React.CSSProperties)
                            : undefined
                      }
                    />
                  );
                }),
              )}
            </div>
          </div>

          <div className="mt-auto grid grid-cols-3 items-center gap-2 pb-2">
            {tray.map((p, i) => (
              <div key={i} className="flex h-24 items-center justify-center">
                {p && (
                  <div
                    onPointerDown={(e) => onPointerDown(e, p, i)}
                    className={cn(
                      "cursor-grab touch-none transition-opacity",
                      drag?.slot === i && "opacity-25",
                      !hasAnyPlacement(board, p.shape) && "opacity-40 grayscale",
                    )}
                  >
                    <PieceView piece={p} cell={22} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {drag && (
        <div
          className="pointer-events-none fixed z-50 drop-shadow-[0_10px_25px_rgba(0,0,0,.6)]"
          style={{
            left: drag.x,
            top: drag.y - (cellSize() + CELL_GAP) * 1.4,
            transform: "translate(-50%,-50%) scale(1.02)",
          }}
        >
          <PieceView piece={drag.piece} cell={cellSize()} />
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-1/3 z-40 flex justify-center">
          <span key={toast.id} className="pop neon-text text-3xl font-black">
            {toast.text}
          </span>
        </div>
      )}

      {(phase === "won" || phase === "lost") && (
        <Result
          won={phase === "won"}
          adventure={isAdventure}
          score={score}
          reward={reward}
          stars={starsFor(score, cfg.target)}
          level={level}
          onRetry={() => startRun(mode, level)}
          onNext={() => startRun(mode, Math.min(LEVELS.length, level + 1))}
          onMenu={() => setPhase("menu")}
        />
      )}
    </div>
  );
}

function PlayerBar({ profile }: { profile: Profile }) {
  const x = xpLevel(profile.xp);
  return (
    <div className="glass w-full max-w-xs rounded-2xl p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold">
          سطح {x.level} · {rankFor(x.level)}
        </span>
        <span className="tabular-nums">🪙 {profile.coins}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--b4),var(--b5),var(--b7))]"
          style={{ width: `${x.pct}%` }}
        />
      </div>
      <div className="mt-1 text-left text-[10px] text-white/45 tabular-nums">
        {x.into}/{x.need} XP
      </div>
    </div>
  );
}

function Screen({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex flex-1 flex-col gap-4 overflow-y-auto p-5 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="glass grid h-10 w-10 place-items-center rounded-2xl">
          ‹
        </button>
        <h2 className="text-xl font-black">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );
}

function PieceView({ piece, cell }: { piece: Piece; cell: number }) {
  const step = cell + CELL_GAP;
  return (
    <div
      className="relative"
      style={{ width: piece.shape.w * step - CELL_GAP, height: piece.shape.h * step - CELL_GAP }}
    >
      {piece.shape.cells.map(([r, c]) => (
        <div
          key={`${r},${c}`}
          className="blk absolute rounded-[22%]"
          style={
            {
              width: cell,
              height: cell,
              left: c * step,
              top: r * step,
              "--bc": `var(--b${piece.color + 1})`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function Aurora() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="blob absolute -top-24 -left-20 h-72 w-72 rounded-full bg-[var(--b3)] opacity-30 blur-[80px]" />
      <div className="blob absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-[var(--b5)] opacity-25 blur-[90px]" />
      <div className="blob absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-[var(--b1)] opacity-25 blur-[90px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,255,255,.10),transparent_60%)]" />
    </div>
  );
}

function Result({
  won,
  adventure,
  score,
  stars,
  level,
  reward,
  onRetry,
  onNext,
  onMenu,
}: {
  won: boolean;
  adventure: boolean;
  score: number;
  stars: number;
  level: number;
  reward: { coins: number; xp: number } | null;
  onRetry: () => void;
  onNext: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-8 backdrop-blur-md">
      <div className="glass pop w-full max-w-xs rounded-3xl p-6 text-center">
        <h3 className="neon-text text-3xl font-black">{won ? "عالی بود!" : "تمام شد"}</h3>
        {adventure && <p className="mt-1 text-sm text-white/60">مرحله {level}</p>}
        {won && adventure && (
          <div className="mt-3 flex justify-center gap-1 text-3xl">
            {[1, 2, 3].map((i) => (
              <span key={i} className={i <= stars ? "pop" : "opacity-25"}>
                ⭐
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 text-4xl font-black tabular-nums">{score}</div>
        {reward && (
          <div className="mt-3 flex justify-center gap-2 text-sm">
            <span className="chip">🪙 +{reward.coins}</span>
            <span className="chip">✨ +{reward.xp} XP</span>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2">
          {won && adventure ? (
            <button onClick={onNext} className="btn-neon">
              مرحله بعد ›
            </button>
          ) : (
            <button onClick={onRetry} className="btn-neon">
              تلاش دوباره
            </button>
          )}
          <button onClick={onMenu} className="btn-ghost">
            منوی اصلی
          </button>
        </div>
      </div>
    </div>
  );
}
