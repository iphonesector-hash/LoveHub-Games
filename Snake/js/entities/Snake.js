import * as THREE from 'three';

const SPACING = 0.46, BASE_SPEED = 8.4, BOOST_SPEED = 15.2, ACCEL = 32, DECEL = 20, TURN_RATE = 16.5;
const HEAD_R = 0.36, BODY_R = 0.29, HISTORY_STEP = 0.1, MAX_HISTORY = 5000;

/** Available snake skins */
export const SNAKE_SKINS = {
  cyan: {
    id: 'cyan', name: 'Cyan Core', nameFa: '\u0647\u0633\u062a\u0647 \u0641\u06cc\u0631\u0648\u0632\u0647\u200c\u0627\u06cc',
    head: 0x2ee6ff, body: 0x4b7bff, emissive: 0x0a3040, eye: 0xffffff,
  },
  neon: {
    id: 'neon', name: 'Neon Pink', nameFa: '\u0635\u0648\u0631\u062a\u06cc \u0646\u0626\u0648\u0646',
    head: 0xff4fd8, body: 0xc040ff, emissive: 0x2a0830, eye: 0xffe0ff,
  },
  ember: {
    id: 'ember', name: 'Ember Fang', nameFa: '\u0646\u06cc\u0634 \u0627\u062e\u06af\u0631',
    head: 0xff6040, body: 0xffa040, emissive: 0x301008, eye: 0xffe080,
  },
  venom: {
    id: 'venom', name: 'Venom Green', nameFa: '\u0632\u0647\u0631 \u0633\u0628\u0632',
    head: 0x50ff60, body: 0x20a040, emissive: 0x082018, eye: 0xc0ffc0,
  },
  gold: {
    id: 'gold', name: 'Golden King', nameFa: '\u067e\u0627\u062f\u0634\u0627\u0647 \u0637\u0644\u0627\u06cc\u06cc',
    head: 0xffd060, body: 0xffa020, emissive: 0x302008, eye: 0xffffff,
  },
  void: {
    id: 'void', name: 'Void Phantom', nameFa: '\u0634\u0628\u062d \u062e\u0644\u0627\u0621',
    head: 0x8090ff, body: 0x4060c0, emissive: 0x101028, eye: 0xc0d0ff,
  },
  ice: {
    id: 'ice', name: 'Ice Serpent', nameFa: '\u0645\u0627\u0631 \u06cc\u062e\u06cc',
    head: 0x80ffe0, body: 0x40c0e0, emissive: 0x082030, eye: 0xffffff,
  },
  shadow: {
    id: 'shadow', name: 'Shadow Coil', nameFa: '\u0633\u0627\u06cc\u0647 \u067e\u06cc\u0686',
    head: 0x606080, body: 0x303048, emissive: 0x080810, eye: 0xff4060,
  },
};

