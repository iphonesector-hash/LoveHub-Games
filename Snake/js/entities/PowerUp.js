import * as THREE from 'three';

/** Central Power-Up definitions — EN/FA names + explanations for HUD toasts */
export const DEFS = {
  speed: {
    color: 0x40a0ff, duration: 6, icon: '\u26a1',
    label: 'SPEED BOOST', labelFa: '\u0634\u062a\u0627\u0628',
    desc: 'Move faster for a short time.',
    descFa: '\u0628\u0631\u0627\u06cc \u0645\u062f\u062a \u06a9\u0648\u062a\u0627\u0647 \u0633\u0631\u06cc\u0639\u200c\u062a\u0631 \u062d\u0631\u06a9\u062a \u06a9\u0646.',
  },
  bite: {
    color: 0xff4060, duration: 8, icon: '\ud83d\udd25',
    label: 'BITE ATTACK', labelFa: '\u062d\u0645\u0644\u0647 \u06af\u0627\u0632',
    desc: 'Stronger bite — kill larger snakes.',
    descFa: '\u06af\u0627\u0632 \u0642\u0648\u06cc\u200c\u062a\u0631 \u2014 \u0645\u0627\u0631\u0647\u0627\u06cc \u0628\u0632\u0631\u06af\u062a\u0631 \u0631\u0627 \u0628\u06a9\u0634.',
  },
  star: {
    color: 0xffe060, duration: 0, icon: '\u2605',
    label: 'GOLDEN STAR', labelFa: '\u0633\u062a\u0627\u0631\u0647 \u0637\u0644\u0627\u06cc\u06cc',
    desc: 'Instant score and XP bonus.',
    descFa: '\u0627\u0645\u062a\u06cc\u0627\u0632 \u0648 XP \u0641\u0648\u0631\u06cc \u0641\u0648\u0631\u06cc.',
  },
  shield: {
    color: 0x60ffb0, duration: 5, icon: '\ud83d\udee1',
    label: 'SHIELD', labelFa: '\u0633\u067e\u0631',
    desc: 'Absorb one lethal hit.',
    descFa: '\u06cc\u06a9 \u0628\u0631\u062e\u0648\u0631\u062f \u06a9\u0634\u0646\u062f\u0647 \u0631\u0627 \u062c\u0630\u0628 \u06a9\u0646.',
  },
  prize: {
    color: 0xc060ff, duration: 0, icon: '\ud83d\udc8e',
    label: 'PRIZE BUNDLE', labelFa: '\u062c\u0627\u06cc\u0632\u0647 \u0648\u06cc\u0698\u0647',
    desc: 'Burst of coins and mass.',
    descFa: '\u0627\u0646\u0641\u062c\u0627\u0631 \u0633\u06a9\u0647 \u0648 \u062c\u0631\u0645.',
  },
  magnet: {
    color: 0xff80ff, duration: 7, icon: '\ud83e\uddf2',
    label: 'MAGNET', labelFa: '\u0622\u0647\u0646\u200c\u0631\u0628\u0627',
    desc: 'Pull food and loot toward you.',
    descFa: '\u063a\u0630\u0627 \u0648 \u0644\u0648\u062a \u0631\u0627 \u0628\u0647 \u0633\u0645\u062a \u0628\u06a9\u0634.',
  },
  ghost: {
    color: 0xc0c0ff, duration: 5, icon: '\ud83d\udc7b',
    label: 'GHOST MODE', labelFa: '\u062d\u0627\u0644\u062a \u0634\u0628\u062d',
    desc: 'Pass through solid obstacles.',
    descFa: '\u0627\u0632 \u062f\u0627\u062e\u0644 \u0645\u0648\u0627\u0646\u0639 \u062c\u0627\u0645\u062f \u0639\u0628\u0648\u0631 \u06a9\u0646.',
  },
  multiplier: {
    color: 0xffd040, duration: 8, icon: '\u00d72',
    label: 'SCORE x2', labelFa: '\u0627\u0645\u062a\u06cc\u0627\u0632 \u00d72',
    desc: 'Double score for a while.',
    descFa: '\u0627\u0645\u062a\u06cc\u0627\u0632 \u062f\u0648\u0628\u0631\u0627\u0628\u0631 \u0628\u0631\u0627\u06cc \u0645\u062f\u062a\u06cc.',
  },
  freeze: {
    color: 0x80e0ff, duration: 4, icon: '\u2744',
    label: 'FREEZE FIELD', labelFa: '\u0627\u0646\u062c\u0645\u0627\u062f',
    desc: 'Slow nearby AI snakes.',
    descFa: '\u0645\u0627\u0631\u0647\u0627\u06cc \u0646\u0632\u062f\u06cc\u06a9 \u0631\u0627 \u06a9\u0646\u062f \u06a9\u0646.',
  },
  shockwave: {
    color: 0xff8040, duration: 0, icon: '\ud83d\udca5',
    label: 'SHOCKWAVE', labelFa: '\u0645\u0648\u062c \u0634\u0648\u06a9',
    desc: 'Push enemies away instantly.',
    descFa: '\u062f\u0634\u0645\u0646\u0627\u0646 \u0631\u0627 \u0641\u0648\u0631\u06cc \u062f\u0648\u0631 \u06a9\u0646.',
  },
  golden_bite: {
    color: 0xffc020, duration: 7, icon: '\ud83d\udc51',
    label: 'GOLDEN BITE', labelFa: '\u06af\u0627\u0632 \u0637\u0644\u0627\u06cc\u06cc',
    desc: 'Extra mass and coins on kills.',
    descFa: '\u062c\u0631\u0645 \u0648 \u0633\u06a9\u0647 \u0628\u06cc\u0634\u062a\u0631 \u0628\u0627 \u0647\u0631 \u06a9\u0634\u062a\u0647.',
  },
  teleport: {
    color: 0xa0ff80, duration: 0, icon: '\ud83c\udf00',
    label: 'TELEPORT', labelFa: '\u062f\u0648\u0631\u0646\u0648\u0631\u062f\u06cc',
    desc: 'Jump to a safe nearby spot.',
    descFa: '\u0628\u0647 \u0646\u0642\u0637\u0647\u200c\u0627\u06cc \u0627\u0645\u0646 \u0646\u0632\u062f\u06cc\u06a9 \u0628\u067e\u0631.',
  },
  double_xp: {
    color: 0x80ffc0, duration: 12, icon: '\u2b50',
    label: 'DOUBLE XP', labelFa: 'XP \u062f\u0648\u0628\u0631\u0627\u0628\u0631',
    desc: 'Earn double XP for a while.',
    descFa: '\u0628\u0631\u0627\u06cc \u0645\u062f\u062a\u06cc XP \u062f\u0648\u0628\u0631\u0627\u0628\u0631 \u0628\u06af\u06cc\u0631.',
  },
  venom: {
    color: 0xa0ff40, duration: 9, icon: '\u2620',
    label: 'VENOM BITE', labelFa: '\u0632\u0647\u0631',
    desc: 'Poison slows and damages AI.',
    descFa: '\u0632\u0647\u0631 AI \u0631\u0627 \u06a9\u0646\u062f \u0648 \u0622\u0633\u06cc\u0628 \u0645\u06cc\u200c\u0632\u0646\u062f.',
  },
  turbo: {
    color: 0xff2080, duration: 4, icon: '\ud83d\ude80',
    label: 'TURBO', labelFa: '\u062a\u0648\u0631\u0628\u0648',
    desc: 'Extreme speed burst.',
    descFa: '\u0627\u0646\u0641\u062c\u0627\u0631 \u0633\u0631\u0639\u062a \u0634\u062f\u06cc\u062f.',
  },
  mass_gain: {
    color: 0x40ffc0, duration: 0, icon: '\ud83d\udcc8',
    label: 'MASS GAIN', labelFa: '\u0631\u0634\u062f \u0633\u0631\u06cc\u0639',
    desc: 'Instantly gain mass.',
    descFa: '\u0641\u0648\u0631\u06cc \u062c\u0631\u0645 \u0628\u06af\u06cc\u0631.',
  },
  coin_rain: {
    color: 0xffd700, duration: 0, icon: '\ud83d\udcb0',
    label: 'COIN BURST', labelFa: '\u0631\u06af\u0628\u0627\u0631 \u0633\u06a9\u0647',
    desc: 'Spawn a shower of coins.',
    descFa: '\u0631\u06af\u0628\u0627\u0631\u06cc \u0627\u0632 \u0633\u06a9\u0647\u200c\u0647\u0627 \u0628\u0633\u0627\u0632.',
  },
  time_slow: {
    color: 0xb080ff, duration: 5, icon: '\u23f1',
    label: 'TIME SLOW', labelFa: '\u06a9\u0646\u062f\u06cc \u0632\u0645\u0627\u0646',
    desc: 'Slow the whole world briefly.',
    descFa: '\u06a9\u0644 \u062c\u0647\u0627\u0646 \u0631\u0627 \u06a9\u0645\u06cc \u06a9\u0646\u062f \u06a9\u0646.',
  },
  fortify: {
    color: 0x80c0ff, duration: 6, icon: '\ud83e\uddf1',
    label: 'FORTIFY', labelFa: '\u062a\u0642\u0648\u06cc\u062a',
    desc: 'Extra armor and shield time.',
    descFa: '\u0632\u0631\u0647 \u0648 \u0632\u0645\u0627\u0646 \u0633\u067e\u0631 \u0628\u06cc\u0634\u062a\u0631.',
  },
};

