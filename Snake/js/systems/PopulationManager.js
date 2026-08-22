import { spawnFood } from '../entities/Food.js';
import { spawnPowerUp } from '../entities/PowerUp.js';
import { AISnake } from '../entities/AISnake.js';
import { pickAIType } from '../data/aiTypes.js';
import { TreasureChest } from '../entities/TreasureChest.js';

const MAX_FOOD = 60, MAX_POWER = 14, BASE_MAX_AI = 11, DESPAWN_DIST = 130;
const MIN_AI_SPAWN = 30, MAX_AI_SPAWN = 95;
const MAX_CHESTS = 4;
const MAX_LOOT = 80;

export class PopulationManager {
  constructor(engine) { this.engine = engine; this._chestTimer = 12; this._goldenTimer = 25; }

  update(dt) {
    const e = this.engine;
    if (!e.snake?.alive) return;
    const hx = e.snake.segments[0].x, hz = e.snake.segments[0].z;
    this._maintainFood(hx, hz);
    this._maintainPower(hx, hz);
    this._maintainAI(hx, hz);
    this._maintainChests(hx, hz, dt);
    this._maintainGolden(hx, hz, dt);
    while (e.loot && e.loot.length > MAX_LOOT) {
      const o = e.loot.shift();
      o.dispose?.();
    }
  }

  _dist(x, z, hx, hz) { return Math.hypot(x - hx, z - hz); }

  _maintainFood(hx, hz) {
    const e = this.engine;
    const distScale = Math.min(2.5, 1 + Math.hypot(hx, hz) / 4000);
    const target = Math.min(90, Math.floor(MAX_FOOD * distScale));
    for (let i = e.foods.length - 1; i >= 0; i--) {
      const f = e.foods[i];
      if (!f.alive) { e.foods.splice(i, 1); continue; }
      const p = f.getPosition();
      if (this._dist(p.x, p.z, hx, hz) > DESPAWN_DIST) { f.dispose(); e.foods.splice(i, 1); }
    }
    const opts = {
      ...(e.spawnOpts || {}),
      crystalBias: e.world?.def?.crystalBias ?? e.spawnOpts?.crystalBias ?? 0.12,
      starBias: e.world?.def?.starBias ?? e.spawnOpts?.starBias ?? 0.05,
    };
    let extra = 0;
    if (e.events?.active?.id === 'food_storm' || e.events?.active?.id === 'crystal_storm') extra = 25;
    let guard = 0;
    while (e.foods.length < target + extra && guard++ < 30) {
      const ang = Math.random() * Math.PI * 2, r = 14 + Math.random() * 75;
      const x = hx + Math.cos(ang) * r, z = hz + Math.sin(ang) * r;
      const f = spawnFood(e.scene, 40, [], opts);
      f._x = x; f._z = z; f.mesh.position.set(x, 0.38, z);
      e.foods.push(f);
    }
  }

  _maintainPower(hx, hz) {
    const e = this.engine;
    for (let i = e.powerUps.length - 1; i >= 0; i--) {
      const p = e.powerUps[i];
      if (!p.alive) { e.powerUps.splice(i, 1); continue; }
      if (this._dist(p._x, p._z, hx, hz) > DESPAWN_DIST) { p.dispose(); e.powerUps.splice(i, 1); }
    }
    const bias = e.world?.def?.powerBias || null;
    let guard = 0;
    while (e.powerUps.length < MAX_POWER && guard++ < 12) {
      const ang = Math.random() * Math.PI * 2, r = 22 + Math.random() * 80;
      const x = hx + Math.cos(ang) * r, z = hz + Math.sin(ang) * r;
      const pu = spawnPowerUp(e.scene, bias);
      pu._x = x; pu._z = z; pu.mesh.position.set(x, 0.55, z);
      e.powerUps.push(pu);
    }
  }

