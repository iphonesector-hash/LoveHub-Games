import * as THREE from 'three';
import { ZONE_TYPES } from '../worlds/WorldDefs.js';
import { WorldObstacle } from '../entities/WorldObstacle.js';
import { groundMatForTheme, propCountForTheme, makeThemeProp } from './WorldThemes.js';

export const CHUNK_SIZE = 48;
const ACTIVE_RADIUS = 2;

export class ChunkStreamer {
  constructor(scene, worldDef, collisionSystem = null) {
    this.scene = scene;
    this.worldDef = worldDef;
    this.collision = collisionSystem;
    this.chunks = new Map();
    this.group = new THREE.Group();
    scene.add(this.group);
    this.landmarks = [];
  }

  key(cx, cz) { return `${cx},${cz}`; }
  worldToChunk(x, z) {
    return { cx: Math.floor(x / CHUNK_SIZE), cz: Math.floor(z / CHUNK_SIZE) };
  }
  setCollisionSystem(cs) { this.collision = cs; }

  update(playerX, playerZ) {
    const { cx, cz } = this.worldToChunk(playerX, playerZ);
    const needed = new Set();
    for (let dx = -ACTIVE_RADIUS; dx <= ACTIVE_RADIUS; dx++)
      for (let dz = -ACTIVE_RADIUS; dz <= ACTIVE_RADIUS; dz++)
        needed.add(this.key(cx + dx, cz + dz));
    for (const k of [...this.chunks.keys()]) if (!needed.has(k)) this._disposeChunk(k);
    for (const k of needed) {
      if (!this.chunks.has(k)) {
        const [sx, sz] = k.split(',').map(Number);
        this._buildChunk(sx, sz);
      }
    }
  }

  _hash(cx, cz) {
    let h = (cx * 73856093) ^ (cz * 19349663);
    return ((h >>> 0) % 100000) / 100000;
  }

  _addObs(obs) {
    if (this.collision) this.collision.addObstacle(obs);
  }