const BASE_WEIGHTS = [
  ['speed', 0.10], ['bite', 0.09], ['shield', 0.08], ['magnet', 0.08],
  ['ghost', 0.06], ['multiplier', 0.06], ['freeze', 0.06], ['star', 0.06],
  ['prize', 0.05], ['shockwave', 0.05], ['golden_bite', 0.06],
  ['teleport', 0.04], ['double_xp', 0.06],
  ['venom', 0.05], ['turbo', 0.04], ['mass_gain', 0.05],
  ['coin_rain', 0.04], ['time_slow', 0.04], ['fortify', 0.05],
];

export class PowerUp {
  constructor(scene, x, z, type = 'speed') {
    this.scene = scene;
    this.type = type;
    this.def = DEFS[type] || DEFS.speed;
    this.alive = true;
    this._x = x;
    this._z = z;
    this._t = Math.random() * 10;
    this.mat = new THREE.MeshStandardMaterial({
      color: this.def.color, emissive: this.def.color, emissiveIntensity: 0.75,
      metalness: 0.55, roughness: 0.22,
    });
    this.mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), this.mat);
    this.mesh.position.set(x, 0.55, z);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.7, 16),
      new THREE.MeshBasicMaterial({ color: this.def.color, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.4;
    this.mesh.add(ring);
    this._ring = ring;
    scene.add(this.mesh);
  }

  update(dt, time) {
    if (!this.alive) return;
    this._t += dt;
    this.mesh.position.y = 0.55 + Math.sin(this._t * 3.2) * 0.18;
    this.mesh.rotation.y += dt * 2.4;
    this.mesh.rotation.x = Math.sin(this._t * 1.5) * 0.25;
    if (this._ring) this._ring.material.opacity = 0.25 + Math.sin(this._t * 4) * 0.15;
  }

  getPosition() { return this.mesh.position; }

  collect() {
    this.alive = false;
    this.scene.remove(this.mesh);
    this.mesh.geometry?.dispose();
    this.mat?.dispose();
    return {
      type: this.type,
      duration: this.def.duration,
      label: this.def.label,
      labelFa: this.def.labelFa,
      desc: this.def.desc,
      descFa: this.def.descFa,
      icon: this.def.icon,
      color: this.def.color,
    };
  }

  dispose() {
    if (!this.alive) return;
    this.alive = false;
    this.scene.remove(this.mesh);
    this.mesh.geometry?.dispose();
    this.mat?.dispose();
  }
}

export function spawnPowerUp(scene, bias = null) {
  let weights = BASE_WEIGHTS;
  if (bias && typeof bias === 'object') {
    weights = BASE_WEIGHTS.map(([t, w]) => [t, w * (bias[t] || 1)]);
  }
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  let type = 'speed';
  for (const [t, w] of weights) {
    r -= w;
    if (r <= 0) { type = t; break; }
  }
  const ang = Math.random() * Math.PI * 2;
  const rad = 12 + Math.random() * 55;
  return new PowerUp(scene, Math.cos(ang) * rad, Math.sin(ang) * rad, type);
}
