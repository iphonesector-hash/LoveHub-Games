import * as THREE from 'three';
import { Snake } from '../entities/Snake.js';
import { AISnake } from '../entities/AISnake.js';
import { spawnFood } from '../entities/Food.js';
import { spawnPowerUp } from '../entities/PowerUp.js';
import { spawnLootExplosion } from '../entities/LootOrb.js';
import { TreasureChest } from '../entities/TreasureChest.js';
import { SectorCity, WORLD_DEFS } from '../worlds/SectorCity.js';
import { InputSystem } from '../systems/InputSystem.js';
import { PopulationManager } from '../systems/PopulationManager.js';
import { EventSystem } from '../systems/EventSystem.js';
import { MissionSystem } from '../systems/MissionSystem.js';
import { CollisionSystem, regionTier } from '../systems/CollisionSystem.js';
import { resolveSolidCollision } from '../systems/CollisionResolver.js';
import { getLevel, nextLevelId } from '../data/levels.js';

export const GameState = {
  LOADING: 'loading', MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused',
  GAMEOVER: 'gameover', LEVELCLEAR: 'levelclear',
};

export class GameEngine {
  constructor(container, options = {}) {
    this.container = container;
    this.state = GameState.LOADING;
    this.clock = new THREE.Clock();
    this.time = 0;
    this.foods = []; this.powerUps = []; this.ais = []; this.loot = []; this.chests = [];
    this.maxFood = 60; this.maxPower = 14; this.maxAI = 11;
    this.mode = 'arcade'; this.worldId = 'sectorCity'; this.levelId = 1;
    this.levelTimer = 0; this.surviveTimer = 0;
    this.goalProgress = { stars: 0, crystals: 0, kills: 0 };
    this.activeMods = {}; this.spawnOpts = {};
    this.massStreak = 0; this.massStreakTimer = 0;
    this.nearMissCD = 0;
    this.deathSlow = 0;
    this.onStateChange = options.onStateChange || (() => {});
    this.onScore = options.onScore || (() => {});
    this.onGameOver = options.onGameOver || (() => {});
    this.onLevelClear = options.onLevelClear || (() => {});
    this.onGoal = options.onGoal || (() => {});
    this.onStatus = options.onStatus || (() => {});
    this.onEvent = options.onEvent || (() => {});
    this.onMission = options.onMission || (() => {});
    this.onProgress = options.onProgress || (() => {});
    this.onWorldEnter = options.onWorldEnter || (() => {});
    this.onToast = options.onToast || (() => {});
    this.onHitFlash = options.onHitFlash || (() => {});
    this._headPos = new THREE.Vector3(); this._aiHead = new THREE.Vector3();
    this._camTarget = new THREE.Vector3(); this._look = new THREE.Vector3(); this._lookSmooth = new THREE.Vector3();
    this._particles = []; this.population = null; this.events = null; this.missions = null;
    this.collision = new CollisionSystem();
    this._shake = 0;
    this._floatTexts = [];
    this._initRenderer(); this._initScene(); this._initCamera(); this._initLights();
    this.input = new InputSystem(document.getElementById('game-root'));
    this.world = null; this.snake = null;
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize); this._onResize();
    this._raf = null; this._running = false; this._baseFov = 52;
    this._pendingGO = null;
  }
  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);
  }
  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1424);
    this.scene.fog = new THREE.FogExp2(0x0a1424, 0.006);
  }
  _initCamera() {
    const aspect = this.container.clientWidth / Math.max(1, this.container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(this._baseFov, aspect, 0.1, 500);
    this.camera.position.set(0, 28, 16); this.camLerp = 7.5; this.lookLerp = 10;
  }
  _initLights() {
    this.scene.add(new THREE.HemisphereLight(0x8ab0d0, 0x0a0e18, 0.75));
    this.dir = new THREE.DirectionalLight(0xffffff, 0.9);
    this.dir.position.set(20, 40, 15); this.dir.castShadow = true;
    this.dir.shadow.mapSize.set(1024, 1024);
    this.scene.add(this.dir);
    const fill = new THREE.DirectionalLight(0x5080c0, 0.25); fill.position.set(-15, 12, -10); this.scene.add(fill);
  }
  async init() {
    this._loadWorld('sectorCity');
    this.snake = new Snake(this.scene, { startLength: 6 });
    this.population = new PopulationManager(this);
    this.events = new EventSystem(this);
    this.missions = new MissionSystem(this);
    this.setState(GameState.MENU);
  }
  _loadWorld(worldId) {
    if (this.world) this.world.dispose();
    this.collision.clear();
    this.worldId = WORLD_DEFS[worldId] ? worldId : 'sectorCity';
    this.world = new SectorCity(this.scene, this.worldId, this.collision);
    this.world.applySceneTheme(this.scene);
  }
  setMode(mode) { this.mode = mode === 'campaign' ? 'campaign' : 'arcade'; }
  setWorld(worldId) { this.worldId = worldId; }
  setLevel(levelId) { this.levelId = levelId; }
  _clearFoods() { this.foods.forEach((f) => f.dispose()); this.foods = []; }
  _clearPowerUps() { this.powerUps.forEach((p) => p.dispose()); this.powerUps = []; }
  _clearAIs() { this.ais.forEach((a) => a.dispose()); this.ais = []; }
  _clearLoot() { this.loot.forEach((o) => o.dispose()); this.loot = []; }
  _clearChests() { this.chests.forEach((c) => c.dispose()); this.chests = []; }
  _burst(x, z, color = 0x3dffb5, n = 5) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      m.position.set(x, 0.5, z); const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 3;
      this.scene.add(m);
      this._particles.push({ mesh: m, vx: Math.cos(a) * sp, vy: 2 + Math.random() * 2, vz: Math.sin(a) * sp, life: 0.3 + Math.random() * 0.2 });
    }
  }
  /** Floating pickup text near snake head (mobile-optimized) */
  _floatText(text, color = '#ffd060') {
    if (localStorage.getItem('snake3d_float_text') === '0') return;
    this.onToast({ text, color });
  }
  _updateParticles(dt) {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i]; p.life -= dt;
      p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt; p.vy -= 6 * dt;
      p.mesh.material.opacity = Math.max(0, p.life * 2.2);
      if (p.life <= 0) { this.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); this._particles.splice(i, 1); }
    }
  }
  startGame() {
    this.goalProgress = { stars: 0, crystals: 0, kills: 0 }; this.surviveTimer = 0; this.activeMods = {}; this.spawnOpts = {};
    this.massStreak = 0; this.massStreakTimer = 0; this.nearMissCD = 0; this.deathSlow = 0; this._shake = 0;
    let worldId = this.worldId; this.maxAI = 11; this.maxFood = 60; this.maxPower = 14;
    if (this.mode === 'campaign') {
      const lv = getLevel(this.levelId); worldId = lv.world || worldId;
      const m = lv.mods || {}; this.activeMods = { ...m };
      this.maxFood = m.foodMax || 55; this.maxAI = m.ais ?? 8;
      this.spawnOpts = { starBias: m.starBias ?? 0.05, crystalBias: m.crystalBias ?? 0.15 };
      this.levelTimer = m.timeLimit || 0;
    } else this.levelTimer = 0;
    if (worldId !== this.world?.def?.id) this._loadWorld(worldId); else {
      this.world.applySceneTheme(this.scene);
      this.collision.clear();
      this.world.streamer?.setCollisionSystem?.(this.collision);
      this.world.streamer?.setWorldDef?.(this.world.def);
    }
    this.snake.reset(6);
    const skin = localStorage.getItem('snake3d_skin') || 'cyan';
    this.snake.setSkin?.(skin);
    const worldSpeed = (this.world?.def?.speedBias) || 1;
    this.snake.speedMult = (this.activeMods.speed || 1) * worldSpeed;
    this.snake._baseSpeedMult = this.snake.speedMult;
    this._clearFoods(); this._clearPowerUps(); this._clearAIs(); this._clearLoot(); this._clearChests();
    for (let i = 0; i < 25; i++) {
      const ang = Math.random() * Math.PI * 2, r = 8 + Math.random() * 40;
      const f = spawnFood(this.scene, 40, [], this.spawnOpts);
      f._x = Math.cos(ang) * r; f._z = Math.sin(ang) * r; f.mesh.position.set(f._x, 0.38, f._z); this.foods.push(f);
    }
    for (let i = 0; i < 5; i++) {
      const ang = Math.random() * Math.PI * 2, r = 15 + Math.random() * 35;
      const pu = spawnPowerUp(this.scene, this.world?.def?.powerBias || null);
      pu._x = Math.cos(ang) * r; pu._z = Math.sin(ang) * r; pu.mesh.position.set(pu._x, 0.55, pu._z); this.powerUps.push(pu);
    }
    {
      const ang = Math.random() * Math.PI * 2, r = 30 + Math.random() * 25;
      const ch = new TreasureChest(this.scene, Math.cos(ang) * r, Math.sin(ang) * r, this.worldId);
      this.chests.push(ch);
    }
    this.events.reset(); this.missions.start();
    if (this.world?.def) this.onWorldEnter(this.world.def);
    this.input.setEnabled(true); this.input.showControls(!this.activeMods.noBoost);
    this.setState(GameState.PLAYING); this.clock.start(); this._emitGoal(); this._emitStatus();
  }
  _emitGoal() {
    if (this.mode !== 'campaign') { this.onGoal(null); return; }
    const lv = getLevel(this.levelId);
    this.onGoal({ level: lv, progress: { ...this.goalProgress, score: this.snake.score, length: this.snake.length, combo: this.snake.combo, survive: this.surviveTimer, kills: this.goalProgress.kills } });
  }
  _emitStatus() {
    const e = this.snake?.effects || {};
    const hx = this.snake?.segments?.[0]?.x || 0, hz = this.snake?.segments?.[0]?.z || 0;
    const dist = Math.hypot(hx, hz);
    const zone = this.world?.getZoneAt?.(hx, hz) || 'open';
    const tier = regionTier(dist);
    const landmark = this.world?.nearestLandmark?.(hx, hz);
    this.onStatus({
      bite: e.bite || 0, speed: e.speed || 0, shield: e.shield || 0,
      magnet: e.magnet || 0, ghost: e.ghost || 0, multiplier: e.multiplier || 0,
      freeze: e.freeze || 0, golden_bite: e.golden_bite || 0, double_xp: e.double_xp || 0,
      venom: e.venom || 0, turbo: e.turbo || 0, time_slow: e.time_slow || 0, fortify: e.fortify || 0,
      rivals: this.ais.filter((a) => a.alive).length,
      distance: Math.floor(dist), zone, world: this.worldId,
      tier, streak: this.massStreak,
      landmark: landmark ? { name: landmark.name, nameFa: landmark.nameFa, dist: Math.floor(landmark.dist) } : null,
      xp: this.snake?.xp || 0, level: this.snake?.level || 1, coins: this.snake?.coins || 0,
    });
  }
  pause() { if (this.state !== GameState.PLAYING) return; this.setState(GameState.PAUSED); this.input.setEnabled(false); }
  resume() { if (this.state !== GameState.PAUSED) return; this.setState(GameState.PLAYING); this.input.setEnabled(true); this.clock.start(); }
  gameOver(opts = {}) {
    if (this.deathSlow > 0) return;
    const burn = !!opts.burn;
    this.snake.die(burn);
    this.deathSlow = burn ? 0.55 : 0.35;
    this._shake = burn ? 1.0 : 0.6;
    this.onHitFlash('death');
    this.input.setEnabled(false); this.input.showControls(false);
    const hx = this.snake.segments[0].x, hz = this.snake.segments[0].z;
    this._burst(hx, hz, burn ? 0xff6020 : 0xff4060, burn ? 22 : 14);
    // Player death also scatters some loot for atmosphere
    const deathLoot = spawnLootExplosion(this.scene, hx, hz, Math.max(4, Math.floor(this.snake.length * 0.3)), {
      color: burn ? 0xff6020 : 0xff4060, bonus: 1,
    });
    this.loot.push(...deathLoot.slice(0, 8));
    if (burn) {
      this.onToast({ text: opts.kind === 'lava' ? '🔥 BURNED IN LAVA' : (opts.kind === 'laser' ? '⚡ HIT BY LASER' : '💥 CRASHED'), color: '#ff6040' });
    } else {
      this.onToast({ text: '💀 GAME OVER', color: '#ff4060' });
    }
    this._pendingGO = { score: this.snake.score, length: this.snake.length, mode: this.mode, levelId: this.levelId, xp: this.snake.xp, coins: this.snake.coins, burn };
  }
  _finishGameOver() {
    this.setState(GameState.GAMEOVER);
    this.onGameOver(this._pendingGO || { score: this.snake.score, length: this.snake.length });
    this._pendingGO = null;
  }
  levelClear() {
    this.input.setEnabled(false); this.input.showControls(false); this.setState(GameState.LEVELCLEAR);
    this.onLevelClear({ score: this.snake.score, length: this.snake.length, levelId: this.levelId, nextLevelId: nextLevelId(this.levelId) });
  }
  setState(s) { this.state = s; this.onStateChange(s); }
  startLoop() { if (this._running) return; this._running = true; this.clock.start(); this._loop(); }
  stopLoop() { this._running = false; if (this._raf) cancelAnimationFrame(this._raf); }
  _loop = () => {
    if (!this._running) return;
    this._raf = requestAnimationFrame(this._loop);
    let dt = Math.min(this.clock.getDelta(), 0.05); this.time += dt;
    if (this.deathSlow > 0) {
      this.deathSlow -= dt;
      dt *= 0.25;
      if (this.deathSlow <= 0 && this.state === GameState.PLAYING) this._finishGameOver();
    }
    if (this.state === GameState.PLAYING && this.deathSlow <= 0) this._updateGameplay(dt);
    this._updateCamera(dt); this._updateParticles(dt);
    const hx = this.snake?.segments?.[0]?.x || 0, hz = this.snake?.segments?.[0]?.z || 0;
    if (this.world) this.world.update(dt, this.time, hx, hz);
    for (const f of this.foods) f.update(dt, this.time);
    for (const p of this.powerUps) p.update(dt, this.time);
    for (const o of this.loot) o.update(dt, this.time);
    for (const c of this.chests) c.update(dt, this.time);
    this.collision.update(dt);
    this.renderer.render(this.scene, this.camera);
  };
  _killSnake(ai, killer = null) {
    if (!ai.alive) return;
    const hx = ai.segments[0].x, hz = ai.segments[0].z;
    this._burst(hx, hz, ai.aiType === 'golden' ? 0xffd060 : 0xff4060, 12);
    const elite = ai.aiType === 'elite' || ai.aiType === 'giant' || ai.aiType === 'golden';
    const orbs = spawnLootExplosion(this.scene, hx, hz, ai.length, {
      elite, color: ai.aiType === 'golden' ? 0xffd060 : 0x60ffb0, bonus: elite ? 4 : 0,
    });
    this.loot.push(...orbs);
    if (killer === this.snake) {
      const pts = Math.max(25, ai.length * 6) * (elite ? 2 : 1);
      this.snake.addScore(pts);
      this.onScore(this.snake.score, this.snake.combo);
      this.missions?.track('kills', 1);
      this.goalProgress.kills = (this.goalProgress.kills || 0) + 1;
      this.massStreak++;
      this.massStreakTimer = 4;
      this._floatText('+' + pts + ' KILL', elite ? '#ffd060' : '#ff6080');
      if (this.massStreak === 3 || this.massStreak === 5 || this.massStreak === 10) {
        this.onToast({ text: this.massStreak + 'x MASS STREAK', color: '#ffd060' });
        this.snake.addScore(this.massStreak * 15);
        this.onScore(this.snake.score, this.snake.combo);
      }
    }
    ai.die();
  }
  _checkGoal() {
    if (this.mode !== 'campaign') return false;
    const g = getLevel(this.levelId).goal; if (!g) return this.snake.score >= 200;
    const s = this.snake;
    if (g.type === 'score') return s.score >= g.value;
    if (g.type === 'length') return s.length >= g.value;
    if (g.type === 'stars') return this.goalProgress.stars >= g.value;
    if (g.type === 'crystals') return this.goalProgress.crystals >= g.value;
    if (g.type === 'combo') return s.combo >= g.value;
    if (g.type === 'survive') return this.surviveTimer >= g.value;
    if (g.type === 'kills') return (this.goalProgress.kills || 0) >= g.value;
    return false;
  }
  _updateGameplay(dt) {
    this.input.update(dt);
    let boost = this.input.isBoosting(); if (this.activeMods.noBoost) boost = false;
    this.snake.update(dt, this.input.getHeading(), this.input.getMagnitude(), boost);
    this.snake.writeHead(this._headPos);
    if (this.nearMissCD > 0) this.nearMissCD -= dt;
    if (this.massStreakTimer > 0) { this.massStreakTimer -= dt; if (this.massStreakTimer <= 0) this.massStreak = 0; }

    if (this.snake.hasMagnet()) {
      for (const f of this.foods) {
        if (!f.alive) continue;
        const p = f.getPosition(); const d = Math.hypot(this._headPos.x - p.x, this._headPos.z - p.z);
        if (d < 12 && d > 0.3) {
          const pull = (12 - d) * 0.08;
          p.x += (this._headPos.x - p.x) / d * pull; p.z += (this._headPos.z - p.z) / d * pull;
          f.mesh.position.set(p.x, p.y, p.z);
        }
      }
      for (const o of this.loot) {
        if (!o.alive) continue;
        const d = Math.hypot(this._headPos.x - o._x, this._headPos.z - o._z);
        if (d < 14 && d > 0.2) {
          const pull = (14 - d) * 0.1;
          o._x += (this._headPos.x - o._x) / d * pull;
          o._z += (this._headPos.z - o._z) / d * pull;
        }
      }
    }

    if (this.snake.checkSelfCollision() && !this.snake.hasShield() && !this.snake.hasGhost()) {
      this.gameOver(); return;
    }

    // === REAL SOLID OBSTACLE COLLISION ===
    const colRes = resolveSolidCollision(this.snake, this._headPos, this.collision, dt);
    if (colRes.killed) {
      this.gameOver({ burn: !!colRes.burn, kind: colRes.kind });
      return;
    }
    if (colRes.absorbed) {
      this._floatText('🛡 SHIELD BROKEN', '#60ffb0');
      this._burst(this._headPos.x, this._headPos.z, 0x60ffb0, 8);
      this.onHitFlash('hit');
    }
    if (colRes.blocked) {
      // Soft haptic-style feedback via toast occasionally
      if (Math.random() < 0.02) this._floatText('🧱 BLOCKED', '#a0a0c0');
    }
    if (colRes.shake) this._shake = Math.max(this._shake, colRes.shake);

    const freezeSlow = this.snake.effects.freeze > 0 ? 0.35 : (this.snake.effects.time_slow > 0 ? 0.55 : 1);
    for (let aiIdx = 0; aiIdx < this.ais.length; aiIdx++) {
      const ai = this.ais[aiIdx];
      if (!ai.alive) continue;
      ai.aiUpdate(dt, this.foods, this._headPos, this.snake.alive, this.snake.hasBite(), freezeSlow);
      const ah = ai.segments[0];

      for (let i = this.foods.length - 1; i >= 0; i--) {
        const f = this.foods[i]; if (!f.alive) continue;
        const p = f.getPosition();
        if (Math.hypot(ah.x - p.x, ah.z - p.z) < 0.7) {
          ai.grow(f.growAmount); ai.addScore(f.value * 8); f.collect(); this.foods.splice(i, 1);
        }
      }

      // Player head hits AI body → kill AI (Snake.io style)
      if (this.collision.headHitsBody(this.snake, ai, 3, 0.42)) {
        if (this.snake.hasBite()) {
          const amt = this.snake.effects.golden_bite > 0 ? 5 : (this.snake.effects.venom > 0 ? 4 : 3);
          const stolen = ai.stealMass(amt);
          this.snake.grow(stolen);
          this.snake.addScore(35 + stolen * 18);
          this.onScore(this.snake.score, this.snake.combo);
          this._burst(this._headPos.x, this._headPos.z, 0xff4060, 6);
          const biteLoot = spawnLootExplosion(this.scene, ah.x, ah.z, Math.max(3, stolen * 2), { bonus: 1 });
          this.loot.push(...biteLoot.slice(0, 4));
          this.massStreak++; this.massStreakTimer = 4;
          this._floatText('🔥 BITE +' + stolen, '#ff4060');
          if (ai.length < 6) this._killSnake(ai, this.snake);
        } else if (this.snake.hasShield()) {
          this.snake.effects.shield = 0;
          this._burst(this._headPos.x, this._headPos.z, 0x60ffb0);
          this._floatText('🛡 SHIELD', '#60ffb0');
        } else if (!this.snake.hasGhost()) {
          this.gameOver(); return;
        }
      }

      // AI head hits player body → AI dies, player gets loot
      if (this.collision.headHitsBody(ai, this.snake, 4, 0.42)) {
        if (this.snake.hasShield()) {
          this.snake.effects.shield = 0;
          this._killSnake(ai, this.snake);
        } else if (!this.snake.hasGhost()) {
          this._killSnake(ai, this.snake);
          continue;
        }
      }

      // Head-to-head: larger wins
      if (this.collision.headHitsHead(this.snake, ai, 0.55)) {
        if (this.snake.length >= ai.length) this._killSnake(ai, this.snake);
        else if (!this.snake.hasShield() && !this.snake.hasGhost()) { this.gameOver(); return; }
      }

      if (this.nearMissCD <= 0) {
        const dHead = Math.hypot(this._headPos.x - ah.x, this._headPos.z - ah.z);
        if (dHead > 0.7 && dHead < 1.6) {
          this.nearMissCD = 1.2;
          this.snake.addScore(12);
          this.onScore(this.snake.score, this.snake.combo);
          this._floatText('NEAR MISS +12', '#80e0ff');
        }
      }

      // AI vs AI combat
      for (let j = aiIdx + 1; j < this.ais.length; j++) {
        const other = this.ais[j];
        if (!other.alive) continue;
        if (this.collision.headHitsBody(ai, other, 4, 0.42)) {
          this._killSnake(ai, null);
          break;
        }
        if (this.collision.headHitsBody(other, ai, 4, 0.42)) {
          this._killSnake(other, null);
        }
      }
    }

    // Food pickup
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const f = this.foods[i]; if (!f.alive) continue;
      const p = f.getPosition();
      if (Math.hypot(this._headPos.x - p.x, this._headPos.z - p.z) < 0.72) {
        const eventMult = this.events?.getScoreMult() || 1;
        const pts = Math.floor(f.value * 10 * eventMult * this.snake.scoreMult());
        this.snake.addScore(f.value * 10 * eventMult); this.snake.grow(f.growAmount);
        if (f.type === 'star') this.goalProgress.stars++;
        if (f.type === 'crystal') this.goalProgress.crystals++;
        this.missions?.track('orbs', 1);
        if (f.type === 'crystal') this.missions?.track('crystals', 1);
        this._burst(p.x, p.z, f.mat.color.getHex()); f.collect(); this.foods.splice(i, 1);
        this.onScore(this.snake.score, this.snake.combo);
        if (f.type === 'star') this._floatText('⭐ STAR +' + pts, '#ffe060');
        else if (f.type === 'crystal') this._floatText('💎 CRYSTAL +' + pts, '#40f0d0');
        else this._floatText('+' + pts + ' MASS', '#3dffb5');
      }
    }

    // Loot orbs
    for (let i = this.loot.length - 1; i >= 0; i--) {
      const o = this.loot[i];
      if (!o.alive) { this.loot.splice(i, 1); continue; }
      if (Math.hypot(this._headPos.x - o._x, this._headPos.z - o._z) < 0.65) {
        const got = o.collect();
        this.loot.splice(i, 1);
        if (got) {
          this.snake.grow(got.grow);
          this.snake.addScore(got.value * 12);
          this.snake.xp += got.xp;
          this.snake.coins += got.coins;
          this.onScore(this.snake.score, this.snake.combo);
          this._burst(o._x, o._z, 0xffd060, 3);
          this._floatText('+' + got.value + ' LOOT', '#ffd060');
        }
      }
    }

    // Treasure chests
    for (let i = this.chests.length - 1; i >= 0; i--) {
      const c = this.chests[i];
      if (!c.alive) { this.chests.splice(i, 1); continue; }
      if (Math.hypot(this._headPos.x - c._x, this._headPos.z - c._z) < 1.2) {
        const reward = c.open();
        this.chests.splice(i, 1);
        if (reward) {
          this.snake.grow(reward.mass);
          this.snake.coins += reward.coins;
          this.snake.xp += reward.xp;
          this.snake.addScore(80 + reward.coins * 5);
          if (reward.power) this.snake.applyEffect(reward.power, 7);
          this.onScore(this.snake.score, this.snake.combo);
          this._floatText(reward.name || '📦 TREASURE', '#ffd060');
          this._burst(this._headPos.x, this._headPos.z, 0xffd060, 12);
        }
      }
    }

    // Power-ups with rich floating feedback
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i]; if (!pu.alive) continue;
      const p = pu.getPosition();
      if (Math.hypot(this._headPos.x - p.x, this._headPos.z - p.z) < 0.85) {
        const got = pu.collect(); this.powerUps.splice(i, 1); this.missions?.track('powers', 1);
        const toastColor = got.color ? ('#' + Number(got.color).toString(16).padStart(6, '0')) : '#a0ffe0';
        const toastText = (got.icon ? got.icon + ' ' : '') + (got.label || got.type.toUpperCase()) + (got.duration ? (' ' + Math.ceil(got.duration) + 's') : '');
        this._floatText(toastText, toastColor);
        if (got.type === 'star') { this.snake.addScore(50); this.goalProgress.stars++; this.onScore(this.snake.score, this.snake.combo); }
        else if (got.type === 'prize') { this.snake.addScore(120); this.snake.grow(5); this.snake.coins += 10; this.onScore(this.snake.score, this.snake.combo); }
        else if (got.type === 'mass_gain') { this.snake.grow(4); this.snake.addScore(40); this.onScore(this.snake.score, this.snake.combo); this._floatText('+4 MASS', '#40ffc0'); }
        else if (got.type === 'coin_rain') { this.snake.coins += 25; this.snake.addScore(60); this.onScore(this.snake.score, this.snake.combo); this._floatText('+25 COINS', '#ffd700'); }
        else if (got.type === 'shockwave') {
          for (const ai of this.ais) {
            if (!ai.alive) continue;
            const ax = ai.segments[0].x, az = ai.segments[0].z;
            const d = Math.hypot(this._headPos.x - ax, this._headPos.z - az);
            if (d < 18) {
              const push = (18 - d) * 0.4; const dx = (ax - this._headPos.x) / (d || 1); const dz = (az - this._headPos.z) / (d || 1);
              for (const s of ai.segments) { s.x += dx * push; s.z += dz * push; s.mesh.position.set(s.x, 0.34, s.z); }
            }
          }
          this._burst(this._headPos.x, this._headPos.z, 0xff8040, 10);
        } else if (got.type === 'teleport') {
          const a = Math.random() * Math.PI * 2, r = 25 + Math.random() * 40;
          const nx = this._headPos.x + Math.cos(a) * r, nz = this._headPos.z + Math.sin(a) * r;
          const dx = nx - this._headPos.x, dz = nz - this._headPos.z;
          for (const s of this.snake.segments) { s.x += dx; s.z += dz; s.mesh.position.set(s.x, 0.34, s.z); }
          for (const h of this.snake.history) { h.x += dx; h.z += dz; }
          this._burst(nx, nz, 0xa0ff80, 8);
        } else {
          this.snake.applyEffect(got.type, got.duration);
          if (got.type === 'speed' || got.type === 'turbo') this.snake.speedMult = Math.max(this.snake.speedMult, got.type === 'turbo' ? 1.85 : 1.5);
        }
        this._burst(p.x, p.z, got.color || 0xffffff, 6); this._emitStatus();
      }
    }

    this.population?.update(dt);
    this.events?.update(dt);
    this.missions?.update(dt);
    this._emitStatus();
    this.onProgress?.({
      distance: Math.floor(Math.hypot(this._headPos.x, this._headPos.z)),
      zone: this.world?.getZoneAt?.(this._headPos.x, this._headPos.z),
      xp: this.snake.xp, level: this.snake.level, coins: this.snake.coins,
    });
    if (this.mode === 'campaign') {
      this.surviveTimer += dt;
      if (this.levelTimer > 0) {
        this.levelTimer -= dt;
        if (this.levelTimer <= 0) { if (this._checkGoal()) this.levelClear(); else this.gameOver(); return; }
      }
      this._emitGoal();
      if (this._checkGoal()) this.levelClear();
    }
  }
  _updateCamera(dt) {
    if (!this.snake) return;
    this.snake.writeHead(this._headPos);
    const dir = this.snake.heading, len = this.snake.length;
    const height = 22 + Math.min(18, len * 0.3), back = 11 + Math.min(8, len * 0.12);
    this._camTarget.set(this._headPos.x - dir.x * back * 0.15, height + (this.snake.boosting ? 2 : 0), this._headPos.z - dir.z * back * 0.15 + back * 0.5);
    if (this._shake > 0) {
      this._shake -= dt;
      this._camTarget.x += (Math.random() - 0.5) * this._shake * 3;
      this._camTarget.z += (Math.random() - 0.5) * this._shake * 3;
    }
    this.camera.position.lerp(this._camTarget, 1 - Math.exp(-this.camLerp * dt));
    this._look.set(this._headPos.x + dir.x * 5, 0.1, this._headPos.z + dir.z * 5);
    this._lookSmooth.lerp(this._look, 1 - Math.exp(-this.lookLerp * dt));
    this.camera.lookAt(this._lookSmooth);
    const wantFov = this._baseFov + (this.snake.boosting ? 7 : 0) + Math.min(6, len * 0.05);
    this.camera.fov += (wantFov - this.camera.fov) * (1 - Math.exp(-5 * dt));
    this.camera.updateProjectionMatrix();
  }
  _onResize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.camera.aspect = w / Math.max(1, h); this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h);
  }
  getScore() { return this.snake?.score || 0; }
  getCombo() { return this.snake?.combo || 1; }
  getLength() { return this.snake?.length || 0; }
  getLevelTimer() { return Math.max(0, this.levelTimer); }
  dispose() {
    this.stopLoop(); window.removeEventListener('resize', this._onResize);
    this.input.dispose(); this.snake?.dispose(); this._clearAIs(); this.world?.dispose();
    this._clearFoods(); this._clearPowerUps(); this._clearLoot(); this._clearChests();
    this.collision.clear(); this.renderer.dispose();
  }
}
