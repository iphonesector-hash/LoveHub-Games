/* Player aircraft: movement feel, resources, damage state. */
import { clamp, lerp } from "../utils";
import type { DerivedStats } from "../systems/UpgradeSystem";
import type { WeaponId } from "../weapons/Weapons";

export class PlayerAircraft {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  r = 14;
  roll = 0;
  thrust = 0;
  health = 100;
  maxHealth = 100;
  shield = 0;
  maxShield = 50;
  energy = 100;
  maxEnergy = 100;
  weapon: WeaponId = "cannon";
  weaponLevel = 1;
  invuln = 0;
  alive = true;
  dying = false;
  deathT = 0;
  rapidT = 0;
  multiplierT = 0;
  missileBoostT = 0;
  hitFlash = 0;
  /** Couple Mode hook: slot index (0 = solo pilot, 1 = partner). */
  readonly slot: number;

  constructor(stats: DerivedStats, slot = 0) {
    this.slot = slot;
    this.applyStats(stats);
  }

  applyStats(s: DerivedStats) {
    this.maxHealth = s.maxHealth;
    this.maxShield = s.maxShield;
    this.maxEnergy = s.maxEnergy;
    this.health = s.maxHealth;
    this.shield = Math.round(s.maxShield * 0.4);
    this.energy = s.maxEnergy;
  }

  reset(stats: DerivedStats, w: number, h: number) {
    this.applyStats(stats);
    this.x = w / 2;
    this.y = h * 0.78;
    this.vx = 0; this.vy = 0; this.roll = 0; this.thrust = 0;
    this.weapon = "cannon"; this.weaponLevel = 1;
    this.invuln = 1.2; this.alive = true; this.dying = false; this.deathT = 0;
    this.rapidT = 0; this.multiplierT = 0; this.missileBoostT = 0; this.hitFlash = 0;
  }

  update(
    dt: number,
    target: { x: number; y: number; active: boolean },
    axis: { x: number; y: number },
    w: number,
    h: number,
  ) {
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.rapidT > 0) this.rapidT -= dt;
    if (this.multiplierT > 0) this.multiplierT -= dt;
    if (this.missileBoostT > 0) this.missileBoostT -= dt;
    this.energy = clamp(this.energy + 7 * dt, 0, this.maxEnergy);

    if (this.dying) {
      this.deathT -= dt;
      this.y += 90 * dt;
      this.roll += dt * 2;
      if (this.deathT <= 0) this.alive = false;
      return;
    }

    const accel = 26;
    let ax = 0;
    let ay = 0;
    if (target.active) {
      ax = (target.x - this.x) * accel;
      ay = (target.y - this.y) * accel;
    }
    if (axis.x || axis.y) {
      ax += axis.x * 5200;
      ay += axis.y * 5200;
    }
    this.vx = lerp(this.vx, 0, Math.min(1, dt * 9)) + ax * dt;
    this.vy = lerp(this.vy, 0, Math.min(1, dt * 9)) + ay * dt;
    const maxSpeed = 1250;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > maxSpeed) { this.vx = (this.vx / sp) * maxSpeed; this.vy = (this.vy / sp) * maxSpeed; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const padX = 22;
    this.x = clamp(this.x, padX, w - padX);
    this.y = clamp(this.y, h * 0.12, h - 34);

    this.roll = lerp(this.roll, clamp(this.vx / 520, -1, 1), Math.min(1, dt * 10));
    this.thrust = lerp(this.thrust, clamp(-this.vy / 400, 0, 1), Math.min(1, dt * 6));
  }

  /** Returns true when the hit actually landed on the hull. */
  damage(amount: number): "blocked" | "shield" | "hull" | "none" {
    if (this.invuln > 0 || this.dying) return "none";
    this.hitFlash = 0.25;
    if (this.shield > 0) {
      this.shield = Math.max(0, this.shield - amount);
      this.invuln = 0.4;
      return "shield";
    }
    this.health -= amount;
    this.invuln = 0.9;
    if (this.health <= 0) {
      this.health = 0;
      this.dying = true;
      this.deathT = 1.4;
    }
    return "hull";
  }

  heal(v: number) { this.health = clamp(this.health + v, 0, this.maxHealth); }
  addShield(v: number) { this.shield = clamp(this.shield + v, 0, this.maxShield); }
  addEnergy(v: number) { this.energy = clamp(this.energy + v, 0, this.maxEnergy); }
}
