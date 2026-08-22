/* Wave scheduler: turns LevelConfig waves into positioned formations. */
import type { LevelConfig, Wave, Formation } from "../levels/levels";
import { rand } from "../utils";

export type SpawnFn = (
  typeId: string,
  x: number,
  y: number,
  opts: { anchorX: number; anchorY: number; speed: number; hpMul: number; amp: number; phase: number },
) => void;

export class EnemyManager {
  private waves: Wave[] = [];
  private index = 0;
  private timer = 0;
  private waitingClear = false;
  finished = false;
  difficulty = 1;

  start(level: LevelConfig) {
    this.waves = level.waves;
    this.difficulty = level.difficulty;
    this.index = 0;
    this.timer = this.waves[0]?.delay ?? 1;
    this.waitingClear = false;
    this.finished = false;
  }

  get waveNumber() {
    return Math.min(this.index + 1, this.waves.length);
  }
  get waveTotal() {
    return this.waves.length;
  }

  update(dt: number, aliveEnemies: number, spawn: SpawnFn, w: number, h: number) {
    if (this.finished) return;
    if (this.waitingClear) {
      if (aliveEnemies === 0) this.finished = true;
      return;
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    const wave = this.waves[this.index] as Wave | undefined;
    if (!wave) { this.waitingClear = true; return; }
    this.spawnWave(wave, spawn, w, h);
    this.index++;
    const next = this.waves[this.index];
    if (!next) this.waitingClear = true;
    else this.timer = next.delay;
    if (wave.clearRequired) this.waitingClear = true;
  }

  private positions(f: Formation, n: number, w: number, h: number): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    const m = Math.max(1, n);
    const pad = Math.min(70, w * 0.14);
    switch (f) {
      case "vee":
        for (let i = 0; i < m; i++) {
          const k = i - (m - 1) / 2;
          out.push({ x: w / 2 + k * (w * 0.11), y: -60 - Math.abs(k) * 44 });
        }
        break;
      case "arc":
        for (let i = 0; i < m; i++) {
          const a = Math.PI * (0.18 + (0.64 * i) / Math.max(1, m - 1));
          out.push({ x: w / 2 - Math.cos(a) * (w * 0.36), y: -50 - Math.sin(a) * 60 });
        }
        break;
      case "sides":
        for (let i = 0; i < m; i++) {
          const left = i % 2 === 0;
          out.push({ x: left ? -40 : w + 40, y: -30 + i * 46 });
        }
        break;
      case "columns":
        for (let i = 0; i < m; i++) {
          const col = i % 3;
          out.push({ x: pad + (col * (w - pad * 2)) / 2, y: -60 - Math.floor(i / 3) * 80 });
        }
        break;
      case "spiral":
        for (let i = 0; i < m; i++) {
          const a = (i / m) * Math.PI * 2;
          out.push({ x: w / 2 + Math.cos(a) * w * 0.3, y: -70 - Math.sin(a) * 70 });
        }
        break;
      case "single":
        out.push({ x: w / 2, y: -70 });
        break;
      case "line":
      default:
        for (let i = 0; i < m; i++) out.push({ x: pad + ((w - pad * 2) * i) / Math.max(1, m - 1), y: -60 });
        break;
    }
    return out;
  }

  private spawnWave(wave: Wave, spawn: SpawnFn, w: number, h: number) {
    const pts = this.positions(wave.formation, wave.count, w, h);
    pts.forEach((p, i) => {
      const anchorY = Math.min(h * 0.42, 90 + (i % 3) * 52 + rand(0, 30));
      spawn(wave.type, p.x, p.y, {
        anchorX: p.x,
        anchorY,
        speed: (wave.speed ?? 95) * (0.9 + this.difficulty * 0.15),
        hpMul: (wave.hpMul ?? 1) * this.difficulty,
        amp: rand(20, 70),
        phase: rand(0, Math.PI * 2),
      });
    });
  }
}
