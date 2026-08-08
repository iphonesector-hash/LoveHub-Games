export const SIZE = 8;

export type Cell = number | null; // color index or null
export type Board = Cell[][];

export type Shape = {
  id: string;
  cells: [number, number][]; // [row, col] normalized
  w: number;
  h: number;
};

export type Piece = {
  uid: string;
  shape: Shape;
  color: number;
};

export const COLORS = 7;

const raw: Record<string, [number, number][]> = {
  dot: [[0, 0]],
  i2: [[0, 0], [0, 1]],
  i2v: [[0, 0], [1, 0]],
  i3: [[0, 0], [0, 1], [0, 2]],
  i3v: [[0, 0], [1, 0], [2, 0]],
  i4: [[0, 0], [0, 1], [0, 2], [0, 3]],
  i4v: [[0, 0], [1, 0], [2, 0], [3, 0]],
  i5: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  i5v: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  o2: [[0, 0], [0, 1], [1, 0], [1, 1]],
  o3: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
  l1: [[0, 0], [1, 0], [1, 1]],
  l2: [[0, 0], [0, 1], [1, 0]],
  l3: [[0, 0], [0, 1], [1, 1]],
  l4: [[0, 1], [1, 0], [1, 1]],
  j1: [[0, 0], [1, 0], [2, 0], [2, 1]],
  j2: [[0, 0], [0, 1], [0, 2], [1, 0]],
  j3: [[0, 0], [0, 1], [1, 1], [2, 1]],
  j4: [[0, 2], [1, 0], [1, 1], [1, 2]],
  t1: [[0, 0], [0, 1], [0, 2], [1, 1]],
  t2: [[0, 1], [1, 0], [1, 1], [2, 1]],
  s1: [[0, 1], [0, 2], [1, 0], [1, 1]],
  s2: [[0, 0], [1, 0], [1, 1], [2, 1]],
  r23: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]],
  r32: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]],
};

export const SHAPES: Shape[] = Object.entries(raw).map(([id, cells]) => ({
  id,
  cells,
  w: Math.max(...cells.map((c) => c[1])) + 1,
  h: Math.max(...cells.map((c) => c[0])) + 1,
}));

const EASY = SHAPES.filter((s) => s.cells.length <= 4);
const HARD = SHAPES.filter((s) => s.cells.length >= 5);

export function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array<Cell>(SIZE).fill(null));
}

export function cloneBoard(b: Board): Board {
  return b.map((r) => r.slice());
}

let seq = 0;
export function randomPiece(difficulty: number, hardBias = 0): Piece {
  const chance = Math.min(0.15 + difficulty * 0.05 + hardBias, 0.7);
  const pool = Math.random() < chance ? HARD : EASY;
  const shape = pool[Math.floor(Math.random() * pool.length)]!;
  return {
    uid: `p${seq++}`,
    shape,
    color: Math.floor(Math.random() * COLORS),
  };
}


export function canPlace(board: Board, shape: Shape, r: number, c: number): boolean {
  for (const [dr, dc] of shape.cells) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE) return false;
    if (board[rr]![cc] !== null) return false;
  }
  return true;
}

export function hasAnyPlacement(board: Board, shape: Shape): boolean {
  for (let r = 0; r <= SIZE - shape.h; r++)
    for (let c = 0; c <= SIZE - shape.w; c++)
      if (canPlace(board, shape, r, c)) return true;
  return false;
}

export function place(board: Board, piece: Piece, r: number, c: number): Board {
  const b = cloneBoard(board);
  for (const [dr, dc] of piece.shape.cells) b[r + dr]![c + dc] = piece.color;
  return b;
}

export type ClearResult = {
  board: Board;
  rows: number[];
  cols: number[];
  cleared: [number, number][];
};

export function resolveClears(board: Board): ClearResult {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let r = 0; r < SIZE; r++) if (board[r]!.every((c) => c !== null)) rows.push(r);
  for (let c = 0; c < SIZE; c++) {
    let full = true;
    for (let r = 0; r < SIZE; r++) if (board[r]![c] === null) full = false;
    if (full) cols.push(c);
  }
  const b = cloneBoard(board);
  const cleared: [number, number][] = [];
  const seen = new Set<string>();
  for (const r of rows)
    for (let c = 0; c < SIZE; c++) {
      b[r]![c] = null;
      if (!seen.has(`${r},${c}`)) { seen.add(`${r},${c}`); cleared.push([r, c]); }
    }
  for (const c of cols)
    for (let r = 0; r < SIZE; r++) {
      b[r]![c] = null;
      if (!seen.has(`${r},${c}`)) { seen.add(`${r},${c}`); cleared.push([r, c]); }
    }
  return { board: b, rows, cols, cleared };
}

export function scoreFor(placedCells: number, linesCleared: number, combo: number) {
  const base = placedCells;
  const lines = linesCleared > 0 ? 10 * linesCleared * linesCleared : 0;
  const comboBonus = combo > 1 && linesCleared > 0 ? (combo - 1) * 15 : 0;
  return base + lines + comboBonus;
}

