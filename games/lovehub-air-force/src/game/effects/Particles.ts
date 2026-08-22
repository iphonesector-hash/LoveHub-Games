/* Pooled particles, debris, shockwaves and floating score text. */
import { Pool, rand, TAU } from "../utils";

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: "spark" | "smoke" | "shard" | "ring" | "glow";
  rot: number;
  spin: number;
  drag: number;
};

export type Floater = {
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
  text: string;
  color: string;
  size: number;
};

const newParticle = (): Particle => ({
  x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2,
  color: "#fff", kind: "spark", rot: 0, spin: 0, drag: 0.92,
});

export class ParticleSystem {
  pool = new Pool<Particle>(newParticle, (p) => { p.life = 0; }, 400);
  floaters = new Pool<Floater>(
    () => ({ x: 0, y: 0, vy: 0, life: 0, max: 1, text: "", color: "#fff", size: 14 }),
    (f) => { f.life = 0; },
    40,
  );
  reduced = false;

  private budget(n: number) {
    const cap = this.reduced ? 260 : 900;
    const room = Math.max(0, cap - this.pool.count);
    return Math.min(this.reduced ? Math.ceil(n * 0.4) : n, room);
  }

  emit(
    x: number, y: number, count: number,
    opts: Partial<Pick<Particle, "color" | "kind" | "size" | "drag">> & {
      speed?: number; spread?: number; dir?: number; life?: number;
    } = {},
  ) {
    const n = this.budget(count);
    for (let i = 0; i < n; i++) {
      const p = this.pool.spawn();
      const dir = (opts.dir ?? 0) + rand(-(opts.spread ?? Math.PI), opts.spread ?? Math.PI);
      const sp = (opts.speed ?? 120) * rand(0.35, 1.2);
      p.x = x; p.y = y;
      p.vx = Math.cos(dir) * sp;
      p.vy = Math.sin(dir) * sp;
      p.max = (opts.life ?? 0.6) * rand(0.7, 1.3);
      p.life = p.max;
      p.size = (opts.size ?? 3) * rand(0.6, 1.4);
      p.color = opts.color ?? "#ffd7a0";
      p.kind = opts.kind ?? "spark";
      p.rot = rand(0, TAU);
      p.spin = rand(-8, 8);
      p.drag = opts.drag ?? 0.9;
    }
  }

  ring(x: number, y: number, color: string, size = 40, life = 0.45) {
    const p = this.pool.spawn();
    p.x = x; p.y = y; p.vx = 0; p.vy = 0;
    p.max = life; p.life = life; p.size = size; p.color = color;
    p.kind = "ring"; p.rot = 0; p.spin = 0; p.drag = 1;
  }

  explosion(x: number, y: number, scale = 1, hue = "#ff9d5c") {
    this.ring(x, y, hue, 26 * scale, 0.4);
    this.emit(x, y, Math.round(18 * scale), { color: hue, speed: 190 * scale, size: 3.4 * scale, life: 0.55 });
    this.emit(x, y, Math.round(10 * scale), { color: "#fff3d6", speed: 260 * scale, size: 2 * scale, life: 0.3 });
    this.emit(x, y, Math.round(8 * scale), { color: "#4b3a54", kind: "smoke", speed: 60 * scale, size: 9 * scale, life: 1.1, drag: 0.94 });
    this.emit(x, y, Math.round(6 * scale), { color: "#8be9ff", kind: "shard", speed: 220 * scale, size: 5 * scale, life: 0.8, drag: 0.97 });
  }

  hitSpark(x: number, y: number, color = "#9ef7ff") {
    this.emit(x, y, 5, { color, speed: 130, size: 2, life: 0.22 });
  }

  text(x: number, y: number, text: string, color = "#ffffff", size = 14) {
    const f = this.floaters.spawn();
    f.x = x; f.y = y; f.vy = -46; f.max = 0.9; f.life = 0.9;
    f.text = text; f.color = color; f.size = size;
  }

  update(dt: number) {
    const a = this.pool.active;
    for (let i = a.length - 1; i >= 0; i--) {
      const p = a[i] as Particle;
      p.life -= dt;
      if (p.life <= 0) { this.pool.releaseAt(i); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d;
      if (p.kind === "smoke") p.vy -= 14 * dt;
      if (p.kind === "shard") p.vy += 90 * dt;
      p.rot += p.spin * dt;
    }
    const f = this.floaters.active;
    for (let i = f.length - 1; i >= 0; i--) {
      const o = f[i] as Floater;
      o.life -= dt;
      if (o.life <= 0) { this.floaters.releaseAt(i); continue; }
      o.y += o.vy * dt;
      o.vy *= Math.pow(0.94, dt * 60);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.pool.active) {
      const t = p.life / p.max;
      ctx.globalAlpha = Math.max(0, Math.min(1, t));
      if (p.kind === "ring") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * t + 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.6 - t), 0, TAU);
        ctx.stroke();
      } else if (p.kind === "shard") {
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 6, p.size, p.size / 3);
        ctx.restore();
      } else if (p.kind === "smoke") {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 0.35 * t;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (2 - t), 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = "lighter";
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * t + 0.4, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.textAlign = "center";
    for (const f of this.floaters.active) {
      const t = f.life / f.max;
      ctx.globalAlpha = Math.min(1, t * 1.6);
      ctx.font = `700 ${f.size}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 8;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  clear() {
    this.pool.clear();
    this.floaters.clear();
  }
}
