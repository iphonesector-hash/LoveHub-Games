/* Weapon registry. Add a new entry here and it works everywhere. */
import type { Bullet } from "../types";

export type WeaponId = "cannon" | "spread" | "laser" | "missile" | "burst";

export type FireCtx = {
  x: number; y: number;
  level: number;
  dmgMul: number;
  spawn: (b: Partial<Bullet>) => void;
  muzzle: (x: number, y: number, color: string) => void;
  sfx: (n: "shoot" | "laser" | "missile" | "burst") => void;
};

export type WeaponDef = {
  id: WeaponId;
  name: string;
  color: string;
  /** Seconds between shots at weapon level 1. */
  cooldown: number;
  energyCost: number;
  fire: (c: FireCtx) => void;
};

const base = (o: Partial<Bullet>): Partial<Bullet> => ({
  r: 4, dmg: 10, color: "#9ef7ff", kind: "cannon", life: 2.2,
  homing: 0, pierce: 0, trail: 1, wave: 0, vx: 0, vy: -880, ...o,
});

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  cannon: {
    id: "cannon", name: "Pulse Cannon", color: "#9ef7ff", cooldown: 0.13, energyCost: 0,
    fire: (c) => {
      const pairs = 1 + Math.floor((c.level - 1) / 2);
      const twin = c.level >= 2;
      for (let i = 0; i < pairs; i++) {
        const off = twin ? 8 + i * 7 : 0;
        const xs = twin ? [c.x - off, c.x + off] : [c.x];
        for (const sx of xs) {
          c.spawn(base({ x: sx, y: c.y - 16, dmg: 11 * c.dmgMul, vy: -900 - i * 40 }));
          c.muzzle(sx, c.y - 18, "#9ef7ff");
        }
      }
      c.sfx("shoot");
    },
  },
  spread: {
    id: "spread", name: "Bloom Spread", color: "#ffd27a", cooldown: 0.2, energyCost: 0,
    fire: (c) => {
      const n = 3 + Math.min(4, c.level);
      const arc = 0.5 + c.level * 0.06;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * arc;
        c.spawn(base({
          x: c.x, y: c.y - 12, kind: "spread", color: "#ffd27a", r: 4.5,
          dmg: 8 * c.dmgMul, vx: Math.cos(a) * 720, vy: Math.sin(a) * 720,
        }));
      }
      c.muzzle(c.x, c.y - 16, "#ffd27a");
      c.sfx("shoot");
    },
  },
  laser: {
    id: "laser", name: "Aurora Lance", color: "#ff8ad4", cooldown: 0.09, energyCost: 1.6,
    fire: (c) => {
      c.spawn(base({
        x: c.x, y: c.y - 22, kind: "laser", color: "#ff8ad4", r: 5.5,
        dmg: 7 * c.dmgMul, vy: -1500, pierce: 1 + Math.floor(c.level / 2), trail: 3,
      }));
      c.muzzle(c.x, c.y - 22, "#ff8ad4");
      c.sfx("laser");
    },
  },
  missile: {
    id: "missile", name: "Heartseeker", color: "#ffb45c", cooldown: 0.55, energyCost: 3,
    fire: (c) => {
      const n = 1 + Math.min(2, Math.floor(c.level / 2));
      for (let i = 0; i < n; i++) {
        const side = i === 0 ? 0 : i === 1 ? -1 : 1;
        c.spawn(base({
          x: c.x + side * 16, y: c.y, kind: "missile", color: "#ffb45c", r: 6,
          dmg: 34 * c.dmgMul, vx: side * 160, vy: -420, homing: 5.5, life: 3, trail: 2,
        }));
      }
      c.sfx("missile");
    },
  },
  burst: {
    id: "burst", name: "Love Burst", color: "#c58bff", cooldown: 0.85, energyCost: 12,
    fire: (c) => {
      const n = 12 + c.level * 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        c.spawn(base({
          x: c.x, y: c.y, kind: "burst", color: "#c58bff", r: 5,
          dmg: 16 * c.dmgMul, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520,
          pierce: 2, life: 1.1,
        }));
      }
      c.muzzle(c.x, c.y, "#c58bff");
      c.sfx("burst");
    },
  },
};

export const WEAPON_ORDER: WeaponId[] = ["cannon", "spread", "laser", "missile", "burst"];
