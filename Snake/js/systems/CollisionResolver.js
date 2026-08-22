import * as THREE from 'three';
/**
 * Resolve obstacle collisions.
 * Solid: block + slide along surface (no death).
 * Lethal/hazard: damage/death (shield absorbs one hit).
 * Ghost: pass through everything.
 *
 * Uses multi-sample sweeps + multi-pass push-out + history sync
 * to prevent tunneling at boost speeds.
 */

export function resolveSolidCollision(snake, headPos, collision, dt) {
  if (!snake?.alive || snake.hasGhost?.()) return { killed: false };

  const head = snake.segments[0];
  const hx = headPos.x;
  const hz = headPos.z;
  const margin = 0.58;

  let obsHit = collision.testHead(hx, hz, margin);

  // Continuous sweep along movement (anti-tunnel at high speed)
  if (!obsHit.hit) {
    const steps = snake.speed > 14 ? 8 : (snake.speed > 10 ? 6 : (snake.speed > 7 ? 4 : 3));
    const look = Math.min(snake.speed * dt * 1.15, 2.2);
    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * look;
      const mx = hx - snake.heading.x * t;
      const mz = hz - snake.heading.z * t;
      const h = collision.testHead(mx, mz, margin);
      if (h.hit) { obsHit = h; break; }
    }
  }

  // Radial samples for thick/box obstacles & corners
  if (!obsHit.hit) {
    const s = 0.42;
    const samples = [
      [hx + s, hz], [hx - s, hz], [hx, hz + s], [hx, hz - s],
      [hx + s * 0.72, hz + s * 0.72], [hx - s * 0.72, hz - s * 0.72],
      [hx + s * 0.72, hz - s * 0.72], [hx - s * 0.72, hz + s * 0.72],
    ];
    for (const [sx, sz] of samples) {
      const h = collision.testHead(sx, sz, margin * 0.88);
      if (h.hit) { obsHit = h; break; }
    }
  }

  if (!obsHit.hit) return { killed: false };

  const o = obsHit.obstacle;
  if (!o || !o.alive) return { killed: false };

  // Shield absorbs one hit of any kind
  if (snake.hasShield?.()) {
    snake.effects.shield = 0;
    if (snake.effects.fortify) snake.effects.fortify = 0;
    _pushOut(head, headPos, o, 1.0);
    _syncHistory(snake, head);
    return {
      killed: false,
      shake: 0.5,
      absorbed: true,
      kind: o.kind || 'obstacle',
    };
  }

  // Lethal / hazard → death
  if (obsHit.lethal || o.lethal) {
    return {
      killed: true,
      burn: true,
      kind: o.kind || 'hazard',
      shake: 0.95,
      deathReason: o.kind || 'hazard',
    };
  }

  // Solid obstacle → ALWAYS block (no tunneling even on boost)
  if (obsHit.solid || o.solid !== false) {
    for (let pass = 0; pass < 3; pass++) {
      _pushOut(head, headPos, o, 0.95 + pass * 0.12);
    }
    _syncHistory(snake, head);

    const dx = head.x - o.x;
    const dz = head.z - o.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    const nx = dx / dist;
    const nz = dz / dist;
    const into = snake.heading.x * (-nx) + snake.heading.z * (-nz);
    if (into > 0) {
      snake.heading.x += nx * into * 1.25;
      snake.heading.z += nz * into * 1.25;
      const hl = Math.hypot(snake.heading.x, snake.heading.z) || 1;
      snake.heading.x /= hl;
      snake.heading.z /= hl;
    }
    if (snake.speed > 5) snake.speed *= 0.42;
    snake.boosting = false;

    return {
      killed: false,
      blocked: true,
      solid: true,
      kind: o.kind || 'obstacle',
      shake: 0.28,
      nearMiss: false,
    };
  }

  return { killed: false };
}