  _buildChunk(cx, cz) {
    const g = new THREE.Group();
    const ox = cx * CHUNK_SIZE + CHUNK_SIZE * 0.5;
    const oz = cz * CHUNK_SIZE + CHUNK_SIZE * 0.5;
    const h = this._hash(cx, cz);
    const zone = ZONE_TYPES[(Math.floor(h * ZONE_TYPES.length)) % ZONE_TYPES.length];
    const d = this.worldDef;
    const theme = d.theme || 'cyber';
    const ck = this.key(cx, cz);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(CHUNK_SIZE - 0.35, CHUNK_SIZE - 0.35, 2, 2),
      groundMatForTheme(theme, zone, d)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(ox, 0, oz);
    g.add(ground);

    if ((theme === 'cyber' || theme === 'neon' || theme === 'void') && (zone === 'open' || zone === 'arena' || zone === 'industrial')) {
      const grid = new THREE.GridHelper(CHUNK_SIZE * 0.9, 6, d.gridA, d.gridB);
      grid.position.set(ox, 0.04, oz);
      const mats = Array.isArray(grid.material) ? grid.material : [grid.material];
      mats.forEach((m) => { m.opacity = theme === 'neon' ? 0.35 : 0.2; m.transparent = true; });
      g.add(grid);
    }

    const baseProps = propCountForTheme(theme);
    const propCount = zone === 'open' ? Math.max(2, baseProps - 2) : (zone === 'forest' || zone === 'crystal') ? baseProps + 1 : baseProps;

    for (let i = 0; i < propCount; i++) {
      const px = ox + (this._hash(cx + i * 3, cz - i) - 0.5) * CHUNK_SIZE * 0.82;
      const pz = oz + (this._hash(cx - i, cz + i * 5) - 0.5) * CHUNK_SIZE * 0.82;
      const seed = h + i * 0.07;
      const { mesh, obs } = makeThemeProp(this.scene, px, pz, d, seed, theme, ck);
      if (mesh) g.add(mesh);
      if (obs) this._addObs(obs);
    }

    if (zone === 'treasure' || zone === 'recovery' || zone === 'boss') {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(6, 6.5, 32),
        new THREE.MeshBasicMaterial({
          color: zone === 'treasure' ? 0xffd060 : zone === 'recovery' ? 0x60ffb0 : 0xff4060,
          transparent: true, opacity: 0.4, side: THREE.DoubleSide,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(ox, 0.08, oz);
      g.add(ring);
    }

    if (theme === 'ember' && h > 0.55) {
      const lx = ox + (h - 0.7) * 14;
      const lz = oz + (this._hash(cz, cx) - 0.5) * 14;
      const rad = 3 + h * 3;
      const lava = new THREE.Mesh(
        new THREE.CircleGeometry(rad, 16),
        new THREE.MeshStandardMaterial({
          color: 0xff3010, emissive: 0xff2000, emissiveIntensity: 0.7,
          metalness: 0.1, roughness: 0.4, transparent: true, opacity: 0.9,
        })
      );
      lava.rotation.x = -Math.PI / 2;
      lava.position.set(lx, 0.06, lz);
      g.add(lava);
      this._addObs(new WorldObstacle(this.scene, {
        type: 'hazard', x: lx, z: lz, radius: rad * 0.9,
        solid: false, lethal: true, kind: 'lava', chunkKey: ck,
      }));
    }

    if ((theme === 'cyber' || theme === 'neon') && h > 0.65 && h < 0.78) {
      const col = theme === 'neon' ? d.accent : 0x2ee6ff;
      const gate = new THREE.Mesh(
        new THREE.BoxGeometry(theme === 'neon' ? 8 : 6, 0.25, 0.35),
        new THREE.MeshStandardMaterial({
          color: col, emissive: col, emissiveIntensity: 0.8, transparent: true, opacity: 0.75,
        })
      );
      gate.position.set(ox, 0.5, oz);
      g.add(gate);
      this._addObs(new WorldObstacle(this.scene, {
        type: 'box', x: ox, z: oz, halfW: theme === 'neon' ? 4 : 3, halfD: 0.4,
        solid: false, lethal: true, kind: theme === 'neon' ? 'laser' : 'energy_barrier',
        pulse: 3.5 + Math.random() * 2, chunkKey: ck, mesh: gate,
      }));
    }

    const dist = Math.hypot(ox, oz);
    if (h > 0.72) {
      const lm = this._makeLandmark(ox, oz, d, theme, h, ck);
      g.add(lm.group);
      for (const o of lm.obstacles) this._addObs(o);
      if (h > 0.88 && dist > 80) {
        this.landmarks.push({ x: ox, z: oz, name: lm.name, nameFa: lm.nameFa, theme, chunkKey: ck });
      }
    }

    this.group.add(g);
    this.chunks.set(ck, { group: g, zone, cx, cz, ox, oz });
  }

  _groundMat(theme, zone, d) {
    return groundMatForTheme(theme, zone, d);
  }

  _makeProp(x, z, d, seed, theme, ck) {
    return makeThemeProp(this.scene, x, z, d, seed, theme, ck);
  }

  _makeLandmark(ox, oz, d, theme, h, ck) {
    const group = new THREE.Group();
    const obstacles = [];
    let name = 'Landmark', nameFa = '\u0646\u0634\u0627\u0646';
    if (theme === 'cyber') {
      name = 'Central Tower'; nameFa = '\u0628\u0631\u062c \u0645\u0631\u06a9\u0632\u06cc';
      const tower = new THREE.Mesh(new THREE.BoxGeometry(3, 16, 3), new THREE.MeshStandardMaterial({ color: 0x1a3048, metalness: 0.6, roughness: 0.3, emissive: d.accent, emissiveIntensity: 0.25 }));
      tower.position.set(0, 8, 0); group.add(tower);
      obstacles.push(new WorldObstacle(this.scene, { type: 'box', x: ox, z: oz, halfW: 1.6, halfD: 1.6, solid: true, lethal: true, kind: 'building', chunkKey: ck }));
    } else if (theme === 'neon') {
      name = 'Neon Cathedral'; nameFa = '\u06a9\u0644\u06cc\u0633\u0627\u06cc \u0646\u0626\u0648\u0646';
      const arch = new THREE.Mesh(new THREE.TorusGeometry(6, 0.4, 8, 24, Math.PI), new THREE.MeshBasicMaterial({ color: d.accent, transparent: true, opacity: 0.8 }));
      arch.rotation.x = -Math.PI / 2; arch.position.y = 0.3; group.add(arch);
      obstacles.push(new WorldObstacle(this.scene, { type: 'circle', x: ox, z: oz, radius: 1.2, solid: true, lethal: true, kind: 'building', chunkKey: ck }));
    } else if (theme === 'crystal') {
      name = 'Crystal Heart'; nameFa = '\u0642\u0644\u0628 \u06a9\u0631\u06cc\u0633\u062a\u0627\u0644';
      const big = new THREE.Mesh(new THREE.OctahedronGeometry(5, 0), new THREE.MeshStandardMaterial({ color: d.accent, metalness: 0.75, roughness: 0.1, emissive: d.accent, emissiveIntensity: 0.55, transparent: true, opacity: 0.9 }));
      big.position.y = 5; group.add(big);
      obstacles.push(new WorldObstacle(this.scene, { type: 'circle', x: ox, z: oz, radius: 3.2, solid: true, lethal: true, kind: 'crystal', chunkKey: ck }));
    } else if (theme === 'ember') {
      name = 'Volcano Core'; nameFa = '\u0647\u0633\u062a\u0647 \u0622\u062a\u0634\u0641\u0634\u0627\u0646';
      const cone = new THREE.Mesh(new THREE.ConeGeometry(5, 9, 7), new THREE.MeshStandardMaterial({ color: 0x2a1008, emissive: 0xff3010, emissiveIntensity: 0.5, roughness: 0.8 }));
      cone.position.y = 4.5; group.add(cone);
      obstacles.push(new WorldObstacle(this.scene, { type: 'circle', x: ox, z: oz, radius: 4, solid: true, lethal: true, kind: 'rock', chunkKey: ck }));
      obstacles.push(new WorldObstacle(this.scene, { type: 'hazard', x: ox, z: oz + 6, radius: 3, solid: false, lethal: true, kind: 'lava', chunkKey: ck }));
    } else if (theme === 'void') {
      name = 'Reactor Core'; nameFa = '\u0647\u0633\u062a\u0647 \u0631\u0627\u06a9\u062a\u0648\u0631';
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x202040, metalness: 0.85, roughness: 0.25, emissive: d.accent, emissiveIntensity: 0.3 }));
      plat.position.y = 0.3; group.add(plat);
      obstacles.push(new WorldObstacle(this.scene, { type: 'cylinder', x: ox, z: oz, radius: 5, solid: true, lethal: true, kind: 'pillar', chunkKey: ck }));
    } else {
      name = 'Aurora Shrine'; nameFa = '\u0632\u06cc\u0627\u0631\u062a\u06af\u0627\u0647 \u0634\u0641\u0642';
      const mono = new THREE.Mesh(new THREE.BoxGeometry(2, 12, 2), new THREE.MeshStandardMaterial({ color: 0xc0e8ff, metalness: 0.4, roughness: 0.12, emissive: d.accent, emissiveIntensity: 0.4, transparent: true, opacity: 0.85 }));
      mono.position.y = 6; mono.rotation.y = h * 2; group.add(mono);
      obstacles.push(new WorldObstacle(this.scene, { type: 'box', x: ox, z: oz, halfW: 1.2, halfD: 1.2, solid: true, lethal: true, kind: 'ice', chunkKey: ck }));
    }
    group.position.set(ox, 0, oz);
    return { group, obstacles, name, nameFa };
  }

  _disposeChunk(k) {
    const c = this.chunks.get(k);
    if (!c) return;
    if (this.collision) this.collision.removeByChunk(k);
    this.landmarks = this.landmarks.filter((l) => l.chunkKey !== k);
    this.group.remove(c.group);
    c.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
    this.chunks.delete(k);
  }

  getZoneAt(x, z) {
    const { cx, cz } = this.worldToChunk(x, z);
    return this.chunks.get(this.key(cx, cz))?.zone || 'open';
  }

  nearestLandmark(x, z) {
    let best = null, bestD = 1e9;
    for (const l of this.landmarks) {
      const d = Math.hypot(l.x - x, l.z - z);
      if (d < bestD) { bestD = d; best = l; }
    }
    return best ? { ...best, dist: bestD } : null;
  }

  setWorldDef(def) {
    this.worldDef = def;
    for (const k of [...this.chunks.keys()]) this._disposeChunk(k);
    this.landmarks = [];
  }

  dispose() {
    for (const k of [...this.chunks.keys()]) this._disposeChunk(k);
    this.scene.remove(this.group);
  }
}
