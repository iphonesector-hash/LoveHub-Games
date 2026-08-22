import * as THREE from 'three';

/** Gameplay collider types: circle | box | cylinder | hazard */
export class WorldObstacle {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.type = opts.type || 'circle';
    this.x = opts.x || 0;
    this.z = opts.z || 0;
    this.radius = opts.radius ?? 1.2;
    this.halfW = opts.halfW ?? 1;
    this.halfD = opts.halfD ?? 1;
    this.lethal = !!opts.lethal;
    this.solid = opts.solid !== false;
    this.active = opts.active !== false;
    this.kind = opts.kind || 'obstacle';
    this.pulse = opts.pulse || 0;
    this._pulseT = Math.random() * 10;
    this.mesh = opts.mesh || null;
    this.ownsMesh = !!opts.ownsMesh;
    this.alive = true;
    this.chunkKey = opts.chunkKey || null;
  }

  update(dt) {
    if (!this.alive || !this.pulse) return;
    this._pulseT += dt;
    const on = (Math.sin(this._pulseT * (Math.PI * 2 / this.pulse)) > -0.2);
    this.active = on;
    if (this.mesh?.material) {
      const m = this.mesh.material;
      if (m.opacity !== undefined) m.opacity = on ? 0.75 : 0.15;
      if (m.emissiveIntensity !== undefined) m.emissiveIntensity = on ? 0.6 : 0.05;
    }
  }

  distanceTo(px, pz) {
    if (!this.active) return 1e9;
    if (this.type === 'box') {
      const dx = Math.max(Math.abs(px - this.x) - this.halfW, 0);
      const dz = Math.max(Math.abs(pz - this.z) - this.halfD, 0);
      if (dx === 0 && dz === 0) {
        const ix = this.halfW - Math.abs(px - this.x);
        const iz = this.halfD - Math.abs(pz - this.z);
        return -Math.min(ix, iz);
      }
      return Math.hypot(dx, dz);
    }
    return Math.hypot(px - this.x, pz - this.z) - this.radius;
  }

  hits(px, pz, margin = 0.35) {
    return this.distanceTo(px, pz) < margin;
  }

  dispose() {
    this.alive = false;
    if (this.ownsMesh && this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.traverse?.((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) {
        if (Array.isArray(this.mesh.material)) this.mesh.material.forEach((m) => m.dispose());
        else this.mesh.material.dispose();
      }
    }
    this.mesh = null;
  }
}
