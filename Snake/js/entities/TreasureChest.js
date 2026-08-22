import * as THREE from 'three';

const CHEST_DEFS = {
  sectorCity: { name: 'Cyber Cache', color: 0x2ee6ff, coins: [5, 15], xp: [20, 50] },
  neonDistrict: { name: 'Neon Vault', color: 0xff4fd8, coins: [6, 18], xp: [25, 55] },
  crystalReef: { name: 'Crystal Vault', color: 0x40f0d0, coins: [5, 16], xp: [30, 60] },
  emberValley: { name: 'Ember Cache', color: 0xff6040, coins: [7, 20], xp: [22, 48] },
  voidStation: { name: 'Station Locker', color: 0x8090ff, coins: [8, 22], xp: [28, 65] },
  auroraPeak: { name: 'Frozen Chest', color: 0x50ffc0, coins: [5, 14], xp: [24, 52] },
};

export class TreasureChest {
  constructor(scene, x, z, worldId = 'sectorCity') {
    this.scene = scene;
    this._x = x;
    this._z = z;
    this.alive = true;
    this.opened = false;
    this.def = CHEST_DEFS[worldId] || CHEST_DEFS.sectorCity;
    this.worldId = worldId;
    this.mat = new THREE.MeshStandardMaterial({
      color: this.def.color, emissive: this.def.color, emissiveIntensity: 0.35,
      metalness: 0.55, roughness: 0.35,
    });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.0), this.mat);
    this.mesh.position.set(x, 0.55, z);
    this.lid = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.2, 1.05),
      new THREE.MeshStandardMaterial({ color: 0xffd060, emissive: 0xffa020, emissiveIntensity: 0.4 })
    );
    this.lid.position.set(0, 0.55, 0);
    this.mesh.add(this.lid);
    scene.add(this.mesh);
    this._t = Math.random() * 5;
  }

  update(dt, time) {
    if (!this.alive || this.opened) return;
    this._t += dt;
    this.mesh.position.y = 0.55 + Math.sin(time * 2 + this._t) * 0.08;
    this.mesh.rotation.y += dt * 0.4;
  }

  getPosition() { return this.mesh.position; }

  open() {
    if (!this.alive || this.opened) return null;
    this.opened = true;
    this.alive = false;
    const coins = this.def.coins[0] + ((Math.random() * (this.def.coins[1] - this.def.coins[0])) | 0);
    const xp = this.def.xp[0] + ((Math.random() * (this.def.xp[1] - this.def.xp[0])) | 0);
    const mass = 3 + ((Math.random() * 5) | 0);
    const power = Math.random() < 0.45
      ? ['speed', 'shield', 'magnet', 'bite', 'multiplier', 'freeze'][(Math.random() * 6) | 0]
      : null;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.lid.geometry.dispose();
    this.lid.material.dispose();
    return { coins, xp, mass, power, name: this.def.name };
  }

  dispose() {
    if (!this.opened && this.mesh.parent) {
      this.scene.remove(this.mesh);
      this.mesh.geometry?.dispose();
      this.mat?.dispose();
      this.lid?.geometry?.dispose();
      this.lid?.material?.dispose();
    }
    this.alive = false;
  }
}
