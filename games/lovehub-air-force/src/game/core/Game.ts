/* Core game orchestration: loop, systems wiring, collisions, level flow. */
import { Background } from "../effects/Background";
import { ParticleSystem } from "../effects/Particles";
import { drawBoss, drawEnemy, drawPlayerShip } from "../render/art";
import { EnemyManager } from "../enemies/EnemyManager";
import { Boss } from "../enemies/Boss";
import { ENEMY_TYPES } from "../enemies/EnemyTypes";
import { InputSystem } from "../input/InputSystem";
import { getLevel, type LevelConfig } from "../levels/levels";
import { PlayerAircraft } from "../player/PlayerAircraft";
import { PowerUpSystem, rollDrop, POWERUP_STYLE } from "../systems/PowerUpSystem";
import { ScoreSystem, type RunSummary } from "../systems/ScoreSystem";
import { deriveStats } from "../systems/UpgradeSystem";
import { saveSystem } from "../systems/SaveSystem";
import { audio } from "../audio/AudioManager";
import { WEAPONS, type WeaponId } from "../weapons/Weapons";
import type { Bullet, Enemy, PowerUp, PowerUpKind } from "../types";
import { Pool, circleHit, clamp, rand, TAU } from "../utils";

export type GameStatus = "idle" | "playing" | "paused" | "gameover" | "victory";

export type HudState = {
  status: GameStatus;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  weapon: WeaponId;
  weaponName: string;
  weaponLevel: number;
  score: number;
  combo: number;
  streak: number;
  loveEnergy: number;
  levelId: number;
  levelName: string;
  wave: number;
  waveTotal: number;
  boss: { name: string; frac: number; phase: number } | null;
  fps: number;
  banner: string | null;
  rapid: boolean;
  multiplier: boolean;
};

const newBullet = (): Bullet => ({
  x: 0, y: 0, vx: 0, vy: 0, r: 4, dmg: 1, color: "#fff", kind: "cannon",
  life: 1, homing: 0, pierce: 0, hitIds: [], trail: 1, wave: 0, t: 0, baseVx: 0,
});

