// LoveHub player profile (local for now — ready to sync with the platform later)

export type PowerupId = "hammer" | "bomb" | "swap" | "undo";

export type Stats = {
  gamesPlayed: number;
  linesCleared: number;
  bestCombo: number;
  totalScore: number;
  levelsCleared: number;
  powerupsUsed: number;
  bestClassic: number;
  bestTime: number;
  bestSurvival: number;
};

export type Profile = {
  xp: number;
  coins: number;
  achievements: string[];
  stats: Stats;
};

export const PROFILE_KEY = "lovehub.blockblast.profile.v1";

export const emptyStats = (): Stats => ({
  gamesPlayed: 0,
  linesCleared: 0,
  bestCombo: 0,
  totalScore: 0,
  levelsCleared: 0,
  powerupsUsed: 0,
  bestClassic: 0,
  bestTime: 0,
  bestSurvival: 0,
});

export const emptyProfile = (): Profile => ({
  xp: 0,
  coins: 150,
  achievements: [],
  stats: emptyStats(),
});

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return emptyProfile();
    const p = JSON.parse(raw) as Partial<Profile>;
    return {
      ...emptyProfile(),
      ...p,
      stats: { ...emptyStats(), ...(p.stats ?? {}) },
      achievements: p.achievements ?? [],
    };
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

// ---- XP ---------------------------------------------------------------

export function xpForLevel(n: number) {
  return Math.round(120 * Math.pow(n, 1.35));
}

export function xpLevel(xp: number) {
  let lvl = 1;
  let acc = 0;
  while (acc + xpForLevel(lvl) <= xp && lvl < 99) {
    acc += xpForLevel(lvl);
    lvl++;
  }
  const need = xpForLevel(lvl);
  return { level: lvl, into: xp - acc, need, pct: Math.min(100, ((xp - acc) / need) * 100) };
}

export const RANKS = [
  "تازه‌کار", "کاوشگر", "مهندس", "استاد بلوک", "افسانه", "اسطوره SECTOR",
];

export function rankFor(level: number) {
  return RANKS[Math.min(RANKS.length - 1, Math.floor((level - 1) / 5))]!;
}

// ---- Power-ups --------------------------------------------------------

export const POWERUPS: {
  id: PowerupId;
  name: string;
  icon: string;
  cost: number;
  desc: string;
}[] = [
  { id: "hammer", name: "چکش", icon: "🔨", cost: 25, desc: "یک بلوک را حذف کن" },
  { id: "bomb", name: "بمب", icon: "💣", cost: 60, desc: "ناحیه ۳×۳ را منفجر کن" },
  { id: "swap", name: "تعویض", icon: "🔄", cost: 20, desc: "قطعه‌های جدید بگیر" },
  { id: "undo", name: "برگرد", icon: "↩️", cost: 15, desc: "حرکت آخر را برگردان" },
];

// ---- Achievements -----------------------------------------------------

export type Achievement = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  reward: number;
  done: (s: Stats) => boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first", name: "اولین قدم", desc: "یک بازی انجام بده", icon: "🎯", reward: 20, done: (s) => s.gamesPlayed >= 1 },
  { id: "lines50", name: "خط‌شکن", desc: "۵۰ خط پاک کن", icon: "📏", reward: 40, done: (s) => s.linesCleared >= 50 },
  { id: "lines250", name: "ماشین پاک‌سازی", desc: "۲۵۰ خط پاک کن", icon: "🧹", reward: 120, done: (s) => s.linesCleared >= 250 },
  { id: "combo5", name: "کمبوباز", desc: "کمبو ۵ بگیر", icon: "🔥", reward: 60, done: (s) => s.bestCombo >= 5 },
  { id: "combo10", name: "طوفان", desc: "کمبو ۱۰ بگیر", icon: "🌪️", reward: 150, done: (s) => s.bestCombo >= 10 },
  { id: "score2k", name: "دو هزاری", desc: "۲۰۰۰ امتیاز در یک بازی", icon: "💎", reward: 80, done: (s) => Math.max(s.bestClassic, s.bestTime, s.bestSurvival) >= 2000 },
  { id: "lvl5", name: "ماجراجو", desc: "۵ مرحله را تمام کن", icon: "🗺️", reward: 50, done: (s) => s.levelsCleared >= 5 },
  { id: "lvl15", name: "فاتح فصل‌ها", desc: "۱۵ مرحله را تمام کن", icon: "🏰", reward: 150, done: (s) => s.levelsCleared >= 15 },
  { id: "lvl30", name: "پایان راه", desc: "۳۰ مرحله را تمام کن", icon: "👑", reward: 400, done: (s) => s.levelsCleared >= 30 },
  { id: "power10", name: "تکنسین", desc: "۱۰ بار از پاور-آپ استفاده کن", icon: "⚙️", reward: 50, done: (s) => s.powerupsUsed >= 10 },
  { id: "games25", name: "معتاد بازی", desc: "۲۵ بازی انجام بده", icon: "🎮", reward: 100, done: (s) => s.gamesPlayed >= 25 },
  { id: "total50k", name: "میلیونر امتیاز", desc: "مجموع ۵۰٬۰۰۰ امتیاز", icon: "🏆", reward: 300, done: (s) => s.totalScore >= 50000 },
];

export function newlyUnlocked(p: Profile): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !p.achievements.includes(a.id) && a.done(p.stats));
}
