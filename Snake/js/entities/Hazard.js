import * as THREE from 'three';

export class Hazard {
  constructor(scene, bounds) {
    this.scene = scene;
    this.alive = true;
    const a = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * (bounds * 0.55);
    this.x = Math.cos(a) * r;
    this.z = Math.sin(a) * r;
    this.vx = (Math.random() - 0.5) * 6;
    this.vz = (Math.random() - 0.5) * 6;
    this.bounds = bounds - 2;
    this.radius = 0.55;
    const geo = new THREE.SphereGeometry(this.radius, 12, 10);
    this.mat = new THREE.MeshStandardMaterial({
      color: 0xff3040, emissive: 0xff1020, emissiveIntensity: 0.85, metalness: 0.3, roughness: 0.4,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.position.set(this.x, 0.55, this.z);
    scene.add(this.mesh);
  }

  update(dt) {
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    const d = Math.hypot(this.x, this.z);
    if (d > this.bounds) {
      this.x *= this.bounds / d;
      this.z *= this.bounds / d;
      this.vx *= -1;
      this.vz *= -1;
    }
    this.mesh.position.set(this.x, 0.55 + Math.sin(performance.now() * 0.008) * 0.08, this.z);
  }

  hits(hx, hz, r = 0.35) {
    return Math.hypot(this.x - hx, this.z - hz) < this.radius + r;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}