const newEnemy = (): Enemy => ({
  id: 0, x: 0, y: 0, vx: 0, vy: 0, r: 16, hp: 1, maxHp: 1, dmg: 5, score: 10,
  typeId: "scout", art: "scout", color: "#fff", t: 0, hitT: 0, angle: 0,
  fireT: 1, fireEvery: 2, pattern: "", px: 0, py: 0, amp: 0, freq: 1, phase: 0,
  alive: true, shielded: false, drop: 0, energy: 1,
});

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w = 0;
  h = 0;
  dpr = 1;
  status: GameStatus = "idle";
  input = new InputSystem();
  particles = new ParticleSystem();
  background = new Background();
  enemyManager = new EnemyManager();
  powerups = new PowerUpSystem();
  score = new ScoreSystem();
  player: PlayerAircraft;
  boss: Boss | null = null;
  level: LevelConfig = getLevel(1);

  bullets = new Pool<Bullet>(newBullet, (b) => { b.hitIds.length = 0; b.t = 0; }, 256);
  enemyBullets = new Pool<Bullet>(newBullet, (b) => { b.hitIds.length = 0; b.t = 0; }, 256);
  enemies = new Pool<Enemy>(newEnemy, () => undefined, 64);

  private raf = 0;
  private lastT = 0;
  private acc = 0;
  private shake = 0;
  private shakeEnabled = true;
  private timeScale = 1;
  private targetTimeScale = 1;
  private fireCd = 0;
  private nextId = 1;
  private fps = 60;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private banner: string | null = null;
  private bannerT = 0;
  private bossPending = false;
  private bossIntroT = 0;
  private runStart = 0;
  private tookDamage = false;
  private hudT = 0;
  private disposed = false;
  private hitStopT = 0;

  onHud: (s: HudState) => void = () => undefined;
  onRunEnd: (s: RunSummary & { victory: boolean }) => void = () => undefined;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D unavailable");
    this.ctx = ctx;
    this.player = new PlayerAircraft(deriveStats(saveSystem.data.upgrades));
    this.resize();
    this.input.attach(canvas, () => ({ x: this.player.x, y: this.player.y }));
    window.addEventListener("resize", this.resize);
    window.addEventListener("orientationchange", this.resize);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.applySettings();
    this.lastT = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  applySettings() {
    const s = saveSystem.data.settings;
    this.shakeEnabled = s.shake;
    this.particles.reduced = s.reducedEffects;
    this.input.sensitivity = s.sensitivity;
    audio.setMusicVolume(s.music);
    audio.setSfxVolume(s.sfx);
  }

  private onVisibility = () => {
    if (document.hidden && this.status === "playing") this.pause();
  };

  resize = () => {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(240, rect.width || window.innerWidth);
    const h = Math.max(320, rect.height || window.innerHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.background.resize(w, h);
    this.player.x = clamp(this.player.x || w / 2, 22, w - 22);
    this.player.y = clamp(this.player.y || h * 0.78, h * 0.12, h - 34);
  };

  /* ---------------- lifecycle ---------------- */

  startLevel(levelId: number) {
    this.level = getLevel(levelId);
    this.background.configure(this.level.env, this.w, this.h);
    this.bullets.clear();
    this.enemyBullets.clear();
    this.enemies.clear();
    this.powerups.clear();
    this.particles.clear();
    this.boss = null;
    this.bossPending = false;
    this.bossIntroT = 0;
    this.score.reset();
    this.player.reset(deriveStats(saveSystem.data.upgrades), this.w, this.h);
    this.enemyManager.start(this.level);
    this.input.hasTarget = false;
    this.input.pointerActive = false;
    this.shake = 0;
    this.timeScale = 1;
    this.targetTimeScale = 1;
    this.tookDamage = false;
    this.runStart = performance.now();
    this.status = "playing";
    this.showBanner(`${this.level.name.toUpperCase()}`);
    audio.unlock();
    audio.startMusic(this.level.tonic);
    this.emitHud(true);
  }

  pause() {
    if (this.status !== "playing") return;
    this.status = "paused";
    audio.stopMusic();
    this.emitHud(true);
  }

  resume() {
    if (this.status !== "paused") return;
    this.status = "playing";
    this.lastT = performance.now();
    audio.startMusic(this.level.tonic);
    this.emitHud(true);
  }

  quitToMenu() {
    this.status = "idle";
    audio.stopMusic();
    this.emitHud(true);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.input.detach();
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("orientationchange", this.resize);
    document.removeEventListener("visibilitychange", this.onVisibility);
    audio.stopMusic();
    this.bullets.clear();
    this.enemyBullets.clear();
    this.enemies.clear();
    this.particles.clear();
    this.powerups.clear();
  }

  /* ---------------- helpers ---------------- */

  private showBanner(text: string, time = 2.2) {
    this.banner = text;
    this.bannerT = time;
  }

  private addShake(v: number) {
    if (this.shakeEnabled) this.shake = Math.min(26, this.shake + v);
  }

  private spawnEnemy(
    typeId: string,
    x: number,
    y: number,
    o: { anchorX: number; anchorY: number; speed: number; hpMul: number; amp: number; phase: number },
  ) {
    const def = ENEMY_TYPES[typeId] ?? ENEMY_TYPES["scout"];
    if (!def) return;
    const e = this.enemies.spawn();
    e.id = this.nextId++;
    e.x = x; e.y = y; e.vx = 0; e.vy = o.speed;
    e.px = o.anchorX; e.py = o.anchorY;
    e.r = def.r; e.hp = Math.round(def.hp * o.hpMul); e.maxHp = e.hp;
    e.dmg = def.dmg; e.score = def.score; e.energy = def.energy;
    e.typeId = def.id; e.art = def.art; e.color = def.color;
    e.t = 0; e.hitT = 0; e.angle = 0; e.fireT = rand(0.5, def.fireEvery);
    e.fireEvery = def.fireEvery; e.amp = o.amp; e.freq = rand(0.8, 1.8);
    e.phase = o.phase; e.alive = true; e.shielded = false;
    e.drop = Math.random();
  }

  private fireEnemyBullet(x: number, y: number, angle: number, speed: number, dmg: number, color = "#ff9c9c", r = 5) {
    if (this.enemyBullets.count > 420) return;
    const b = this.enemyBullets.spawn();
    b.x = x; b.y = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.r = r; b.dmg = dmg; b.color = color; b.kind = "enemy";
    b.life = 6; b.homing = 0; b.pierce = 0; b.trail = 1;
  }

  private spawnPlayerBullet(p: Partial<Bullet>) {
    if (this.bullets.count > 380) return;
    const b = this.bullets.spawn();
    Object.assign(b, p);
    b.t = 0;
  }

  /* ---------------- update ---------------- */

  private frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    let dt = (now - this.lastT) / 1000;
    this.lastT = now;
    if (dt > 0.05) dt = 0.05;

    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsAcc);
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }

    if (this.status === "playing") {
      this.timeScale += (this.targetTimeScale - this.timeScale) * Math.min(1, dt * 6);
      if (this.hitStopT > 0) {
        this.hitStopT -= dt;
        if (this.hitStopT <= 0) this.targetTimeScale = 1;
      }
      this.update(dt * this.timeScale);
    }
    this.render();

    this.hudT -= dt;
    if (this.hudT <= 0) this.emitHud();
  };

  private update(dt: number) {
    const p = this.player;
    this.background.update(dt, this.level.scrollSpeed);
    this.score.update(dt);
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.bannerT <= 0) this.banner = null;
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 42);

    p.update(
      dt,
      { x: this.input.x, y: this.input.y, active: this.input.pointerActive },
      this.input.axis(),
      this.w,
      this.h,
    );

    if (p.dying) {
      if (Math.random() < 0.4) this.particles.explosion(p.x + rand(-14, 14), p.y + rand(-14, 14), 0.6);
      if (!p.alive) {
        this.particles.explosion(p.x, p.y, 2.4, "#ff8ad4");
        this.addShake(20);
        audio.play("bigExplode");
        this.endRun(false);
        return;
      }
    } else {
      // Engine trail
      if (!this.particles.reduced && Math.random() < 0.8) {
        this.particles.emit(p.x + rand(-3, 3), p.y + 14, 1, {
          color: "#7fd8ff", speed: 60, size: 2.2, life: 0.28, dir: Math.PI / 2, spread: 0.35,
        });
      }
      this.autoFire(dt);
    }

    this.updateBullets(dt);
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateEnemyBullets(dt);
    this.powerups.update(dt, this.h, { x: p.x, y: p.y, on: !p.dying });
    this.collectPowerUps();
    this.particles.update(dt);
    this.checkFlow(dt);
  }

  private autoFire(dt: number) {
    const p = this.player;
    this.fireCd -= dt;
    if (this.fireCd > 0) return;
    const def = WEAPONS[p.weapon];
    const stats = deriveStats(saveSystem.data.upgrades);
    const rate = stats.fireRateMul * (p.rapidT > 0 ? 1.75 : 1);
    const cost = def.energyCost;
    if (cost > 0 && p.energy < cost) {
      p.weapon = "cannon";
      this.fireCd = 0.1;
      return;
    }
    if (cost > 0) p.energy = Math.max(0, p.energy - cost);
    let dmgMul = stats.damageMul * (1 + (p.weaponLevel - 1) * 0.14);
    if (p.weapon === "missile") dmgMul *= stats.missileMul * (p.missileBoostT > 0 ? 1.5 : 1);
    if (p.weapon === "laser") dmgMul *= stats.laserMul;
    def.fire({
      x: p.x,
      y: p.y,
      level: p.weaponLevel,
      dmgMul,
      spawn: (b) => this.spawnPlayerBullet(b),
      muzzle: (mx, my, color) =>
        this.particles.emit(mx, my, 3, { color, speed: 120, size: 2.4, life: 0.16, dir: -Math.PI / 2, spread: 0.6 }),
      sfx: (n) => audio.play(n),
    });
    this.fireCd = def.cooldown / rate;
  }

  private updateBullets(dt: number) {
    const a = this.bullets.active;
    const enemies = this.enemies.active;
    for (let i = a.length - 1; i >= 0; i--) {
      const b = a[i] as Bullet;
      b.t += dt;
      b.life -= dt;
      if (b.homing > 0) {
        let best: Enemy | null = null;
        let bd = 1e9;
        for (const e of enemies) {
          const d = (e.x - b.x) ** 2 + (e.y - b.y) ** 2;
          if (d < bd) { bd = d; best = e; }
        }
        const tx = best ? best.x : this.boss?.x;
        const ty = best ? best.y : this.boss?.y;
        if (tx !== undefined && ty !== undefined) {
          const want = Math.atan2(ty - b.y, tx - b.x);
          const cur = Math.atan2(b.vy, b.vx);
          let d = want - cur;
          while (d > Math.PI) d -= TAU;
          while (d < -Math.PI) d += TAU;
          const na = cur + clamp(d, -b.homing * dt, b.homing * dt);
          const sp = Math.hypot(b.vx, b.vy) + 380 * dt;
          b.vx = Math.cos(na) * sp;
          b.vy = Math.sin(na) * sp;
        }
        if (!this.particles.reduced)
          this.particles.emit(b.x, b.y, 1, { color: "#ffb45c", speed: 30, size: 2.4, life: 0.25 });
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.y < -40 || b.y > this.h + 40 || b.x < -60 || b.x > this.w + 60) {
        this.bullets.releaseAt(i);
        continue;
      }
      if (this.resolveBulletHit(b)) this.bullets.releaseAt(i);
    }
  }

  private resolveBulletHit(b: Bullet): boolean {
    const enemies = this.enemies.active;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j] as Enemy;
      if (b.hitIds.includes(e.id)) continue;
      if (!circleHit(b.x, b.y, b.r, e.x, e.y, e.r)) continue;
      e.hp -= b.dmg;
      e.hitT = 0.12;
      this.particles.hitSpark(b.x, b.y, b.color);
      audio.play("hit");
      if (e.hp <= 0) this.killEnemy(j);
      if (b.pierce > 0) { b.pierce--; b.hitIds.push(e.id); return false; }
      return true;
    }
    const boss = this.boss;
    if (boss && !boss.dying && !boss.entering && circleHit(b.x, b.y, b.r, boss.x, boss.y, boss.r * 0.82)) {
      boss.damage(b.dmg);
      this.particles.hitSpark(b.x, b.y, "#ffd7a0");
      audio.play("hit");
      if (boss.dying) this.onBossDeath();
      if (b.pierce > 0) { b.pierce--; return false; }
      return true;
    }
    return false;
  }

  private killEnemy(index: number) {
    const e = this.enemies.active[index] as Enemy;
    const pts = this.score.addKill(e.score, e.energy);
    const big = e.r >= 24;
    this.particles.explosion(e.x, e.y, big ? 1.6 : 1, big ? "#ffb066" : "#ff9d5c");
    this.particles.text(e.x, e.y - 10, `+${pts}`, this.score.combo > 1 ? "#ffe98a" : "#cfe9ff", big ? 17 : 13);
    audio.play(big ? "explode" : "explode");
    this.addShake(big ? 7 : 2.5);
    if (big) {
      this.targetTimeScale = 0.45;
      this.hitStopT = 0.09;
    }
    if (e.drop < 0.26) this.powerups.spawn(e.x, e.y, rollDrop());
    this.enemies.releaseAt(index);
  }

  private updateEnemies(dt: number) {
    const a = this.enemies.active;
    const p = this.player;
    for (let i = a.length - 1; i >= 0; i--) {
      const e = a[i] as Enemy;
      e.t += dt;
      if (e.hitT > 0) e.hitT -= dt;
      const def = ENEMY_TYPES[e.typeId];
      if (def) {
        def.update(e, {
          dt, w: this.w, h: this.h, playerX: p.x, playerY: p.y,
          fireAt: (en, angle, speed, dmg, color, r) =>
            this.fireEnemyBullet(en.x, en.y, angle, speed, dmg * this.level.difficulty, color, r),
        });
      }
      // Body collision
      if (!p.dying && circleHit(e.x, e.y, e.r * 0.8, p.x, p.y, p.r)) {
        this.hurtPlayer(e.dmg * 1.4);
        this.particles.explosion(e.x, e.y, 1.2);
        this.enemies.releaseAt(i);
        continue;
      }
      if (e.y > this.h + 90 || e.x < -180 || e.x > this.w + 180) {
        this.enemies.releaseAt(i);
      }
    }
  }

  private updateEnemyBullets(dt: number) {
    const a = this.enemyBullets.active;
    const p = this.player;
    for (let i = a.length - 1; i >= 0; i--) {
      const b = a[i] as Bullet;
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.y < -60 || b.y > this.h + 60 || b.x < -60 || b.x > this.w + 60) {
        this.enemyBullets.releaseAt(i);
        continue;
      }
      if (!p.dying && circleHit(b.x, b.y, b.r, p.x, p.y, p.r * 0.85)) {
        this.hurtPlayer(b.dmg);
        this.particles.hitSpark(b.x, b.y, "#ff9ec4");
        this.enemyBullets.releaseAt(i);
      }
    }
  }

  private hurtPlayer(dmg: number) {
    const res = this.player.damage(dmg);
    if (res === "none") return;
    this.tookDamage = true;
    this.score.breakCombo();
    audio.play("damage");
    this.addShake(res === "shield" ? 5 : 11);
    this.particles.explosion(this.player.x, this.player.y, res === "shield" ? 0.7 : 1.1, res === "shield" ? "#5ad3ff" : "#ff6a8a");
  }

  private updateBoss(dt: number) {
    const boss = this.boss;
    if (!boss) return;
    boss.update({
      dt, w: this.w, h: this.h, playerX: this.player.x, playerY: this.player.y,
      fire: (x, y, a, sp, dmg, color, r) => this.fireEnemyBullet(x, y, a, sp, dmg * this.level.difficulty, color, r),
      spawnMinion: (x, y) =>
        this.spawnEnemy(this.level.id >= 3 ? "elite" : "fighter", x, y, {
          anchorX: clamp(x, 40, this.w - 40), anchorY: this.h * 0.3, speed: 130,
          hpMul: 0.8 * this.level.difficulty, amp: 40, phase: rand(0, 6),
        }),
      warn: () => audio.play("bossWarn"),
    });
    if (boss.dying) {
      if (Math.random() < 0.7)
        this.particles.explosion(boss.x + rand(-boss.r, boss.r), boss.y + rand(-boss.r * 0.6, boss.r * 0.6), 1.3);
      this.addShake(4);
    }
    if (boss.dead) {
      this.particles.explosion(boss.x, boss.y, 4.5, "#ffd0e6");
      this.particles.ring(boss.x, boss.y, "#ffffff", 200, 0.8);
      this.addShake(24);
      audio.play("bigExplode");
      this.boss = null;
      this.endRun(true);
    }
  }

  private onBossDeath() {
    audio.play("bigExplode");
    this.targetTimeScale = 0.4;
    this.hitStopT = 0.4;
    this.addShake(16);
  }

  private collectPowerUps() {
    const p = this.player;
    const list = this.powerups.pool.active;
    for (let i = list.length - 1; i >= 0; i--) {
      const pu = list[i] as PowerUp;
      if (!circleHit(pu.x, pu.y, pu.r, p.x, p.y, p.r + 8)) continue;
      this.applyPowerUp(pu.kind, pu.x, pu.y);
      this.powerups.pool.releaseAt(i);
    }
  }

  private applyPowerUp(kind: PowerUpKind, x: number, y: number) {
    const p = this.player;
    const st = POWERUP_STYLE[kind];
    audio.play("powerup");
    this.particles.ring(x, y, st.color, 34, 0.5);
    this.particles.emit(x, y, 14, { color: st.color, speed: 220, size: 3, life: 0.5 });
    let label = st.label;
    switch (kind) {
      case "weapon":
        p.weaponLevel = Math.min(6, p.weaponLevel + 1);
        label = `${st.label} L${p.weaponLevel}`;
        break;
      case "shield": p.addShield(p.maxShield * 0.5); break;
      case "health": p.heal(p.maxHealth * 0.3); break;
      case "energy": p.addEnergy(p.maxEnergy * 0.5); break;
      case "rapid": p.rapidT = 9; break;
      case "spread": p.weapon = "spread"; break;
      case "missile": p.weapon = "missile"; p.missileBoostT = 12; break;
      case "multiplier":
        p.multiplierT = 10;
        this.score.addBonus(500);
        break;
      case "love":
        this.score.addBonus(60, 12);
        break;
      default: break;
    }
    this.particles.text(x, y - 16, label, st.color, 14);
  }

  private checkFlow(dt: number) {
    if (this.boss || this.status !== "playing") return;
    this.enemyManager.update(dt, this.enemies.count, (t, x, y, o) => this.spawnEnemy(t, x, y, o), this.w, this.h);
    if (this.enemyManager.finished && this.enemies.count === 0 && !this.bossPending) {
      this.bossPending = true;
      this.bossIntroT = 1.6;
      this.showBanner("WARNING — " + this.level.boss.name.toUpperCase(), 2.4);
      audio.play("bossWarn");
    }
    if (this.bossPending) {
      this.bossIntroT -= dt;
      if (this.bossIntroT <= 0) {
        this.bossPending = false;
        this.boss = new Boss(this.level.boss, this.w, this.h, this.level.difficulty);
      }
    }
  }

  private endRun(victory: boolean) {
    if (this.status !== "playing") return;
    const perfect = victory && !this.tookDamage;
    if (victory) {
      this.score.addBonus(2000, this.level.boss.reward);
      if (perfect) this.score.addBonus(3000, 200);
    }
    const summary: RunSummary & { victory: boolean } = {
      levelId: this.level.id,
      score: this.score.score,
      kills: this.score.kills,
      maxCombo: this.score.maxCombo,
      loveEnergy: Math.round(this.score.loveEnergy),
      perfect,
      timeMs: Math.round(performance.now() - this.runStart),
      victory,
    };
    const d = saveSystem.data;
    d.highScore = Math.max(d.highScore, summary.score);
    d.bestPerLevel[String(this.level.id)] = Math.max(d.bestPerLevel[String(this.level.id)] ?? 0, summary.score);
    d.loveEnergy += summary.loveEnergy;
    if (victory) d.unlockedLevels = Math.max(d.unlockedLevels, Math.min(3, this.level.id + 1));
    saveSystem.flush();

    this.status = victory ? "victory" : "gameover";
    audio.stopMusic();
    audio.play(victory ? "victory" : "defeat");
    this.onRunEnd(summary);
    this.emitHud(true);
  }

  /* ---------------- render ---------------- */

  private render() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0.2) {
      ctx.translate(rand(-this.shake, this.shake) * 0.5, rand(-this.shake, this.shake) * 0.5);
    }
    this.background.draw(ctx);

    // Enemy bullets
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const b of this.enemyBullets.active) {
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 2.6);
      g.addColorStop(0, b.color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.6, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.5, 0, TAU); ctx.fill();
    }
    ctx.restore();

    this.powerups.draw(ctx);

    for (const e of this.enemies.active) drawEnemy(ctx, e);
    if (this.boss) {
      drawBoss(ctx, this.boss);
    }

    // Player bullets with trails
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const b of this.bullets.active) {
      const len = 10 * b.trail;
      const sp = Math.hypot(b.vx, b.vy) || 1;
      const tx = b.x - (b.vx / sp) * len;
      const ty = b.y - (b.vy / sp) * len;
      const grad = ctx.createLinearGradient(b.x, b.y, tx, ty);
      grad.addColorStop(0, b.color);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = b.r * 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU); ctx.fill();
    }
    ctx.restore();

    if (this.status !== "idle" && this.player.alive) {
      drawPlayerShip(
        ctx, this.player.x, this.player.y, this.player.roll, this.player.thrust,
        performance.now() / 1000, this.player.invuln > 0, this.player.shield,
      );
    }

    this.particles.draw(ctx);

    if (this.player.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,60,110,${this.player.hitFlash * 0.35})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    if (this.banner) {
      const alpha = Math.min(1, this.bannerT);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.font = "800 22px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = "#ffe6f2";
      ctx.shadowColor = "#ff6fb0";
      ctx.shadowBlur = 18;
      ctx.fillText(this.banner, this.w / 2, this.h * 0.34);
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---------------- HUD ---------------- */

  emitHud(force = false) {
    if (!force && this.hudT > 0) return;
    this.hudT = 1 / 20;
    const p = this.player;
    this.onHud({
      status: this.status,
      health: Math.round(p.health), maxHealth: p.maxHealth,
      shield: Math.round(p.shield), maxShield: p.maxShield,
      energy: Math.round(p.energy), maxEnergy: p.maxEnergy,
      weapon: p.weapon, weaponName: WEAPONS[p.weapon].name, weaponLevel: p.weaponLevel,
      score: this.score.score, combo: this.score.combo, streak: this.score.streak,
      loveEnergy: Math.round(this.score.loveEnergy),
      levelId: this.level.id, levelName: this.level.name,
      wave: this.enemyManager.waveNumber, waveTotal: this.enemyManager.waveTotal,
      boss: this.boss ? { name: this.level.boss.name, frac: this.boss.healthFrac, phase: this.boss.phase } : null,
      fps: this.fps,
      banner: this.banner,
      rapid: p.rapidT > 0,
      multiplier: p.multiplierT > 0,
    });
  }

  /** Manual weapon switch (HUD button / number keys). */
  setWeapon(id: WeaponId) {
    this.player.weapon = id;
    this.emitHud(true);
  }
}