  _maintainAI(hx, hz) {
    const e = this.engine;
    const dist = Math.hypot(hx, hz);
    const dens = e.world?.def?.aiDensity || 1;
    let tierMult = 1;
    if (dist > 6000) tierMult = 1.35;
    else if (dist > 3000) tierMult = 1.2;
    else if (dist > 1500) tierMult = 1.1;
    let maxAI = Math.round((dist > 6000 ? 14 : dist > 3000 ? 12 : BASE_MAX_AI) * dens * tierMult);
    maxAI = Math.min(16, Math.max(6, maxAI));
    if (e.events?.active?.id === 'ai_invasion') maxAI = Math.min(18, maxAI + 5);
    for (let i = e.ais.length - 1; i >= 0; i--) {
      const ai = e.ais[i];
      if (!ai.alive) { ai.dispose(); e.ais.splice(i, 1); continue; }
      const ax = ai.segments[0].x, az = ai.segments[0].z;
      if (this._dist(ax, az, hx, hz) > DESPAWN_DIST * 1.2) { ai.dispose(); e.ais.splice(i, 1); }
    }
    const bias = e.world?.def?.aiBias;
    let guard = 0;
    while (e.ais.length < maxAI && guard++ < 8) {
      const ang = Math.random() * Math.PI * 2;
      const r = MIN_AI_SPAWN + Math.random() * (MAX_AI_SPAWN - MIN_AI_SPAWN);
      const x = hx + Math.cos(ang) * r, z = hz + Math.sin(ang) * r;
      let type = pickAIType(bias);
      if (dist > 3000 && Math.random() < 0.15) type = 'elite';
      if (dist > 6000 && Math.random() < 0.12) type = 'giant';
      const startLen = type === 'giant' ? 12 + ((Math.random() * 8) | 0)
        : type === 'elite' ? 10 + ((Math.random() * 6) | 0)
        : 5 + ((Math.random() * 6) | 0);
      const ai = new AISnake(e.scene, { startLength: startLen, aiType: type });
      if (e.collision) ai.setCollisionSystem(e.collision);
      const dx = x - ai.segments[0].x, dz = z - ai.segments[0].z;
      for (const s of ai.segments) { s.x += dx; s.z += dz; s.mesh.position.set(s.x, 0.34, s.z); }
      for (const h of ai.history) { h.x += dx; h.z += dz; }
      e.ais.push(ai);
    }
  }

  _maintainChests(hx, hz, dt) {
    const e = this.engine;
    if (!e.chests) e.chests = [];
    this._chestTimer -= dt;
    for (let i = e.chests.length - 1; i >= 0; i--) {
      const c = e.chests[i];
      if (!c.alive) { e.chests.splice(i, 1); continue; }
      if (this._dist(c._x, c._z, hx, hz) > DESPAWN_DIST * 1.3) { c.dispose(); e.chests.splice(i, 1); }
    }
    if (this._chestTimer <= 0 && e.chests.length < MAX_CHESTS) {
      this._chestTimer = 18 + Math.random() * 20;
      const ang = Math.random() * Math.PI * 2;
      const r = 40 + Math.random() * 60;
      const ch = new TreasureChest(e.scene, hx + Math.cos(ang) * r, hz + Math.sin(ang) * r, e.worldId);
      e.chests.push(ch);
    }
  }

  _maintainGolden(hx, hz, dt) {
    const e = this.engine;
    this._goldenTimer -= dt;
    if (this._goldenTimer > 0) return;
    this._goldenTimer = 40 + Math.random() * 50;
    if (e.ais.length >= 16) return;
    const ang = Math.random() * Math.PI * 2;
    const r = 50 + Math.random() * 40;
    const x = hx + Math.cos(ang) * r, z = hz + Math.sin(ang) * r;
    const ai = new AISnake(e.scene, { startLength: 8 + ((Math.random() * 4) | 0), aiType: 'speedster' });
    ai.aiType = 'golden';
    if (e.collision) ai.setCollisionSystem(e.collision);
    ai.headMat.color.setHex(0xffd060);
    ai.headMat.emissive.setHex(0xffa020);
    ai.headMat.emissiveIntensity = 0.7;
    ai.bodyMat.color.setHex(0xffe080);
    ai._baseSpeedMult = 1.35;
    ai.speedMult = 1.35;
    const dx = x - ai.segments[0].x, dz = z - ai.segments[0].z;
    for (const s of ai.segments) { s.x += dx; s.z += dz; s.mesh.position.set(s.x, 0.34, s.z); }
    for (const h of ai.history) { h.x += dx; h.z += dz; }
    e.ais.push(ai);
  }
}
