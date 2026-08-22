/* Power-up drops: visuals, movement and pickup effects. */
import type { PowerUp, PowerUpKind } from "../types";
import { Pool, TAU, rand, clamp } from "../utils";

export const POWERUP_STYLE: Record<PowerUpKind, { color: string; glyph: string; label: string }> = {
  weapon: { color: "#9ef7ff", glyph: "W", label: "Weapon Up" },
  shield: { color: "#5ad3ff", glyph: "S", label: "Shield" },
  health: { color: "#7dffa8", glyph: "+", label: "Hull Repair" },
  energy: { color: "#c58bff", glyph: "E", label: "Energy" },
  rapid: { color: "#ffd27a", glyph: "R", label: "Rapid Fire" },
  spread: { color: "#ffa8d8", glyph: "◈", label: "Spread" },
  missile: { color: "#ffb45c", glyph: "M", label: "Missiles" },
  multiplier: { color: "#ffe98a", glyph: "×", label: "Multiplier" },
  love: { color: "#ff7ab8", glyph: "♥", label: "Love Energy" },
};

const WEIGHTS: [PowerUpKind, number][] = [
  ["love", 30], ["weapon", 12], ["health", 10], ["shield", 10], ["energy", 9],
  ["rapid", 8], ["spread", 7], ["missile", 7], ["multiplier", 5],
];

export function rollDrop(): PowerUpKind {
  const total = WEIGHTS.reduce((a, b) => a + b[1], 0);
  let r = Math.random() * total;
  for (const [k, wgt] of WEIGHTS) {
    r -= wgt;
    if (r <= 0) return k;
  }
  return "love";
}

export class PowerUpSystem {
  pool = new Pool<PowerUp>(
    () => ({ x: 0, y: 0, vy: 0, vx: 0, kind: "love", t: 0, r: 14 }),
    () => undefined,
    24,
  );

  spawn(x: number, y: number, kind: PowerUpKind) {
    const p = this.pool.spawn();
    p.x = x; p.y = y; p.vy = rand(60, 110); p.vx = rand(-40, 40); p.kind = kind; p.t = 0; p.r = 15;
  }

  update(dt: number, h: number, magnet: { x: number; y: number; on: boolean }) {
    const a = this.pool.active;
    for (let i = a.length - 1; i >= 0; i--) {
      const p = a[i] as PowerUp;
      p.t += dt;
      if (magnet.on) {
        const dx = magnet.x - p.x;
        const dy = magnet.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 130) {
          p.vx += (dx / d) * 900 * dt;
          p.vy += (dy / d) * 900 * dt;
        }
      }
      p.vx *= Math.pow(0.985, dt * 60);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > h + 40) this.pool.releaseAt(i);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.pool.active) {
      const st = POWERUP_STYLE[p.kind];
      const pulse = 1 + Math.sin(p.t * 6) * 0.08;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 26 * pulse);
      g.addColorStop(0, `${st.color}cc`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 26 * pulse, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.rotate(Math.sin(p.t * 2) * 0.25);
      ctx.fillStyle = "rgba(8,12,28,0.92)";
      ctx.strokeStyle = st.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU - Math.PI / 2;
        const px = Math.cos(a) * 13 * pulse;
        const py = Math.sin(a) * 13 * pulse;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = st.color;
      ctx.font = "700 13px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(st.glyph, 0, 1);
      ctx.restore();
    }
  }

  clear() { this.pool.clear(); }
}

export const clampPct = (v: number) => clamp(v, 0, 1);
