const CELL = 12;

export class CollisionSystem {
  constructor() {
    this.obstacles = [];
    this._grid = new Map();
  }

  clear() {
    this.obstacles = [];
    this._grid.clear();
  }

  _key(cx, cz) { return `${cx},${cz}`; }

  _cell(x, z) {
    return { cx: Math.floor(x / CELL), cz: Math.floor(z / CELL) };
  }

  addObstacle(obs) {
    if (!obs || !obs.alive) return;
    this.obstacles.push(obs);
    this._index(obs);
  }

  _index(obs) {
    const r = Math.max(obs.radius || 0, obs.halfW || 0, obs.halfD || 0) + 1;
    const min = this._cell(obs.x - r, obs.z - r);
    const max = this._cell(obs.x + r, obs.z + r);
    obs._cells = [];
    for (let cx = min.cx; cx <= max.cx; cx++) {
      for (let cz = min.cz; cz <= max.cz; cz++) {
        const k = this._key(cx, cz);
        if (!this._grid.has(k)) this._grid.set(k, new Set());
        this._grid.get(k).add(obs);
        obs._cells.push(k);
      }
    }
  }

  removeObstacle(obs) {
    if (!obs) return;
    if (obs._cells) {
      for (const k of obs._cells) this._grid.get(k)?.delete(obs);
    }
    const i = this.obstacles.indexOf(obs);
    if (i >= 0) this.obstacles.splice(i, 1);
  }

  removeByChunk(chunkKey) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      if (o.chunkKey === chunkKey) {
        this.removeObstacle(o);
        o.dispose?.();
      }
    }
  }

  update(dt) {
    for (const o of this.obstacles) o.update?.(dt);
  }

  query(x, z, radius = 8) {
    const out = [];
    const seen = new Set();
    const r = radius;
    const min = this._cell(x - r, z - r);
    const max = this._cell(x + r, z + r);
    for (let cx = min.cx; cx <= max.cx; cx++) {
      for (let cz = min.cz; cz <= max.cz; cz++) {
        const set = this._grid.get(this._key(cx, cz));
        if (!set) continue;
        for (const o of set) {
          if (!o.alive || seen.has(o)) continue;
          seen.add(o);
          out.push(o);
        }
      }
    }
    return out;
  }

  testHead(hx, hz, margin = 0.38) {
    const nearby = this.query(hx, hz, 10);
    for (const o of nearby) {
      if (!o.active || !o.alive) continue;
      if (o.hits(hx, hz, margin)) {
        return { hit: true, lethal: o.lethal, solid: o.solid, obstacle: o };
      }
    }
    return { hit: false, lethal: false, solid: false, obstacle: null };
  }

  headHitsBody(attacker, victim, fromSeg = 4, margin = 0.42) {
    if (!attacker?.alive || !victim?.alive) return false;
    const h = attacker.segments[0];
    const segs = victim.segments;
    const step = segs.length > 40 ? 2 : 1;
    for (let i = fromSeg; i < segs.length; i += step) {
      if (Math.hypot(h.x - segs[i].x, h.z - segs[i].z) < margin) return true;
    }
    return false;
  }

  headHitsHead(a, b, margin = 0.55) {
    if (!a?.alive || !b?.alive) return false;
    const ah = a.segments[0], bh = b.segments[0];
    return Math.hypot(ah.x - bh.x, ah.z - bh.z) < margin;
  }
}

export function regionTier(dist) {
  if (dist < 500) return { id: 'safe', label: 'SAFE', labelFa: 'امن', color: '#60ffb0' };
  if (dist < 1500) return { id: 'frontier', label: 'FRONTIER', labelFa: 'مرز', color: '#40a0ff' };
  if (dist < 3000) return { id: 'danger', label: 'DANGER', labelFa: 'خطر', color: '#ff9040' };
  if (dist < 6000) return { id: 'extreme', label: 'EXTREME', labelFa: 'شدید', color: '#ff4060' };
  return { id: 'void', label: 'VOID', labelFa: 'خلا', color: '#c060ff' };
}
