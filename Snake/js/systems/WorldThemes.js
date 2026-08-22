import * as THREE from 'three';
import { WorldObstacle } from '../entities/WorldObstacle.js';

export function groundMatForTheme(theme, zone, d) {
  if (theme === 'ember') {
    return new THREE.MeshStandardMaterial({
      color: zone === 'danger' ? 0x3a1008 : d.ground, metalness: 0.1, roughness: 0.9,
      emissive: 0x2a0800, emissiveIntensity: zone === 'danger' ? 0.2 : 0.08,
    });
  }
  if (theme === 'crystal') {
    return new THREE.MeshStandardMaterial({
      color: d.ground, metalness: 0.35, roughness: 0.25, emissive: d.accent, emissiveIntensity: 0.06,
    });
  }
  if (theme === 'aurora') {
    return new THREE.MeshStandardMaterial({
      color: 0x0e2430, metalness: 0.15, roughness: 0.7, emissive: 0x081820, emissiveIntensity: 0.05,
    });
  }
  if (theme === 'void') {
    return new THREE.MeshStandardMaterial({
      color: d.ground, metalness: 0.55, roughness: 0.4, emissive: 0x101028, emissiveIntensity: 0.08,
    });
  }
  if (theme === 'neon') {
    return new THREE.MeshStandardMaterial({
      color: d.ground, metalness: 0.3, roughness: 0.55, emissive: d.accent, emissiveIntensity: 0.04,
    });
  }
  if (theme === 'green') {
    return new THREE.MeshStandardMaterial({
      color: zone === 'forest' ? 0x2d6a38 : d.ground, metalness: 0.05, roughness: 0.85,
      emissive: 0x1a4020, emissiveIntensity: 0.04,
    });
  }
  if (theme === 'forest') {
    return new THREE.MeshStandardMaterial({
      color: zone === 'danger' ? 0x1a3020 : d.ground, metalness: 0.08, roughness: 0.9,
      emissive: 0x0e2010, emissiveIntensity: 0.06,
    });
  }
  if (theme === 'mountain') {
    return new THREE.MeshStandardMaterial({
      color: d.ground, metalness: 0.15, roughness: 0.95, emissive: 0x202820, emissiveIntensity: 0.03,
    });
  }
  if (theme === 'canyon') {
    return new THREE.MeshStandardMaterial({
      color: zone === 'danger' ? 0x8a3010 : d.ground, metalness: 0.1, roughness: 0.88,
      emissive: 0x401808, emissiveIntensity: 0.05,
    });
  }
  if (theme === 'coastal') {
    return new THREE.MeshStandardMaterial({
      color: zone === 'open' ? 0xe8d8a8 : d.ground, metalness: 0.05, roughness: 0.92,
      emissive: 0x403010, emissiveIntensity: 0.02,
    });
  }
  if (theme === 'ruins') {
    return new THREE.MeshStandardMaterial({
      color: d.ground, metalness: 0.25, roughness: 0.7, emissive: 0x2a2010, emissiveIntensity: 0.04,
    });
  }
  return new THREE.MeshStandardMaterial({
    color: d.ground, metalness: 0.2, roughness: 0.8,
    emissive: zone === 'danger' ? d.accent : 0x000000, emissiveIntensity: zone === 'danger' ? 0.1 : 0,
  });
}

export function propCountForTheme(theme) {
  // Higher density so worlds feel filled, not empty
  if (theme === 'forest') return 11;
  if (theme === 'neon' || theme === 'cyber') return 9;
  if (theme === 'crystal' || theme === 'green') return 9;
  if (theme === 'mountain' || theme === 'ruins' || theme === 'canyon') return 8;
  if (theme === 'ember' || theme === 'void' || theme === 'aurora' || theme === 'coastal') return 7;
  return 7;
}

