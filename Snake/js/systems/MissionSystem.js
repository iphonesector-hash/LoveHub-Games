const POOL = [
  { id: 'orbs', label: 'Collect 30 orbs', labelFa: '\u06f3\u06f0 \u06af\u0648\u06cc \u062c\u0645\u0639 \u06a9\u0646', target: 30, key: 'orbs', reward: 50 },
  { id: 'ai', label: 'Defeat 3 AI', labelFa: '\u06f3 \u0645\u0627\u0631 AI \u0634\u06a9\u0633\u062a \u0628\u062f\u0647', target: 3, key: 'kills', reward: 80 },
  { id: 'mass', label: 'Reach mass 25', labelFa: '\u062c\u0631\u0645 \u06f2\u06f5 \u0628\u0631\u0633', target: 25, key: 'mass', reward: 60 },
  { id: 'survive', label: 'Survive 120s', labelFa: '\u06f1\u06f2\u06f0 \u062b\u0627\u0646\u06cc\u0647 \u0632\u0646\u062f\u0647 \u0628\u0645\u0627\u0646', target: 120, key: 'time', reward: 55 },
  { id: 'crystal', label: 'Collect 6 crystals', labelFa: '\u06f6 \u06a9\u0631\u06cc\u0633\u062a\u0627\u0644', target: 6, key: 'crystals', reward: 70 },
  { id: 'combo', label: 'Reach combo x8', labelFa: '\u06a9\u0645\u0628\u0648 x8', target: 8, key: 'combo', reward: 65 },
  { id: 'power', label: 'Use 4 power-ups', labelFa: '\u06f4 \u067e\u0627\u0648\u0631\u0622\u067e', target: 4, key: 'powers', reward: 45 },
  { id: 'zones', label: 'Explore 4 zones', labelFa: '\u06f4 \u0645\u0646\u0637\u0642\u0647 \u06a9\u0634\u0641 \u06a9\u0646', target: 4, key: 'zones', reward: 50 },
  { id: 'distance', label: 'Travel 800 units', labelFa: '\u06f8\u06f0\u06f0 \u0648\u0627\u062d\u062f \u0633\u0641\u0631 \u06a9\u0646', target: 800, key: 'distance', reward: 60 },
];

export class MissionSystem {
  constructor(engine) {
    this.engine = engine;
    this.current = null;
    this.progress = 0;
    this.stats = { orbs: 0, kills: 0, crystals: 0, powers: 0, time: 0, zones: new Set(), distance: 0 };
    this._lastPos = null;
  }

  start() {
    this.stats = { orbs: 0, kills: 0, crystals: 0, powers: 0, time: 0, zones: new Set(), distance: 0 };
    this.current = { ...POOL[(Math.random() * POOL.length) | 0] };
    this.progress = 0;
    this._lastPos = null;
    this.engine.onMission?.(this._payload());
  }

  _payload() {
    if (!this.current) return null;
    return {
      label: this.current.label,
      labelFa: this.current.labelFa,
      progress: Math.floor(this.progress),
      target: this.current.target,
      done: this.progress >= this.current.target,
    };
  }

  track(key, amount = 1) {
    if (!this.current) return;
    if (key === this.current.key) {
      if (['mass', 'combo', 'time', 'distance'].includes(this.current.key)) this.progress = amount;
      else if (key === 'zones') this.progress = amount;
      else this.progress += amount;
      if (this.progress >= this.current.target) {
        this.engine.snake?.addScore(this.current.reward);
        this.engine.onScore?.(this.engine.snake.score, this.engine.snake.combo);
        this.engine.onMission?.({ ...this._payload(), done: true });
        setTimeout(() => { if (this.engine.state === 'playing') this.start(); }, 2500);
      } else {
        this.engine.onMission?.(this._payload());
      }
    }
  }

  update(dt) {
    if (!this.current || !this.engine.snake?.alive) return;
    this.stats.time += dt;
    const h = this.engine.snake.segments[0];
    if (this._lastPos) {
      this.stats.distance += Math.hypot(h.x - this._lastPos.x, h.z - this._lastPos.z);
    }
    this._lastPos = { x: h.x, z: h.z };
    if (this.current.key === 'time') this.track('time', this.stats.time);
    if (this.current.key === 'mass') this.track('mass', this.engine.snake.length);
    if (this.current.key === 'combo') this.track('combo', this.engine.snake.combo);
    if (this.current.key === 'distance') this.track('distance', this.stats.distance);
    if (this.current.key === 'zones') {
      const zone = this.engine.world?.getZoneAt?.(h.x, h.z);
      if (zone) this.stats.zones.add(zone);
      this.track('zones', this.stats.zones.size);
    }
  }

  reset() { this.current = null; this.progress = 0; }
}
