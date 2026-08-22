/* Enemy archetypes: stats + movement/attack behaviour. */
import type { Enemy } from "../types";

export type EnemyBehaviorCtx = {
  dt: number;
  w: number;
  h: number;
  playerX: number;
  playerY: number;
  fireAt: (e: Enemy, angle: number, speed: number, dmg: number, color?: string, r?: number) => void;
};

export type EnemyDef = {
  id: string;
  art: string;
  color: string;
  r: number;
  hp: number;
  dmg: number;
  score: number;
  energy: number;
  fireEvery: number;
  update: (e: Enemy, c: EnemyBehaviorCtx) => void;
};

const aimAt = (e: Enemy, px: number, py: number) => Math.atan2(py - e.y, px - e.x);

export const ENEMY_TYPES: Record<string, EnemyDef> = {
  scout: {
    id: "scout", art: "scout", color: "#3fa9c9", r: 15, hp: 22, dmg: 8, score: 60, energy: 2, fireEvery: 2.4,
    update: (e, c) => {
      e.x = e.px + Math.sin(e.t * e.freq + e.phase) * e.amp;
      e.y += e.vy * c.dt;
      e.angle = Math.cos(e.t * e.freq + e.phase) * 0.25;
      e.fireT -= c.dt;
      if (e.fireT <= 0 && e.y > 0) { e.fireT = e.fireEvery; c.fireAt(e, Math.PI / 2, 260, e.dmg, "#8ae1ff"); }
    },
  },
  fighter: {
    id: "fighter", art: "fighter", color: "#4f6ad8", r: 18, hp: 40, dmg: 10, score: 110, energy: 3, fireEvery: 1.8,
    update: (e, c) => {
      // Dive in, hover, strafe toward the player.
      if (e.y < e.py) { e.y += e.vy * c.dt; }
      else {
        e.x += Math.sign(c.playerX - e.x) * 70 * c.dt;
        e.y += Math.sin(e.t * 2) * 20 * c.dt;
      }
      e.fireT -= c.dt;
      if (e.fireT <= 0 && e.y > 0) {
        e.fireT = e.fireEvery;
        c.fireAt(e, aimAt(e, c.playerX, c.playerY), 300, e.dmg, "#9db4ff");
      }
    },
  },
  heavy: {
    id: "heavy", art: "heavy", color: "#7b4bb5", r: 26, hp: 130, dmg: 14, score: 260, energy: 8, fireEvery: 2.1,
    update: (e, c) => {
      if (e.y < e.py) e.y += e.vy * c.dt;
      else e.x += Math.sin(e.t * 0.9 + e.phase) * 90 * c.dt;
      e.fireT -= c.dt;
      if (e.fireT <= 0 && e.y > 0) {
        e.fireT = e.fireEvery;
        const a = aimAt(e, c.playerX, c.playerY);
        for (let i = -1; i <= 1; i++) c.fireAt(e, a + i * 0.22, 280, e.dmg, "#c79bff", 6);
      }
    },
  },
  bomber: {
    id: "bomber", art: "bomber", color: "#b5623a", r: 24, hp: 95, dmg: 16, score: 220, energy: 7, fireEvery: 2.6,
    update: (e, c) => {
      e.y += e.vy * c.dt;
      e.x = e.px + Math.sin(e.t * 1.3 + e.phase) * e.amp;
      e.fireT -= c.dt;
      if (e.fireT <= 0 && e.y > 0) {
        e.fireT = e.fireEvery;
        for (let i = 0; i < 6; i++) c.fireAt(e, (i / 6) * Math.PI * 2 + e.t, 200, e.dmg, "#ffb27a", 6);
      }
    },
  },
  drone: {
    id: "drone", art: "drone", color: "#2fa98a", r: 17, hp: 60, dmg: 6, score: 140, energy: 4, fireEvery: 3.4,
    update: (e, c) => {
      // Orbits its anchor; buffs nearby allies via shielded flag.
      e.px += Math.sin(e.t * 0.7) * 40 * c.dt;
      e.x = e.px + Math.cos(e.t * 1.6 + e.phase) * 46;
      e.y = Math.min(e.py, e.y + e.vy * c.dt) + Math.sin(e.t * 1.6 + e.phase) * 0.6;
      e.fireT -= c.dt;
      if (e.fireT <= 0 && e.y > 0) { e.fireT = e.fireEvery; c.fireAt(e, aimAt(e, c.playerX, c.playerY), 230, e.dmg, "#7dffd8"); }
    },
  },
  turret: {
    id: "turret", art: "turret", color: "#8a8f9e", r: 20, hp: 110, dmg: 11, score: 180, energy: 5, fireEvery: 1.35,
    update: (e, c) => {
      e.y = Math.min(e.py, e.y + e.vy * c.dt);
      e.angle = aimAt(e, c.playerX, c.playerY) - Math.PI / 2;
      e.fireT -= c.dt;
      if (e.fireT <= 0 && e.y > 0) {
        e.fireT = e.fireEvery;
        c.fireAt(e, aimAt(e, c.playerX, c.playerY), 340, e.dmg, "#ff9c9c");
      }
    },
  },
  kamikaze: {
    id: "kamikaze", art: "kamikaze", color: "#d24b4b", r: 16, hp: 26, dmg: 22, score: 150, energy: 3, fireEvery: 99,
    update: (e, c) => {
      const a = aimAt(e, c.playerX, c.playerY);
      const sp = 210 + e.t * 60;
      e.vx += Math.cos(a) * 520 * c.dt;
      e.vy += Math.sin(a) * 520 * c.dt;
      const m = Math.hypot(e.vx, e.vy) || 1;
      e.vx = (e.vx / m) * Math.min(m, sp);
      e.vy = (e.vy / m) * Math.min(m, sp);
      e.x += e.vx * c.dt;
      e.y += e.vy * c.dt;
      e.angle = Math.atan2(e.vy, e.vx) - Math.PI / 2;
    },
  },
  elite: {
    id: "elite", art: "elite", color: "#a54bd2", r: 28, hp: 240, dmg: 15, score: 480, energy: 16, fireEvery: 1.5,
    update: (e, c) => {
      if (e.y < e.py) e.y += e.vy * c.dt;
      else {
        e.x += Math.cos(e.t * 1.1 + e.phase) * 150 * c.dt;
        e.y += Math.sin(e.t * 1.7) * 40 * c.dt;
      }
      e.fireT -= c.dt;
      if (e.fireT <= 0 && e.y > 0) {
        e.fireT = e.fireEvery;
        const a = aimAt(e, c.playerX, c.playerY);
        c.fireAt(e, a, 380, e.dmg, "#e6a2ff", 7);
        for (let i = 0; i < 5; i++) c.fireAt(e, (i / 5) * Math.PI * 2 + e.t * 2, 190, e.dmg * 0.6, "#c08bff", 5);
      }
    },
  },
};

export const ENEMY_IDS = Object.keys(ENEMY_TYPES);