export function makeThemeProp(scene, x, z, d, seed, theme, ck) {
  const col = d.propColors[(Math.floor(seed * 10) % d.propColors.length)];
  let mesh = null, obs = null;
  const group = new THREE.Group();

  if (theme === 'cyber') {
    const ht = 2.5 + seed * 12;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2 + seed * 0.7, ht, 1.2 + seed * 0.5),
      new THREE.MeshStandardMaterial({ color: col, metalness: 0.55, roughness: 0.35, emissive: d.accent, emissiveIntensity: 0.15 + seed * 0.2 })
    );
    body.position.y = ht * 0.5;
    group.add(body);
    // neon edge light
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(1.35 + seed * 0.7, 0.12, 1.35 + seed * 0.5),
      new THREE.MeshBasicMaterial({ color: d.accent, transparent: true, opacity: 0.7 })
    );
    edge.position.y = ht + 0.05;
    group.add(edge);
    mesh = group;
    mesh.position.set(x, 0, z);
    obs = new WorldObstacle(scene, { type: 'box', x, z, halfW: 0.7 + seed * 0.35, halfD: 0.7 + seed * 0.25, solid: true, lethal: true, kind: 'building', chunkKey: ck });
  } else if (theme === 'neon') {
    const ht = 2 + seed * 10;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.0 + seed * 0.5, ht, 1.0 + seed * 0.4),
      new THREE.MeshStandardMaterial({ color: col, metalness: 0.4, roughness: 0.4, emissive: d.accent, emissiveIntensity: 0.35 + seed * 0.35 })
    );
    body.position.y = ht * 0.5;
    group.add(body);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(1.4 + seed, 0.35, 0.12),
      new THREE.MeshBasicMaterial({ color: d.secondary || d.accent })
    );
    sign.position.set(0, ht * 0.7, 0.6);
    group.add(sign);
    mesh = group;
    mesh.position.set(x, 0, z);
    obs = new WorldObstacle(scene, { type: 'box', x, z, halfW: 0.6 + seed * 0.25, halfD: 0.6 + seed * 0.2, solid: true, lethal: true, kind: 'building', chunkKey: ck });
  } else if (theme === 'crystal') {
    const s = 0.9 + seed * 2.4;
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(s, 0),
      new THREE.MeshStandardMaterial({ color: d.accent, metalness: 0.65, roughness: 0.12, emissive: d.accent, emissiveIntensity: 0.4 + seed * 0.25, transparent: true, opacity: 0.88 })
    );
    crystal.position.y = 0.9 + seed * 1.4;
    crystal.rotation.y = seed * 6;
    group.add(crystal);
    // small satellite crystals
    if (seed > 0.4) {
      const small = new THREE.Mesh(
        new THREE.OctahedronGeometry(s * 0.4, 0),
        new THREE.MeshStandardMaterial({ color: d.secondary || d.accent, metalness: 0.6, roughness: 0.15, emissive: d.accent, emissiveIntensity: 0.3, transparent: true, opacity: 0.8 })
      );
      small.position.set(s * 0.8, 0.5, s * 0.3);
      group.add(small);
    }
    mesh = group;
    mesh.position.set(x, 0, z);
    obs = new WorldObstacle(scene, { type: 'circle', x, z, radius: s * 0.7, solid: true, lethal: true, kind: 'crystal', chunkKey: ck });
  } else if (theme === 'ember') {
    const ht = 1.5 + seed * 4;
    const rock = new THREE.Mesh(
      new THREE.ConeGeometry(0.9 + seed * 0.7, ht, 5),
      new THREE.MeshStandardMaterial({ color: 0x2a1008, emissive: 0xff4020, emissiveIntensity: 0.3 + seed * 0.35, roughness: 0.7 })
    );
    rock.position.y = ht * 0.45;
    group.add(rock);
    if (seed > 0.55) {
      // small lava puddle hazard nearby
      const lava = new THREE.Mesh(
        new THREE.CircleGeometry(1.2 + seed, 12),
        new THREE.MeshStandardMaterial({ color: 0xff3010, emissive: 0xff2000, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 })
      );
      lava.rotation.x = -Math.PI / 2;
      lava.position.set(1.5, 0.05, 0.5);
      group.add(lava);
    }
    mesh = group;
    mesh.position.set(x, 0, z);
    obs = new WorldObstacle(scene, { type: 'circle', x, z, radius: 1.0 + seed * 0.45, solid: true, lethal: true, kind: 'rock', chunkKey: ck });
  } else if (theme === 'void') {
    const ht = 2 + seed * 7;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.7, ht, 6),
      new THREE.MeshStandardMaterial({ color: col, metalness: 0.8, roughness: 0.25, emissive: d.accent, emissiveIntensity: 0.25 })
    );
    pillar.position.y = ht * 0.5;
    group.add(pillar);
    const cap = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.08, 6, 12),
      new THREE.MeshBasicMaterial({ color: d.accent })
    );
    cap.position.y = ht + 0.2;
    cap.rotation.x = Math.PI / 2;
    group.add(cap);
    mesh = group;
    mesh.position.set(x, 0, z);
    obs = new WorldObstacle(scene, { type: 'cylinder', x, z, radius: 0.75, solid: true, lethal: true, kind: 'pillar', chunkKey: ck });
  } else if (theme === 'green') {
    const ht = 2.5 + seed * 5;
    // trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.28, ht * 0.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a3a18, roughness: 0.9 })
    );
    trunk.position.y = ht * 0.2;
    group.add(trunk);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.9 + seed * 0.6, ht * 0.7, 7),
      new THREE.MeshStandardMaterial({ color: 0x2d8a38, metalness: 0.05, roughness: 0.85, emissive: 0x1a5020, emissiveIntensity: 0.08 })
    );
    canopy.position.y = ht * 0.55;
    group.add(canopy);
    // flower accent
    if (seed > 0.6) {
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 6, 5),
        new THREE.MeshBasicMaterial({ color: 0xffe060 })
      );
      flower.position.set(0.6, 0.25, 0.4);
      group.add(flower);
    }
    mesh = group;
    mesh.position.set(x, 0, z);
    obs = new WorldObstacle(scene, { type: 'circle', x, z, radius: 0.75 + seed * 0.35, solid: true, lethal: true, kind: 'tree', chunkKey: ck });
  } else if (theme === 'forest') {
    const ht = 5 + seed * 10;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.35, ht * 0.35, 6),
      new THREE.MeshStandardMaterial({ color: 0x3a2810, roughness: 0.95 })
    );
    trunk.position.y = ht * 0.18;
    group.add(trunk);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(1.1 + seed * 0.7, ht * 0.75, 7),
      new THREE.MeshStandardMaterial({ color: col, metalness: 0.05, roughness: 0.9, emissive: 0x0e2010, emissiveIntensity: 0.05 })
    );
    canopy.position.y = ht * 0.5;
    group.add(canopy);
    if (seed > 0.5) {
      const mushroom = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 0.35, 6),
        new THREE.MeshStandardMaterial({ color: 0xc04040, emissive: 0x401010, emissiveIntensity: 0.2 })
      );
      mushroom.position.set(0.8, 0.2, 0.3);
      group.add(mushroom);
    }
    mesh = group;
    mesh.position.set(x, 0, z);
    obs = new WorldObstacle(scene, { type: 'circle', x, z, radius: 0.95 + seed * 0.4, solid: true, lethal: true, kind: 'tree', chunkKey: ck });
  } else if (theme === 'mountain') {
    const ht = 3.5 + seed * 9;
    const rock = new THREE.Mesh(
      new THREE.ConeGeometry(1.4 + seed * 1.4, ht, 5),
      new THREE.MeshStandardMaterial({ color: col, metalness: 0.2, roughness: 0.95 })
    );
    rock.position.y = ht * 0.4;
    group.add(rock);
    // snow cap
    const snow = new THREE.Mesh(
      new THREE.ConeGeometry((1.4 + seed * 1.4) * 0.55, ht * 0.25, 5),
      new THREE.MeshStandardMaterial({ color: 0xe8f0ff, roughness: 0.7 })
    );
    snow.position.y = ht * 0.7;
    group.add(snow);
    mesh = group;
    mesh.position.set(x, 0, z);
    obs = new WorldObstacle(scene, { type: 'circle', x, z, radius: 1.2 + seed * 0.65, solid: true, lethal: true, kind: 'rock', chunkKey: ck });
  } else if (theme === 'canyon') {
    const ht = 3 + seed * 8;
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(1.8 + seed * 1.8, ht, 1.3 + seed),
      new THREE.MeshStandardMaterial({ color: col, metalness: 0.1, roughness: 0.9 })
    );
    wall.position.y = ht * 0.5;
    group.add(wall);
    // layered strata
    const layer = new THREE.Mesh(
      new THREE.BoxGeometry(2 + seed * 1.8, 0.25, 1.5 + seed),
      new THREE.MeshStandardMaterial({ color: 0xd08040, roughness: 0.85 })
    );
    layer.position.y = ht * 0.6;
    group.add(layer);
    mesh = group;
    mesh.position.set(x, 0, z);
    obs = new WorldObstacle(scene, { type: 'box', x, z, halfW: 1.0 + seed * 0.8, halfD: 0.8 + seed * 0.5, solid: true, lethal: true, kind: 'rock', chunkKey: ck });
  } else if (theme === 'coastal') {
    const s = 0.9 + seed * 1.6;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(s, 0),
      new THREE.MeshStandardMaterial({ color: 0xc0b090, metalness: 0.15, roughness: 0.8 })
    );
    rock.position.y = s * 0.55;
    group.add(rock);
    if (seed > 0.5) {
      const coral = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.8, 5),
        new THREE.MeshStandardMaterial({ color: 0xff6080, emissive: 0xff4060, emissiveIntensity: 0.25 })
      );
      coral.position.set(s * 0.7, 0.4, 0);
      group.add(coral);
    }
    mesh = group;
    mesh.position.set(x, 0, z);
    obs = new WorldObstacle(scene, { type: 'circle', x, z, radius: s * 0.75, solid: true, lethal: true, kind: 'rock', chunkKey: ck });
  } else if (theme === 'ruins') {
    const ht = 2.5 + seed * 6;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.6, ht, 8),
      new THREE.MeshStandardMaterial({ color: col, metalness: 0.3, roughness: 0.6, emissive: d.accent, emissiveIntensity: 0.12 })
    );
    pillar.position.y = ht * 0.5;
    group.add(pillar);
    // broken top
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.3, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xa09060, roughness: 0.7 })
    );
    top.position.y = ht + 0.1;
    top.rotation.z = seed * 0.3;
    group.add(top);
    mesh = group;
    mesh.position.set(x, 0, z);
    obs = new WorldObstacle(scene, { type: 'cylinder', x, z, radius: 0.75, solid: true, lethal: true, kind: 'pillar', chunkKey: ck });
  } else {
    // aurora / ice default
    const ht = 2.5 + seed * 7;
    const ice = new THREE.Mesh(
      new THREE.ConeGeometry(0.55 + seed * 0.4, ht, 5),
      new THREE.MeshStandardMaterial({ color: 0xd0f0ff, metalness: 0.35, roughness: 0.15, emissive: d.accent, emissiveIntensity: 0.25 + seed * 0.15, transparent: true, opacity: 0.82 })
    );
    ice.position.y = ht * 0.45;
    group.add(ice);
    mesh = group;
    mesh.position.set(x, 0, z);
    obs = new WorldObstacle(scene, { type: 'circle', x, z, radius: 0.65 + seed * 0.35, solid: true, lethal: true, kind: 'ice', chunkKey: ck });
  }
  return { mesh, obs };
}