// ---- Levels -------------------------------------------------------------

export type Level = {
  n: number;
  target: number;
  moves: number;
  name: string;
};

const NAMES = [
  "آغاز", "جرقه", "نئون", "پالس", "کریستال", "پریزم", "کوانتوم", "اوربیت",
  "نووا", "زحل", "فوتون", "پلاسما", "ورتکس", "اکلیپس", "کهکشان", "سوپرنووا",
  "هولوگرام", "سیناپس", "تایتان", "زنیت", "اینفینیتی", "اوریون", "پالسار",
  "نبولا", "کرونوس", "هایپریون", "سینگولاریتی", "آندرومدا", "الیزیوم", "آپکس",
];

export const LEVELS: Level[] = Array.from({ length: 30 }, (_, i) => {
  const n = i + 1;
  return {
    n,
    target: Math.round(220 + n * 130 + Math.pow(n, 1.75) * 9),
    moves: Math.max(16, 34 - Math.floor(n / 3)),
    name: NAMES[i] ?? `مرحله ${n}`,
  };
});

export function starsFor(score: number, target: number) {
  if (score >= target * 1.6) return 3;
  if (score >= target * 1.25) return 2;
  if (score >= target) return 1;
  return 0;
}

// ---- Difficulty ---------------------------------------------------------

export type DifficultyId = "easy" | "normal" | "hard";

export type Difficulty = {
  id: DifficultyId;
  name: string;
  icon: string;
  desc: string;
  targetMul: number;
  movesMul: number;
  hardBias: number;
  coinMul: number;
  xpMul: number;
  timeSec: number;
  obstacles: number;
};

export const DIFFICULTIES: Difficulty[] = [
  {
    id: "easy",
    name: "آسان",
    icon: "🌱",
    desc: "قطعه‌های ساده، حرکت بیشتر",
    targetMul: 0.75,
    movesMul: 1.35,
    hardBias: -0.08,
    coinMul: 0.7,
    xpMul: 0.7,
    timeSec: 150,
    obstacles: 0,
  },
  {
    id: "normal",
    name: "متوسط",
    icon: "⚡",
    desc: "تعادل کلاسیک بازی",
    targetMul: 1,
    movesMul: 1,
    hardBias: 0,
    coinMul: 1,
    xpMul: 1,
    timeSec: 120,
    obstacles: 3,
  },
  {
    id: "hard",
    name: "سخت",
    icon: "🔥",
    desc: "قطعه‌های بزرگ، جایزه دوبرابر",
    targetMul: 1.3,
    movesMul: 0.8,
    hardBias: 0.18,
    coinMul: 1.8,
    xpMul: 1.8,
    timeSec: 90,
    obstacles: 8,
  },
];

export function getDifficulty(id: DifficultyId) {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1]!;
}

export function applyDifficulty(level: Level, d: Difficulty): Level {
  return {
    ...level,
    target: Math.round(level.target * d.targetMul),
    moves: Math.max(10, Math.round(level.moves * d.movesMul)),
  };
}

// ---- Game modes ---------------------------------------------------------

export type ModeId = "adventure" | "classic" | "time" | "survival";

export type Mode = {
  id: ModeId;
  name: string;
  icon: string;
  desc: string;
};

export const MODES: Mode[] = [
  { id: "adventure", name: "ماجراجویی", icon: "🗺️", desc: "۳۰ مرحله در ۵ فصل با هدف و ستاره" },
  { id: "classic", name: "کلاسیک", icon: "♾️", desc: "بی‌پایان؛ تا وقتی جا داری بازی کن" },
  { id: "time", name: "چالش زمان", icon: "⏱️", desc: "بیشترین امتیاز در زمان محدود" },
  { id: "survival", name: "بقا", icon: "💀", desc: "زمین پر از مانع، بدون اشتباه" },
];

// ---- Chapters -----------------------------------------------------------

export type Chapter = {
  id: number;
  name: string;
  icon: string;
  from: number;
  to: number;
};

export const CHAPTERS: Chapter[] = [
  { id: 1, name: "جرقه‌های نئون", icon: "✨", from: 1, to: 6 },
  { id: 2, name: "کریستال", icon: "💠", from: 7, to: 12 },
  { id: 3, name: "کوانتوم", icon: "🌀", from: 13, to: 18 },
  { id: 4, name: "کهکشان", icon: "🌌", from: 19, to: 24 },
  { id: 5, name: "سینگولاریتی", icon: "🕳️", from: 25, to: 30 },
];

// ---- Boards with obstacles ---------------------------------------------

export function boardWithObstacles(count: number): Board {
  const b = emptyBoard();
  let placed = 0;
  let guard = 0;
  while (placed < count && guard++ < 500) {
    const r = Math.floor(Math.random() * SIZE);
    const c = Math.floor(Math.random() * SIZE);
    if (b[r]![c] !== null) continue;
    b[r]![c] = Math.floor(Math.random() * COLORS);
    placed++;
  }
  return b;
}
