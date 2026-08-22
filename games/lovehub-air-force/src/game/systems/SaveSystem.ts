/* Persistence abstraction. localStorage today, swappable for LoveHub/Cloud later. */

export type Settings = {
  music: number;
  sfx: number;
  shake: boolean;
  reducedEffects: boolean;
  lang: "en" | "fa";
  sensitivity: number;
};

export type UpgradeKey =
  | "damage"
  | "fireRate"
  | "shield"
  | "health"
  | "missile"
  | "laser"
  | "energy";

export type SaveData = {
  version: number;
  highScore: number;
  bestPerLevel: Record<string, number>;
  unlockedLevels: number;
  loveEnergy: number;
  upgrades: Record<UpgradeKey, number>;
  settings: Settings;
};

const KEY = "lovehub-airforce-save-v1";

export const DEFAULT_SAVE: SaveData = {
  version: 1,
  highScore: 0,
  bestPerLevel: {},
  unlockedLevels: 1,
  loveEnergy: 0,
  upgrades: { damage: 0, fireRate: 0, shield: 0, health: 0, missile: 0, laser: 0, energy: 0 },
  settings: { music: 0.5, sfx: 0.7, shake: true, reducedEffects: false, lang: "en", sensitivity: 1 },
};

export interface SaveDriver {
  load(): SaveData;
  save(d: SaveData): void;
}

class LocalDriver implements SaveDriver {
  load(): SaveData {
    if (typeof window === "undefined") return structuredClone(DEFAULT_SAVE);
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULT_SAVE);
      const parsed = JSON.parse(raw);
      return {
        ...structuredClone(DEFAULT_SAVE),
        ...parsed,
        upgrades: { ...DEFAULT_SAVE.upgrades, ...(parsed.upgrades ?? {}) },
        settings: { ...DEFAULT_SAVE.settings, ...(parsed.settings ?? {}) },
      };
    } catch {
      return structuredClone(DEFAULT_SAVE);
    }
  }
  save(d: SaveData) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(d));
    } catch {
      /* quota / private mode: ignore */
    }
  }
}

export class SaveSystem {
  private driver: SaveDriver;
  data: SaveData;
  constructor(driver: SaveDriver = new LocalDriver()) {
    this.driver = driver;
    this.data = this.driver.load();
  }
  setDriver(driver: SaveDriver) {
    this.driver = driver;
    this.data = driver.load();
  }
  flush() {
    this.driver.save(this.data);
  }
  patch(p: Partial<SaveData>) {
    this.data = { ...this.data, ...p };
    this.flush();
  }
  reset() {
    this.data = structuredClone(DEFAULT_SAVE);
    this.flush();
  }
}

export const saveSystem = new SaveSystem();
