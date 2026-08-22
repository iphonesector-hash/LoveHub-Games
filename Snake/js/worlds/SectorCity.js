import * as THREE from 'three';
import { WORLD_DEFS } from './WorldDefs.js';
import { ChunkStreamer } from '../systems/ChunkStreamer.js';

export { WORLD_DEFS };

export class SectorCity {
  constructor(scene, worldId = 'sectorCity', collisionSystem = null) {
    this.scene = scene;
    this.def = WORLD_DEFS[worldId] || WORLD_DEFS.sectorCity;
    this.bounds = 1e9;
    this.group = new THREE.Group();
    scene.add(this.group);
    this._buildSky();
    this.streamer = new ChunkStreamer(scene, this.def, collisionSystem);
    this._buildAmbient();
    this._auroraBands = null;
    if (this.def.theme === 'aurora') this._buildAurora();
    if (this.def.theme === 'void') this._buildStarfield();
  }

  _buildSky() {
    const d = this.def;
    const skyGeo = new THREE.SphereGeometry(280, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        topColor: { value: new THREE.Color(d.skyTop || d.bg) },
        botColor: { value: new THREE.Color(d.skyBot || d.bg) },
      },
      vertexShader: 'varying vec3 vWorld; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 topColor; uniform vec3 botColor; varying vec3 vWorld; void main() { float h = normalize(vWorld).y * 0.5 + 0.5; gl_FragColor = vec4(mix(botColor, topColor, h), 1.0); }',
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.group.add(this.sky);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(160, 210, 48),
      new THREE.MeshBasicMaterial({
        color: d.accent, transparent: true,
        opacity: d.theme === 'neon' ? 0.12 : 0.06,
        side: THREE.DoubleSide, depthWrite: false, fog: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -2;
    this.group.add(ring);

    if (d.theme === 'neon' || d.theme === 'ember') {
      const ring2 = new THREE.Mesh(
        new THREE.RingGeometry(100, 130, 32),
        new THREE.MeshBasicMaterial({
          color: d.secondary, transparent: true, opacity: 0.08,
          side: THREE.DoubleSide, depthWrite: false, fog: false,
        })
      );
      ring2.rotation.x = -Math.PI / 2;
      ring2.position.y = 10;
      this.group.add(ring2);
    }

    if (d.theme === 'cyber' || d.theme === 'neon') {
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        const ht = 8 + Math.random() * 20;
        const sil = new THREE.Mesh(
          new THREE.BoxGeometry(3 + Math.random() * 4, ht, 3),
          new THREE.MeshBasicMaterial({ color: d.skyBot || 0x050a14, fog: false })
        );
        sil.position.set(Math.cos(ang) * 120, ht * 0.35, Math.sin(ang) * 120);
        this.group.add(sil);
      }
    }
    if (d.theme === 'aurora' || d.theme === 'ember') {
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const ht = 12 + Math.random() * 18;
        const sil = new THREE.Mesh(
          new THREE.ConeGeometry(4 + Math.random() * 3, ht, 4),
          new THREE.MeshBasicMaterial({ color: d.skyBot || 0x040810, fog: false })
        );
        sil.position.set(Math.cos(ang) * 110, ht * 0.3, Math.sin(ang) * 110);
        this.group.add(sil);
      }
    }
  }

  _buildAmbient() {
    const d = this.def;
    const count = d.particleCount || 40;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const style = d.particleStyle || 'city_lights';
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 200;
      if (style === 'snow' || style === 'embers') pos[i * 3 + 1] = Math.random() * 30;
      else if (style === 'stars') pos[i * 3 + 1] = 8 + Math.random() * 40;
      else pos[i * 3 + 1] = 1.5 + Math.random() * 28;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    let color = d.accent;
    if (style === 'embers') color = 0xff6020;
    if (style === 'snow') color = 0xe0f0ff;
    if (style === 'stars') color = 0xc0d0ff;
    const mat = new THREE.PointsMaterial({
      color, size: d.particleSize || 0.3, transparent: true, opacity: 0.55,
      depthWrite: false, sizeAttenuation: true,
    });
    this.particles = new THREE.Points(geo, mat);
    this.group.add(this.particles);
    this._particleStyle = style;
  }

  _buildAurora() {
    this._auroraBands = new THREE.Group();
    const colors = [0x40ffb0, 0x60a0ff, 0x80ffe0];
    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(
        new THREE.PlaneGeometry(90 + i * 25, 14 + i * 5),
        new THREE.MeshBasicMaterial({
          color: colors[i], transparent: true, opacity: 0.1 + i * 0.03,
          side: THREE.DoubleSide, depthWrite: false, fog: false,
        })
      );
      band.position.set(0, 40 + i * 10, -50 - i * 15);
      band.rotation.x = 0.35;
      this._auroraBands.add(band);
    }
    this.group.add(this._auroraBands);
  }

  _buildStarfield() {
    const count = 80;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const elev = Math.random() * 0.6 + 0.2;
      pos[i * 3] = Math.cos(ang) * 150;
      pos[i * 3 + 1] = 20 + elev * 80;
      pos[i * 3 + 2] = Math.sin(ang) * 150;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this._stars = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.5, transparent: true, opacity: 0.8, depthWrite: false, sizeAttenuation: true, fog: false,
    }));
    this.group.add(this._stars);
  }

  applySceneTheme(scene) {
    const d = this.def;
    scene.background = new THREE.Color(d.bg);
    scene.fog = new THREE.FogExp2(d.fog, d.fogDensity || 0.0055);
  }

  update(dt, time, playerX = 0, playerZ = 0) {
    if (this.streamer) this.streamer.update(playerX, playerZ);
    if (this.sky) this.sky.position.set(playerX, 0, playerZ);
    if (this.particles) {
      const pos = this.particles.geometry.attributes.position;
      const arr = pos.array;
      const style = this._particleStyle;
      if (style === 'snow' || style === 'embers') {
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 1] -= dt * (style === 'embers' ? 2.5 : 4);
          if (style === 'embers') arr[i] += Math.sin(time + i) * dt * 0.8;
          if (arr[i + 1] < 0) {
            arr[i + 1] = 25 + Math.random() * 10;
            arr[i] = playerX + (Math.random() - 0.5) * 80;
            arr[i + 2] = playerZ + (Math.random() - 0.5) * 80;
          }
        }
        pos.needsUpdate = true;
      } else {
        this.particles.rotation.y = time * (style === 'stars' ? 0.008 : 0.02);
        this.particles.position.x = playerX * 0.1;
        this.particles.position.z = playerZ * 0.1;
      }
    }
    if (this._auroraBands) {
      this._auroraBands.position.x = playerX * 0.05;
      this._auroraBands.position.z = playerZ * 0.05;
      this._auroraBands.children.forEach((b, i) => {
        b.material.opacity = 0.08 + Math.sin(time * 0.4 + i) * 0.05;
      });
    }
    if (this._stars) {
      this._stars.position.x = playerX * 0.02;
      this._stars.position.z = playerZ * 0.02;
    }
  }

  getZoneAt(x, z) {
    return this.streamer ? this.streamer.getZoneAt(x, z) : 'open';
  }

  nearestLandmark(x, z) {
    return this.streamer?.nearestLandmark?.(x, z) || null;
  }

  softClamp() {}
  checkCollision() { return false; }

  dispose() {
    if (this.streamer) this.streamer.dispose();
    this.scene.remove(this.group);
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }
}
