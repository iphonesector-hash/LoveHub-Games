/* Multi-phase boss entity. Attacks are composable patterns, not just more HP. */
import type { BossConfig } from "../levels/levels";
import { clamp, TAU } from "../utils";

export type BossCtx = {
  dt: number;
  w: number;
  h: number;
  playerX: number;
  playerY: number;
  fire: (x: number, y: number, angle: number, speed: number, dmg: number, color: string, r: number) => void;
  spawnMinion: (x: number, y: number) => void;
  warn: () => void;
};

export class Boss {
  cfg: BossConfig;
  x = 0;
  y = -160;
  r = 90;
  hp = 1;
  maxHp = 1;
  t = 0;
  hitT = 0;
  phase = 1;
  entering = true;
  dying = false;
  deathT = 0;
  dead = false;
  private attackT = 1.4;
  private attackIdx = 0;
  private sweepDir = 1;
  private homeY = 0;
  art: BossConfig["art"];

  constructor(cfg: BossConfig, w: number, h: number, difficulty: number) {
    this.cfg = cfg;
    this.art = cfg.art;
    this.maxHp = Math.round(cfg.hp * (0.85 + difficulty * 0.15));
    this.hp = this.maxHp;
    this.r = cfg.r;
    this.x = w / 2;
    this.homeY = Math.min(h * 0.24, 190);
  }

  get phaseIndex() {
    const frac = this.hp / this.maxHp;
    let idx = 0;
    this.cfg.phases.forEach((p, i) => {
      if (frac <= p.from) idx = i;
    });
    return idx;
  }

  damage(amount: number) {
    if (this.dying || this.entering) return 0;
    const before = this.hp;
    this.hp = Math.max(0, this.hp - amount);
    this.hitT = 0.14;
    const newPhase = this.phaseIndex + 1;
    if (newPhase !== this.phase) {
      this.phase = newPhase;
      this.attackT = 0.9;
    }
    if (this.hp <= 0 && !this.dying) {
      this.dying = true;
      this.deathT = 1.9;
    }
    return before - this.hp;
  }

  update(c: BossCtx) {
    const dt = c.dt;
    this.t += dt;
    if (this.hitT > 0) this.hitT -= dt;

    if (this.dying) {
      this.deathT -= dt;
      this.y += 12 * dt;
      if (this.deathT <= 0) this.dead = true;
      return;
    }

    if (this.entering) {
      this.y += (this.homeY - this.y) * Math.min(1, dt * 1.8);
      if (Math.abs(this.y - this.homeY) < 3) this.entering = false;
      return;
    }

    const ph = this.cfg.phases[this.phaseIndex] as BossConfig["phases"][number];
    // Drift horizontally, faster in later phases.
    this.x += this.sweepDir * 62 * ph.speed * dt;
    const margin = this.r * 0.7;
    if (this.x < margin) { this.x = margin; this.sweepDir = 1; }
    if (this.x > c.w - margin) { this.x = c.w - margin; this.sweepDir = -1; }
    this.y = this.homeY + Math.sin(this.t * 1.2) * 14;

    this.attackT -= dt;
    if (this.attackT <= 0) {
      const list = ph.attacks;
      const atk = list[this.attackIdx % list.length] as string;
      this.attackIdx++;
      this.attackT = ph.interval;
      this.runAttack(atk, c, ph.speed);
    }
  }

  private runAttack(atk: string, c: BossCtx, speedMul: number) {
    const dmg = 10 + this.phase * 3;
    const col = this.phase >= 3 ? "#ff6f8a" : this.phase === 2 ? "#ffb06a" : "#ff8ad4";
    const aim = Math.atan2(c.playerY - this.y, c.playerX - this.x);
    switch (atk) {
      case "fan": {
        const n = 7 + this.phase * 2;
        for (let i = 0; i < n; i++) {
          const a = Math.PI / 2 + (i / (n - 1) - 0.5) * 1.5;
          c.fire(this.x, this.y + 20, a, 250 * speedMul, dmg, col, 7);
        }
        break;
      }
      case "aimed":
        for (let i = -1; i <= 1; i++)
          c.fire(this.x, this.y + 20, aim + i * 0.13, 380 * speedMul, dmg, col, 6);
        break;
      case "sweep": {
        const n = 14;
        for (let i = 0; i < n; i++) {
          const a = Math.PI * 0.15 + (i / n) * Math.PI * 0.7;
          c.fire(this.x, this.y + 10, a, 210 * speedMul + i * 6, dmg, col, 6);
        }
        break;
      }
      case "ring": {
        const n = 20 + this.phase * 4;
        for (let i = 0; i < n; i++)
          c.fire(this.x, this.y, (i / n) * TAU + this.t, 210 * speedMul, dmg, col, 6);
        break;
      }
      case "spiral": {
        const n = 6;
        for (let i = 0; i < n; i++)
          c.fire(this.x, this.y, this.t * 3 + (i / n) * TAU, 260 * speedMul, dmg, col, 6);
        break;
      }
      case "laserRain": {
        const cols = 8;
        for (let i = 0; i < cols; i++) {
          const x = (c.w * (i + 0.5)) / cols;
          c.fire(x, -10, Math.PI / 2, 330 * speedMul, dmg, "#8ae1ff", 5);
        }
        break;
      }
      case "minions":
        c.warn();
        for (let i = -1; i <= 1; i += 2) c.spawnMinion(this.x + i * this.r * 0.8, this.y);
        break;
      default:
        break;
    }
  }

  get healthFrac() {
    return clamp(this.hp / this.maxHp, 0, 1);
  }
}
