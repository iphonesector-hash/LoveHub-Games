const EVENT_COOLDOWN = 40;
const EVENT_DURATION = 16;
const EVENTS = [
  { id: 'food_storm', label: 'FOOD STORM', labelFa: '\u0637\u0648\u0641\u0627\u0646 \u063a\u0630\u0627', color: '#3dffb5' },
  { id: 'ai_invasion', label: 'AI INVASION', labelFa: '\u0647\u062c\u0648\u0645 AI', color: '#ff6060' },
  { id: 'crystal_storm', label: 'CRYSTAL STORM', labelFa: '\u0637\u0648\u0641\u0627\u0646 \u06a9\u0631\u06cc\u0633\u062a\u0627\u0644', color: '#40f0d0' },
  { id: 'golden_zone', label: 'GOLDEN ZONE', labelFa: '\u0645\u0646\u0637\u0642\u0647 \u0637\u0644\u0627\u06cc\u06cc', color: '#ffd060' },
  { id: 'cyber_rush', label: 'CYBER RUSH', labelFa: '\u0647\u062c\u0648\u0645 \u0633\u0627\u06cc\u0628\u0631', color: '#2ee6ff' },
  { id: 'meteor', label: 'METEOR SHOWER', labelFa: '\u0628\u0627\u0631\u0634 \u0634\u0647\u0627\u0628', color: '#ff8040' },
  { id: 'boss_spawn', label: 'BOSS SPAWN', labelFa: '\u0638\u0647\u0648\u0631 \u0628\u0627\u0633', color: '#c060ff' },
  { id: 'treasure_hunt', label: 'TREASURE HUNT', labelFa: '\u0634\u06a9\u0627\u0631 \u06af\u0646\u062c', color: '#ffd060' },
  { id: 'fog', label: 'DENSE FOG', labelFa: '\u0645\u0647 \u063a\u0644\u06cc\u0638', color: '#a0b0c0' },
  { id: 'solar_storm', label: 'SOLAR STORM', labelFa: '\u0637\u0648\u0641\u0627\u0646 \u062e\u0648\u0631\u0634\u06cc\u062f\u06cc', color: '#ff9040' },
  { id: 'earthquake', label: 'EARTHQUAKE', labelFa: '\u0632\u0644\u0632\u0644\u0647', color: '#c08040' },
  { id: 'loot_rain', label: 'LOOT RAIN', labelFa: '\u0628\u0627\u0631\u0634 \u063a\u0646\u06cc\u0645\u062a', color: '#ffd060' },
  { id: 'double_xp', label: 'DOUBLE XP', labelFa: '\u0627\u06a9\u0633\u067e\u06cc \u062f\u0648\u0628\u0631\u0627\u0628\u0631', color: '#80ffe0' },
  { id: 'wild_hunt', label: 'WILD HUNT', labelFa: '\u0634\u06a9\u0627\u0631 \u0648\u062d\u0634\u06cc', color: '#ff6080' },
];

export class EventSystem {
  constructor(engine) {
    this.engine = engine;
    this.active = null;
    this.timer = 0;
    this.cooldown = 18;
    this.meteorT = 0;
    this.meteorPos = null;
  }

  update(dt) {
    if (this.active) {
      this.timer -= dt;
      if (this.active.id === 'meteor' && this.meteorPos) {
        this.meteorT -= dt;
        if (this.meteorT <= 0) {
          const { x, z } = this.meteorPos;
          this.engine._burst?.(x, z, 0xff4020, 16);
          const hx = this.engine.snake?.segments?.[0]?.x || 0;
          const hz = this.engine.snake?.segments?.[0]?.z || 0;
          if (Math.hypot(hx - x, hz - z) < 10) {
            if (this.engine.snake.hasShield()) this.engine.snake.effects.shield = 0;
            else if (!this.engine.snake.hasGhost()) this.engine.gameOver?.();
          }
          this.meteorPos = null;
        }
      }
      if (this.timer <= 0) this._end();
      return;
    }
    this.cooldown -= dt;
    if (this.cooldown <= 0 && Math.random() < 0.028) {
      const bias = this.engine.world?.def?.eventBias;
      if (bias) {
        const preferred = EVENTS.find((e) => e.id === bias);
        if (preferred && Math.random() < 0.55) { this._start(preferred); return; }
      }
      this._start(EVENTS[(Math.random() * EVENTS.length) | 0]);
    }
  }

  _start(ev) {
    this.active = { ...ev };
    this.timer = EVENT_DURATION + (ev.id === 'boss_spawn' ? 10 : 0);
    this.engine.onEvent?.(this.active);
    const e = this.engine;
    const hx = e.snake?.segments?.[0]?.x || 0;
    const hz = e.snake?.segments?.[0]?.z || 0;

    if (ev.id === 'food_storm' || ev.id === 'crystal_storm') {
      e.maxFood = Math.min(110, (e.maxFood || 60) + 35);
      e.spawnOpts = { ...(e.spawnOpts || {}), crystalBias: ev.id === 'crystal_storm' ? 0.45 : 0.12 };
    }
    if (ev.id === 'ai_invasion' || ev.id === 'boss_spawn') {
      e.maxAI = Math.min(18, (e.maxAI || 10) + 5);
    }
    if (ev.id === 'cyber_rush' && e.snake) {
      e.snake._baseSpeedMult = Math.max(e.snake._baseSpeedMult || 1, 1.35);
    }
    if (ev.id === 'meteor') {
      const ang = Math.random() * Math.PI * 2;
      const r = 15 + Math.random() * 25;
      this.meteorPos = { x: hx + Math.cos(ang) * r, z: hz + Math.sin(ang) * r };
      this.meteorT = 3.5;
      e.onToast?.({ text: 'METEOR INCOMING', color: '#ff6040' });
    }
    if (ev.id === 'treasure_hunt') {
      e.onToast?.({ text: 'TREASURE HUNT', color: '#ffd060' });
    }
  }

  _end() {
    this.active = null;
    this.cooldown = EVENT_COOLDOWN * (0.65 + Math.random() * 0.7);
    this.engine.onEvent?.(null);
    this.meteorPos = null;
    if (this.engine.snake) {
      const base = this.engine.world?.def?.speedBias || 1;
      if (this.engine.snake._baseSpeedMult > base * 1.1) this.engine.snake._baseSpeedMult = base;
    }
  }

  getScoreMult() {
    if (!this.active) return 1;
    if (this.active.id === 'golden_zone' || this.active.id === 'cyber_rush' || this.active.id === 'treasure_hunt' || this.active.id === 'loot_rain') return 2.2;
    if (this.active.id === 'food_storm' || this.active.id === 'double_xp') return 1.5;
    if (this.active.id === 'solar_storm') return 1.3;
    return 1;
  }

  reset() {
    this.active = null; this.timer = 0; this.cooldown = 22; this.meteorPos = null;
    this.engine.onEvent?.(null);
  }
}
