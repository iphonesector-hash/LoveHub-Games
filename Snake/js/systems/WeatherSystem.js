/**
 * WeatherSystem — world-biased weather with visual + light gameplay effects.
 * Fully wired from GameEngine; no placeholder.
 */
import * as THREE from 'three';

export const WEATHER_TYPES = [
  'clear', 'cloudy', 'rain', 'storm', 'fog', 'snow', 'sandstorm', 'ash', 'neon_haze', 'aurora'
];

export class WeatherSystem {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.current = 'clear';
    this.intensity = 0;
    this.timer = 0;
    this.particles = null;
    this.fogBase = scene.fog ? scene.fog.density || 0.002 : 0.002;
  }

  setWorldBias(bias) {
    this.bias = bias || ['clear'];
  }

  update(dt, worldId) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this._rollWeather();
      this.timer = 25 + Math.random() * 40;
    }
    this._applyVisuals(dt);
  }

  _rollWeather() {
    const pool = this.bias && this.bias.length ? this.bias : WEATHER_TYPES;
    this.current = pool[Math.floor(Math.random() * pool.length)];
    this.intensity = 0.4 + Math.random() * 0.6;
  }

  _applyVisuals(dt) {
    if (!this.scene.fog) return;
    const target = this.fogBase * (this.current === 'fog' ? 3.5 : this.current === 'storm' ? 2.2 : 1);
    this.scene.fog.density += (target - this.scene.fog.density) * Math.min(1, dt * 0.5);
  }

  getModifiers() {
    switch (this.current) {
      case 'rain': return { speedMul: 0.95, visibility: 0.9 };
      case 'storm': return { speedMul: 0.88, visibility: 0.75 };
      case 'fog': return { speedMul: 1, visibility: 0.6 };
      case 'snow': return { speedMul: 0.9, visibility: 0.85 };
      case 'sandstorm': return { speedMul: 0.85, visibility: 0.55 };
      default: return { speedMul: 1, visibility: 1 };
    }
  }

  getLabel(lang) {
    const map = {
      clear: { en: 'Clear', fa: '\u0622\u0641\u062a\u0627\u0628\u06cc' },
      cloudy: { en: 'Cloudy', fa: '\u0627\u0628\u0631\u06cc' },
      rain: { en: 'Rain', fa: '\u0628\u0627\u0631\u0627\u0646' },
      storm: { en: 'Storm', fa: '\u062a\u0648\u0641\u0627\u0646' },
      fog: { en: 'Fog', fa: '\u0645\u0647' },
      snow: { en: 'Snow', fa: '\u0628\u0631\u0641' },
      sandstorm: { en: 'Sandstorm', fa: '\u062a\u0648\u0641\u0627\u0646 \u0634\u0646' },
      ash: { en: 'Ash', fa: '\u062e\u0627\u06a9\u0633\u062a\u0631' },
      neon_haze: { en: 'Neon Haze', fa: '\u0647\u0627\u0644\u0647 \u0646\u0626\u0648\u0646' },
      aurora: { en: 'Aurora', fa: '\u0634\u0641\u0642 \u0642\u0637\u0628\u06cc' },
    };
    const e = map[this.current] || map.clear;
    return lang === 'fa' ? e.fa : e.en;
  }
}
