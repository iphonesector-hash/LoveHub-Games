import { Snake } from './Snake.js';
import { AI_TYPES, AI_NAMES } from '../data/aiTypes.js';

export class AISnake extends Snake {
  constructor(scene, options = {}) {
    super(scene, options);
    this.isAI = true;
    this.thinkT = 0;
    this.wander = { x: 0, z: -1 };
    this.aiType = options.aiType || 'explorer';
    const def = AI_TYPES[this.aiType] || AI_TYPES.explorer;
    this.aiDef = def;
    this.displayName = AI_NAMES[(Math.random() * AI_NAMES.length) | 0];
    this.headMat.color.setHex(def.color[0]);
    this.headMat.emissive.setHex(0x201010);
    this.bodyMat.color.setHex(def.color[1]);
    this._baseSpeedMult = def.speed;
    this.speedMult = def.speed;
    this._collision = null;
    if (def.size !== 1) for (const s of this.segments) s.mesh.scale.setScalar(def.size);
  }

  setCollisionSystem(cs) { this._collision = cs; }

  /** Steer away from nearby solid/lethal obstacles */
  _avoidObstacles(hx, hz) {
    if (!this._collision) return null;
    const nearby = this._collision.query(hx, hz, 8);
    let ax = 0, az = 0, count = 0;
    for (const o of nearby) {
      if (!o.alive || !o.active) continue;
      const d = o.distanceTo(hx, hz);
      const danger = o.lethal ? 6 : 4;
      if (d < danger) {
        const dx = hx - o.x, dz = hz - o.z;
        const len = Math.hypot(dx, dz) || 0.001;
        const w = (danger - d) / danger;
        ax += (dx / len) * w * (o.lethal ? 2.2 : 1.4);
        az += (dz / len) * w * (o.lethal ? 2.2 : 1.4);
        count++;
      }
    }
    if (!count) return null;
    const len = Math.hypot(ax, az) || 1;
    return { x: ax / len, z: az / len };
  }

  aiUpdate(dt, foods, playerHead, playerAlive, playerHasBite, freezeSlow = 1) {
    if (!this.alive) return;
    this.thinkT -= dt;
    if (this.thinkT <= 0) {
      this.thinkT = 0.16 + Math.random() * 0.28;
      const hx = this.segments[0].x, hz = this.segments[0].z;
      let tx = this.wander.x, tz = this.wander.z;
      const agg = this.aiDef.aggression;

      // Obstacle avoidance has high priority
      const avoid = this._avoidObstacles(hx, hz);
      if (avoid) {
        tx = avoid.x; tz = avoid.z;
      } else if (playerAlive && playerHead) {
        const pd = Math.hypot(hx - playerHead.x, hz - playerHead.z);
        if (playerHasBite && pd < 20) { tx = hx - playerHead.x; tz = hz - playerHead.z; }
        else if (['hunter', 'aggressive', 'elite'].includes(this.aiType) && pd < 38 && Math.random() < agg) {
          tx = playerHead.x - hx; tz = playerHead.z - hz;
        } else if (this.aiType === 'defensive' && pd < 16) {
          tx = hx - playerHead.x; tz = hz - playerHead.z;
        }
      }

      if (!avoid && (this.aiType === 'collector' || this.aiType === 'explorer' || Math.random() < 0.45)) {
        let best = null, bestD = 1e9;
        for (const f of foods) {
          if (!f.alive) continue;
          const p = f.getPosition();
          const d = Math.hypot(hx - p.x, hz - p.z);
          if (d < bestD && d < 42) { bestD = d; best = p; }
        }
        if (best) { tx = best.x - hx; tz = best.z - hz; }
      }

      if (Math.abs(tx) + Math.abs(tz) < 0.1) { tx = Math.random() - 0.5; tz = Math.random() - 0.5; }
      const len = Math.hypot(tx, tz) || 1;
      this.wander.x = tx / len; this.wander.z = tz / len;
    }
    const mag = (0.8 + this.aiDef.aggression * 0.2) * freezeSlow;
    this.update(dt, this.wander, mag, this.aiType === 'speedster' || (this.length > 14 && Math.random() < 0.002));

    // Soft collision resolve for AI against solids (no death on solid, die on lethal)
    if (this._collision) {
      const h = this.segments[0];
      const hit = this._collision.testHead(h.x, h.z, 0.4);
      if (hit.hit && hit.obstacle) {
        const o = hit.obstacle;
        if (hit.lethal || o.lethal) {
          this.alive = false;
          return;
        }
        if (hit.solid || o.solid !== false) {
          const dx = h.x - o.x, dz = h.z - o.z;
          const dist = Math.hypot(dx, dz) || 0.001;
          const pushR = (o.radius || Math.max(o.halfW || 1, o.halfD || 1)) + 0.55;
          if (dist < pushR) {
            const push = pushR - dist + 0.08;
            h.x += (dx / dist) * push;
            h.z += (dz / dist) * push;
            h.mesh.position.set(h.x, 0.34, h.z);
            // redirect away
            this.wander.x = dx / dist;
            this.wander.z = dz / dist;
          }
        }
      }
    }
  }
}
