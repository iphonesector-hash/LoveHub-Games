/* Layered animated backgrounds per level environment. */
import { rand, TAU } from "../utils";

export type EnvKind = "city" | "storm" | "nebula";

type Star = { x: number; y: number; z: number; s: number };
type Cloud = { x: number; y: number; w: number; h: number; a: number; sp: number };
type Building = { x: number; w: number; h: number; lights: number };

export class Background {
  private stars: Star[] = [];
  private clouds: Cloud[] = [];
  private buildings: Building[] = [];
  private t = 0;
  private lightning = 0;
  private nextBolt = 3;
  kind: EnvKind = "nebula";
  w = 0;
  h = 0;

  configure(kind: EnvKind, w: number, h: number) {
    this.kind = kind;
    this.resize(w, h);
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.stars = Array.from({ length: 130 }, () => ({
      x: rand(0, w), y: rand(0, h), z: rand(0.25, 1), s: rand(0.6, 2.1),
    }));
    this.clouds = Array.from({ length: 14 }, () => ({
      x: rand(-0.2 * w, 1.2 * w), y: rand(0, h), w: rand(w * 0.35, w * 0.9),
      h: rand(h * 0.06, h * 0.16), a: rand(0.05, 0.18), sp: rand(20, 70),
    }));
    let x = -40;
    this.buildings = [];
    while (x < w + 60) {
      const bw = rand(28, 74);
      this.buildings.push({ x, w: bw, h: rand(h * 0.12, h * 0.4), lights: Math.floor(rand(4, 16)) });
      x += bw + rand(6, 26);
    }
  }

  update(dt: number, speed: number) {
    this.t += dt;
    for (const s of this.stars) {
      s.y += (30 + s.z * 190) * s.z * dt * speed;
      if (s.y > this.h + 4) { s.y = -4; s.x = rand(0, this.w); }
    }
    for (const c of this.clouds) {
      c.y += c.sp * dt * speed;
      if (c.y - c.h > this.h) { c.y = -c.h * 2; c.x = rand(-0.2 * this.w, 1.2 * this.w); }
    }
    if (this.kind === "storm") {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) { this.lightning = 0.32; this.nextBolt = rand(2.4, 6.5); }
      if (this.lightning > 0) this.lightning -= dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { w, h } = this;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    if (this.kind === "city") {
      g.addColorStop(0, "#060a1c");
      g.addColorStop(0.55, "#0d1636");
      g.addColorStop(1, "#1b1338");
    } else if (this.kind === "storm") {
      g.addColorStop(0, "#04070f");
      g.addColorStop(0.6, "#0a1122");
      g.addColorStop(1, "#131a2c");
    } else {
      g.addColorStop(0, "#05030f");
      g.addColorStop(0.5, "#0c0626");
      g.addColorStop(1, "#160a2e");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    if (this.kind === "nebula") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const blobs: [number, number, number, string][] = [
        [w * 0.25, h * 0.3 + Math.sin(this.t * 0.2) * 30, w * 0.5, "rgba(120,60,200,0.16)"],
        [w * 0.8, h * 0.65 + Math.cos(this.t * 0.17) * 40, w * 0.55, "rgba(0,190,190,0.13)"],
        [w * 0.5, h * 0.95, w * 0.7, "rgba(230,70,140,0.10)"],
      ];
      for (const [bx, by, br, col] of blobs) {
        const rg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        rg.addColorStop(0, col);
        rg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // Stars / rain streaks
    ctx.save();
    if (this.kind === "storm") {
      ctx.strokeStyle = "rgba(150,190,255,0.35)";
      ctx.lineWidth = 1;
      for (const s of this.stars) {
        ctx.globalAlpha = s.z * 0.6;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - 4, s.y + 18 * s.z + 8);
        ctx.stroke();
      }
    } else {
      for (const s of this.stars) {
        ctx.globalAlpha = 0.25 + s.z * 0.75;
        ctx.fillStyle = s.z > 0.75 ? "#cfe9ff" : "#8ea6c8";
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }
    }
    ctx.restore();

    if (this.kind === "city") {
      ctx.save();
      ctx.globalAlpha = 0.55;
      for (const b of this.buildings) {
        const y = h - b.h + ((this.t * 26) % (h + 400)) - 0;
        ctx.fillStyle = "#0a1130";
        ctx.fillRect(b.x, y, b.w, b.h + 400);
        ctx.fillStyle = "rgba(120,220,255,0.55)";
        for (let i = 0; i < b.lights; i++) {
          const lx = b.x + 5 + ((i * 13) % Math.max(6, b.w - 10));
          const ly = y + 10 + ((i * 29) % Math.max(10, b.h - 14));
          if ((i + Math.floor(this.t * 2)) % 5 !== 0) ctx.fillRect(lx, ly, 3, 4);
        }
      }
      ctx.restore();
    }

    if (this.kind !== "nebula") {
      ctx.save();
      for (const c of this.clouds) {
        ctx.globalAlpha = c.a;
        ctx.fillStyle = this.kind === "storm" ? "#5f6f92" : "#7f8fd6";
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    if (this.lightning > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.5, this.lightning * 1.6);
      ctx.fillStyle = "#cddcff";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // Vignette keeps gameplay readable against bright effects.
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
}
