/**
 * Boss entity — HP, phases, special attacks. Not just a big AISnake.
 */
import * as THREE from 'three';

export class Boss {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.hp = opts.hp || 100;
    this.maxHp = this.hp;
    this.phase = 1;
    this.maxPhases = opts.phases || 3;
    this.alive = true;
    this.position = opts.position ? opts.position.clone() : new THREE.Vector3(0, 0, 40);
    this.mesh = null;
    this.name = opts.name || 'Sector Boss';
    this.nameFa = opts.nameFa || 'باس سکتور';
    this._build();
  }

  _build() {
    const geo = new THREE.SphereGeometry(2.4, 16, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff2244,
      emissive: 0x440011,
      metalness: 0.4,
      roughness: 0.35
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);
  }

  takeDamage(amount) {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    const ratio = this.hp / this.maxHp;
    if (ratio < 0.33) this.phase = 3;
    else if (ratio < 0.66) this.phase = 2;
    return false;
  }

  update(dt, playerPos) {
    if (!this.alive || !this.mesh) return;
    this.mesh.rotation.y += dt * 0.8;
    if (playerPos) {
      const dir = playerPos.clone().sub(this.mesh.position);
      dir.y = 0;
      if (dir.lengthSq() > 0.01) {
        dir.normalize();
        this.mesh.position.addScaledVector(dir, dt * 3.5);
      }
    }
  }

  getHpRatio() {
    return this.maxHp > 0 ? this.hp / this.maxHp : 0;
  }

  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry?.dispose();
      this.mesh.material?.dispose();
      this.mesh = null;
    }
  }
}