function _pushOut(head, headPos, o, extra = 0.7) {
  if (o.type === 'box') {
    const dx = head.x - o.x;
    const dz = head.z - o.z;
    const halfW = (o.halfW || 1) + extra;
    const halfD = (o.halfD || 1) + extra;

    if (Math.abs(dx) <= halfW && Math.abs(dz) <= halfD) {
      const toEdgeX = halfW - Math.abs(dx);
      const toEdgeZ = halfD - Math.abs(dz);
      if (toEdgeX < toEdgeZ) {
        head.x += (dx >= 0 ? 1 : -1) * (toEdgeX + 0.15);
      } else {
        head.z += (dz >= 0 ? 1 : -1) * (toEdgeZ + 0.15);
      }
      head.mesh.position.set(head.x, 0.34, head.z);
      headPos.set(head.x, 0.34, head.z);
      return true;
    }

    const px = Math.max(-(o.halfW || 1), Math.min(o.halfW || 1, dx));
    const pz = Math.max(-(o.halfD || 1), Math.min(o.halfD || 1, dz));
    const ox = dx - px;
    const oz = dz - pz;
    const od = Math.hypot(ox, oz);
    if (od > 0 && od < extra + 0.35) {
      const need = extra + 0.18;
      const push = need - od;
      head.x += (ox / od) * push;
      head.z += (oz / od) * push;
      head.mesh.position.set(head.x, 0.34, head.z);
      headPos.set(head.x, 0.34, head.z);
      return true;
    }
    return false;
  }

  const pushR = (o.radius || 1.2) + extra;
  const dx = head.x - o.x;
  const dz = head.z - o.z;
  const dist = Math.hypot(dx, dz) || 0.001;
  if (dist < pushR) {
    const push = pushR - dist + 0.18;
    head.x += (dx / dist) * push;
    head.z += (dz / dist) * push;
    head.mesh.position.set(head.x, 0.34, head.z);
    headPos.set(head.x, 0.34, head.z);
    return true;
  }
  return false;
}

/** Keep recent body history in sync after a hard push-out so segments do not tunnel. */
function _syncHistory(snake, head) {
  if (!snake.history || !snake.history.length) return;
  const n = Math.min(8, snake.history.length);
  for (let i = 0; i < n; i++) {
    const h = snake.history[i];
    if (!h) continue;
    const t = 1 - i / (n + 1);
    h.x = head.x * t + (h.x || head.x) * (1 - t);
    h.z = head.z * t + (h.z || head.z) * (1 - t);
  }
  if (snake.segments) {
    for (let i = 1; i < Math.min(4, snake.segments.length); i++) {
      const seg = snake.segments[i];
      if (!seg) continue;
      const t = 1 - i / 5;
      seg.x = head.x * t + seg.x * (1 - t);
      seg.z = head.z * t + seg.z * (1 - t);
      if (seg.mesh) seg.mesh.position.set(seg.x, seg.mesh.position.y, seg.z);
    }
  }
}

/** Optional debug wireframe group for colliders (settings toggle). */
export function createDebugMeshes(obstacles, scene) {
  const group = new THREE.Group();
  group.name = 'collisionDebug';
  if (!obstacles) return group;
  for (const o of obstacles) {
    if (!o || !o.alive) continue;
    let mesh;
    if (o.type === 'box') {
      const geo = new THREE.BoxGeometry((o.halfW || 1) * 2, 0.5, (o.halfD || 1) * 2);
      const mat = new THREE.MeshBasicMaterial({ color: o.lethal ? 0xff2200 : 0x00ff88, wireframe: true, transparent: true, opacity: 0.45 });
      mesh = new THREE.Mesh(geo, mat);
    } else {
      const geo = new THREE.CylinderGeometry(o.radius || 1, o.radius || 1, 0.5, 12);
      const mat = new THREE.MeshBasicMaterial({ color: o.lethal ? 0xff2200 : 0x00ff88, wireframe: true, transparent: true, opacity: 0.45 });
      mesh = new THREE.Mesh(geo, mat);
    }
    mesh.position.set(o.x, 0.28, o.z);
    group.add(mesh);
  }
  scene.add(group);
  return group;
}
