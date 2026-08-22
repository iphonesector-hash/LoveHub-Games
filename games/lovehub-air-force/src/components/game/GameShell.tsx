import { useEffect, useRef, useState, useCallback } from "react";
import { Game, type HudState } from "@/game/core/Game";
import { saveSystem, type Settings, type UpgradeKey } from "@/game/systems/SaveSystem";
import { LEVELS } from "@/game/levels/levels";
import { UPGRADES, upgradeCost } from "@/game/systems/UpgradeSystem";
import { WEAPON_ORDER, WEAPONS } from "@/game/weapons/Weapons";
import { audio } from "@/game/audio/AudioManager";
import { t, isRTL, type Lang, type StringKey } from "@/game/i18n";
import { emit, registerGameApi } from "@/game/api";
import type { RunSummary } from "@/game/systems/ScoreSystem";
import { Hud } from "./Hud";
import { LoadingScreen, MainMenu, LevelSelect, Hangar, SettingsScreen, PauseOverlay, ResultOverlay } from "./Menus";

export type Screen = "loading" | "menu" | "levels" | "hangar" | "settings" | "game";

export function GameShell() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [screen, setScreen] = useState<Screen>("loading");
  const [hud, setHud] = useState<HudState | null>(null);
  const [summary, setSummary] = useState<(RunSummary & { victory: boolean }) | null>(null);
  const [settings, setSettings] = useState<Settings>(saveSystem.data.settings);
  const [energy, setEnergy] = useState(saveSystem.data.loveEnergy);
  const [upgrades, setUpgrades] = useState(saveSystem.data.upgrades);
  const [unlocked, setUnlocked] = useState(saveSystem.data.unlockedLevels);
  const [progress, setProgress] = useState(0);

  const lang = settings.lang;
  const T = useCallback((k: StringKey) => t(lang, k), [lang]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new Game(canvas);
    gameRef.current = game;
    game.onHud = (s) => {
      setHud(s);
      emit({ type: "hud", payload: s });
    };
    game.onRunEnd = (s) => {
      setSummary(s);
      setEnergy(saveSystem.data.loveEnergy);
      setUnlocked(saveSystem.data.unlockedLevels);
      emit({ type: "runEnd", payload: s });
    };
    const unregister = registerGameApi(game, () => game.dispose());
    // Boot sequence
    let p = 0;
    const iv = window.setInterval(() => {
      p = Math.min(100, p + 8 + Math.random() * 14);
      setProgress(p);
      if (p >= 100) {
        window.clearInterval(iv);
        window.setTimeout(() => setScreen("menu"), 320);
      }
    }, 90);
    return () => {
      window.clearInterval(iv);
      unregister();
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  const persistSettings = useCallback((patch: Partial<Settings>) => {
    const next = { ...saveSystem.data.settings, ...patch };
    saveSystem.data.settings = next;
    saveSystem.flush();
    setSettings(next);
    gameRef.current?.applySettings();
  }, []);

  const startLevel = useCallback((id: number) => {
    audio.unlock();
    setSummary(null);
    gameRef.current?.startLevel(id);
    setScreen("game");
  }, []);

  const buyUpgrade = useCallback((key: UpgradeKey) => {
    const def = UPGRADES.find((u) => u.key === key);
    if (!def) return;
    const cur = saveSystem.data.upgrades[key];
    if (cur >= def.max) return;
    const cost = upgradeCost(def, cur);
    if (saveSystem.data.loveEnergy < cost) return;
    saveSystem.data.loveEnergy -= cost;
    saveSystem.data.upgrades = { ...saveSystem.data.upgrades, [key]: cur + 1 };
    saveSystem.flush();
    setEnergy(saveSystem.data.loveEnergy);
    setUpgrades(saveSystem.data.upgrades);
    audio.unlock();
    audio.play("powerup");
  }, []);

  const resetProgress = useCallback(() => {
    saveSystem.reset();
    setEnergy(saveSystem.data.loveEnergy);
    setUpgrades(saveSystem.data.upgrades);
    setUnlocked(saveSystem.data.unlockedLevels);
    setSettings(saveSystem.data.settings);
    gameRef.current?.applySettings();
  }, []);

  const quit = useCallback(() => {
    gameRef.current?.quitToMenu();
    setSummary(null);
    setScreen("menu");
  }, []);

  // Keyboard: pause + weapon hotkeys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g) return;
      if (e.key === "Escape" || e.key.toLowerCase() === "p") {
        if (g.status === "playing") g.pause();
        else if (g.status === "paused") g.resume();
      }
      const n = Number(e.key);
      if (n >= 1 && n <= WEAPON_ORDER.length && g.status === "playing") {
        g.setWeapon(WEAPON_ORDER[n - 1] as never);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const status = hud?.status ?? "idle";
  const inGame = screen === "game";

  return (
    <div className="lh-root" dir={isRTL(lang) ? "rtl" : "ltr"}>
      <canvas ref={canvasRef} className="lh-canvas" aria-label="LoveHub Air Force game canvas" />

      {screen !== "loading" && !inGame && <div className="lh-scrim" aria-hidden />}

      {inGame && hud && (
        <Hud
          hud={hud}
          T={T}
          onPause={() => gameRef.current?.pause()}
          onWeapon={(w) => gameRef.current?.setWeapon(w)}
        />
      )}

      {screen === "loading" && <LoadingScreen T={T} progress={progress} />}
      {screen === "menu" && (
        <MainMenu
          T={T}
          highScore={saveSystem.data.highScore}
          loveEnergy={energy}
          onPlay={() => startLevel(Math.min(unlocked, LEVELS.length))}
          onLevels={() => setScreen("levels")}
          onHangar={() => setScreen("hangar")}
          onSettings={() => setScreen("settings")}
        />
      )}
      {screen === "levels" && (
        <LevelSelect T={T} unlocked={unlocked} onBack={() => setScreen("menu")} onStart={startLevel} />
      )}
      {screen === "hangar" && (
        <Hangar
          T={T}
          lang={lang}
          loveEnergy={energy}
          upgrades={upgrades}
          onBuy={buyUpgrade}
          onBack={() => setScreen("menu")}
        />
      )}
      {screen === "settings" && (
        <SettingsScreen
          T={T}
          settings={settings}
          onChange={persistSettings}
          onReset={resetProgress}
          onBack={() => setScreen("menu")}
        />
      )}

      {inGame && status === "paused" && (
        <PauseOverlay
          T={T}
          onResume={() => gameRef.current?.resume()}
          onRestart={() => startLevel(hud?.levelId ?? 1)}
          onQuit={quit}
        />
      )}
      {inGame && summary && (status === "gameover" || status === "victory") && (
        <ResultOverlay
          T={T}
          summary={summary}
          highScore={saveSystem.data.highScore}
          hasNext={summary.victory && summary.levelId < LEVELS.length}
          onRestart={() => startLevel(summary.levelId)}
          onNext={() => startLevel(summary.levelId + 1)}
          onQuit={quit}
        />
      )}

      {inGame && status === "playing" && hud && hud.wave <= 1 && (
        <div className="lh-hint">{T("hint")}</div>
      )}
      <span className="sr-only">{WEAPONS.cannon.name}</span>
    </div>
  );
}