export class Snake {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.segments = []; this.history = []; this._histPool = [];
    this._tmp = new THREE.Vector3();
    this.heading = new THREE.Vector3(0, 0, -1);
    this.desired = new THREE.Vector3(0, 0, -1);
    this.speed = BASE_SPEED; this.targetSpeed = BASE_SPEED;
    this.boosting = false; this.speedMult = 1; this._baseSpeedMult = 1;
    this.effects = {
      speed: 0, bite: 0, shield: 0, magnet: 0, ghost: 0, multiplier: 0,
      freeze: 0, golden_bite: 0, double_xp: 0, venom: 0, turbo: 0, time_slow: 0, fortify: 0,
    };
    this.alive = true;
    this.length = options.startLength || 6;
    this.score = 0; this.mass = this.length; this.combo = 1; this.comboTimer = 0;
    this.xp = 0; this.level = 1; this.coins = 0;
    this.skinId = options.skinId || localStorage.getItem('snake3d_skin') || 'cyan';
    this.group = new THREE.Group(); scene.add(this.group);
    this._mats(); this._spawn();
  }

  setSkin(skinId) {
    if (!SNAKE_SKINS[skinId]) return;
    this.skinId = skinId;
    localStorage.setItem('snake3d_skin', skinId);
    this._mats();
    for (let i = 0; i < this.segments.length; i++) {
      const s = this.segments[i];
      if (s.mesh) s.mesh.material = i === 0 ? this.headMat : this.bodyMat;
    }
  }

  _mats() {
    const sk = SNAKE_SKINS[this.skinId] || SNAKE_SKINS.cyan;
    this.headMat = new THREE.MeshStandardMaterial({
      color: sk.head, metalness: 0.45, roughness: 0.3,
      emissive: sk.emissive, emissiveIntensity: 0.5,
    });
    this.bodyMat = new THREE.MeshStandardMaterial({
      color: sk.body, metalness: 0.28, roughness: 0.45,
      emissive: sk.emissive, emissiveIntensity: 0.18,
    });
    this.eyeMat = new THREE.MeshStandardMaterial({
      color: sk.eye, emissive: sk.eye, emissiveIntensity: 0.7,
    });
  }

  _allocHist(x, z) { const p = this._histPool.pop() || { x: 0, z: 0 }; p.x = x; p.z = z; return p; }

  _spawn() {
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.segments = [];
    while (this.history.length) this._histPool.push(this.history.pop());
    for (let i = 0; i < this.length; i++) {
      const x = 0, z = 8 + i * SPACING;
      const mesh = this._segMesh(i === 0);
      mesh.position.set(x, 0.34, z); this.group.add(mesh);
      this.segments.push({ x, z, mesh }); this.history.push(this._allocHist(x, z));
    }
    this.heading.set(0, 0, -1); this.desired.set(0, 0, -1);
    this.speed = BASE_SPEED; this.targetSpeed = BASE_SPEED; this.boosting = false; this.alive = true; this.mass = this.length;
  }

  _segMesh(isHead) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(isHead ? HEAD_R : BODY_R, 16, 14),
      isHead ? this.headMat : this.bodyMat
    );
    mesh.castShadow = true;
    if (isHead) {
      const eg = new THREE.SphereGeometry(0.09, 8, 6);
      const L = new THREE.Mesh(eg, this.eyeMat), R = new THREE.Mesh(eg, this.eyeMat);
      L.position.set(-0.15, 0.12, -0.24); R.position.set(0.15, 0.12, -0.24); mesh.add(L, R);
      this._headLight = new THREE.PointLight(0x2ee6ff, 1.0, 6);
      this._headLight.position.set(0, 0.25, 0); mesh.add(this._headLight);
    }
    return mesh;
  }

  update(dt, desiredHeading, magnitude, boostHeld) {
    if (!this.alive) return;
    const mag = Math.max(0, Math.min(1, magnitude || 0));
    const dlen = Math.hypot(desiredHeading.x, desiredHeading.z) || 1;
    this.desired.set(desiredHeading.x / dlen, 0, desiredHeading.z / dlen);
    if (mag > 0.04) {
      const hx = this.heading.x, hz = this.heading.z;
      const cross = hx * this.desired.z - hz * this.desired.x;
      const dot = hx * this.desired.x + hz * this.desired.z;
      let angle = Math.atan2(cross, dot);
      const maxTurn = TURN_RATE * (0.75 + 0.25 * mag) * dt;
      if (angle > maxTurn) angle = maxTurn; else if (angle < -maxTurn) angle = -maxTurn;
      if (angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        this.heading.x = hx * c - hz * s; this.heading.z = hx * s + hz * c;
        const hl = Math.hypot(this.heading.x, this.heading.z) || 1;
        this.heading.x /= hl; this.heading.z /= hl;
      }
    }
    this.boosting = !!boostHeld;
    for (const k of Object.keys(this.effects)) {
      if (this.effects[k] > 0) { this.effects[k] -= dt; if (this.effects[k] < 0) this.effects[k] = 0; }
    }
    let spd = this._baseSpeedMult || 1;
    if (this.effects.speed > 0) spd = Math.max(spd, 1.5);
    if (this.effects.turbo > 0) spd = Math.max(spd, 1.85);
    this.speedMult = spd;

    const base = this.boosting ? BOOST_SPEED : BASE_SPEED;
    this.targetSpeed = base * (this.speedMult || 1);
    if (this.speed < this.targetSpeed) this.speed = Math.min(this.targetSpeed, this.speed + ACCEL * dt);
    else if (this.speed > this.targetSpeed) this.speed = Math.max(this.targetSpeed, this.speed - DECEL * dt);

    const head = this.segments[0];
    head.x += this.heading.x * this.speed * dt; head.z += this.heading.z * this.speed * dt;
    head.mesh.position.set(head.x, 0.34, head.z);
    const last = this.history[0];
    if (!last || Math.hypot(head.x - last.x, head.z - last.z) >= HISTORY_STEP) {
      this.history.unshift(this._allocHist(head.x, head.z));
      while (this.history.length > MAX_HISTORY) this._histPool.push(this.history.pop());
    } else { last.x = head.x; last.z = head.z; }
    let distAccum = 0, hi = 0;
    for (let i = 1; i < this.segments.length; i++) {
      const need = i * SPACING;
      while (hi < this.history.length - 1) {
        const a = this.history[hi], b = this.history[hi + 1];
        const seg = Math.hypot(a.x - b.x, a.z - b.z);
        if (distAccum + seg >= need) {
          const t = (need - distAccum) / (seg || 1);
          const sx = a.x + (b.x - a.x) * t, sz = a.z + (b.z - a.z) * t;
          this.segments[i].x = sx; this.segments[i].z = sz; this.segments[i].mesh.position.set(sx, 0.34, sz); break;
        }
        distAccum += seg; hi++;
      }
    }
    this._tmp.set(head.x + this.heading.x, 0.34, head.z + this.heading.z); head.mesh.lookAt(this._tmp);
    if (this._headLight) {
      const sk = SNAKE_SKINS[this.skinId] || SNAKE_SKINS.cyan;
      let col = sk.head;
      if (this.effects.golden_bite > 0) col = 0xffc020;
      else if (this.effects.bite > 0 || this.effects.venom > 0) col = 0xff4060;
      else if (this.effects.turbo > 0) col = 0xff2080;
      else if (this.boosting) col = 0xffb040;
      this._headLight.color.setHex(col);
      this._headLight.intensity = this.boosting || this.effects.turbo > 0 ? 1.8 : (this.effects.bite > 0 ? 1.5 : 1.0);
    }
    const ghosting = this.effects.ghost > 0;
    this.headMat.transparent = ghosting;
    this.headMat.opacity = ghosting ? 0.45 : 1;
    this.bodyMat.transparent = ghosting;
    this.bodyMat.opacity = ghosting ? 0.35 : 1;
    if (this.effects.shield > 0 || this.effects.fortify > 0) {
      this.headMat.emissiveIntensity = 0.85;
    }

    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 1; }
  }

  applyEffect(type, duration) {
    if (type in this.effects) this.effects[type] = Math.max(this.effects[type] || 0, duration);
  }
  hasBite() { return this.effects.bite > 0 || this.effects.golden_bite > 0 || this.effects.venom > 0; }
  hasShield() { return this.effects.shield > 0 || this.effects.fortify > 0; }
  hasGhost() { return this.effects.ghost > 0; }
  hasMagnet() { return this.effects.magnet > 0; }
  scoreMult() {
    let m = 1;
    if (this.effects.multiplier > 0) m *= 2;
    if (this.effects.golden_bite > 0) m *= 1.5;
    return m;
  }
  stealMass(amount = 2) {
    const steal = Math.min(amount, Math.max(0, this.segments.length - 5));
    for (let i = 0; i < steal; i++) {
      const last = this.segments.pop(); if (!last) break;
      this.group.remove(last.mesh); last.mesh.geometry?.dispose();
      this.length = Math.max(5, this.length - 1); this.mass = this.length;
    }
    return steal;
  }
  grow(amount = 1) {
    for (let n = 0; n < amount; n++) {
      const last = this.segments[this.segments.length - 1];
      const mesh = this._segMesh(false); mesh.position.set(last.x, 0.34, last.z);
      this.group.add(mesh); this.segments.push({ x: last.x, z: last.z, mesh }); this.length++; this.mass++;
    }
  }
  writeHead(out) { const h = this.segments[0]; out.set(h.x, 0.34, h.z); return out; }
  checkSelfCollision(threshold = 0.4) {
    if (this.segments.length < 12) return false;
    const h = this.segments[0];
    for (let i = 10; i < this.segments.length; i++)
      if (Math.hypot(h.x - this.segments[i].x, h.z - this.segments[i].z) < threshold) return true;
    return false;
  }
  die(burn = false) {
    this.alive = false; this.boosting = false;
    this.headMat.emissive.setHex(burn ? 0xff6020 : 0xff2020);
    this.headMat.emissiveIntensity = 1.2;
    this.headMat.color.setHex(0xff4020);
    if (this._headLight) { this._headLight.color.setHex(0xff4020); this._headLight.intensity = 2.5; }
  }
  reset(startLength = 6) {
    this.length = startLength; this.mass = startLength; this.score = 0; this.combo = 1; this.comboTimer = 0;
    this.effects = {
      speed: 0, bite: 0, shield: 0, magnet: 0, ghost: 0, multiplier: 0,
      freeze: 0, golden_bite: 0, double_xp: 0, venom: 0, turbo: 0, time_slow: 0, fortify: 0,
    };
    this.speedMult = 1; this._baseSpeedMult = 1;
    this._mats(); this._spawn();
  }
  addScore(points) {
    const mult = this.scoreMult();
    const g = Math.floor(points * this.combo * mult);
    this.score += g;
    this.combo = Math.min(15, this.combo + 0.45);
    this.comboTimer = 2.4;
    this.xp += Math.floor(g * (this.effects.double_xp > 0 ? 2 : 1) * 0.15);
    if (this.xp >= this.level * 100) {
      this.xp -= this.level * 100;
      this.level++;
      this.coins += 15 + this.level * 5;
    }
    return g;
  }
  dispose() { this.scene.remove(this.group); this.segments.forEach((s) => s.mesh.geometry?.dispose()); }
}
