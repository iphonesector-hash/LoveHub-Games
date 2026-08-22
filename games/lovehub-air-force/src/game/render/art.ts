/* Vector ship / enemy / boss art. Original silhouettes, no placeholder boxes. */
import { TAU } from "../utils";

export function drawPlayerShip(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, roll: number, thrust: number, t: number, invuln: boolean, shield: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(roll * 0.5);
  ctx.scale(1 - Math.abs(roll) * 0.12, 1);

  // Engine plume
  const plume = 16 + thrust * 16 + Math.sin(t * 40) * 3;
  const eg = ctx.createLinearGradient(0, 12, 0, 12 + plume);
  eg.addColorStop(0, "rgba(140,255,255,0.95)");
  eg.addColorStop(0.4, "rgba(90,190,255,0.55)");
  eg.addColorStop(1, "rgba(120,60,255,0)");
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.moveTo(-7, 12);
  ctx.lineTo(7, 12);
  ctx.lineTo(0, 12 + plume);
  ctx.closePath();
  ctx.fill();

  // Wings
  ctx.fillStyle = "#1a2352";
  ctx.strokeStyle = "rgba(150,230,255,0.8)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(9, -4);
  ctx.lineTo(24, 8);
  ctx.lineTo(20, 15);
  ctx.lineTo(7, 12);
  ctx.lineTo(0, 18);
  ctx.lineTo(-7, 12);
  ctx.lineTo(-20, 15);
  ctx.lineTo(-24, 8);
  ctx.lineTo(-9, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Fuselage highlight
  const fg = ctx.createLinearGradient(0, -24, 0, 18);
  fg.addColorStop(0, "#e8f6ff");
  fg.addColorStop(0.45, "#5f7fd6");
  fg.addColorStop(1, "#23205c");
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(5, -2);
  ctx.lineTo(3, 14);
  ctx.lineTo(-3, 14);
  ctx.lineTo(-5, -2);
  ctx.closePath();
  ctx.fill();

  // Love-core cockpit
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const cg = ctx.createRadialGradient(0, -6, 0, 0, -6, 9);
  cg.addColorStop(0, "rgba(255,120,190,0.95)");
  cg.addColorStop(1, "rgba(255,80,160,0)");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, -6, 9, 0, TAU);
  ctx.fill();
  ctx.restore();

  if (invuln) {
    ctx.globalAlpha = 0.35 + Math.sin(t * 30) * 0.25;
    ctx.strokeStyle = "#ffd9ec";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  if (shield > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 4);
    const sg = ctx.createRadialGradient(x, y, 12, x, y, 34);
    sg.addColorStop(0, "rgba(90,220,255,0)");
    sg.addColorStop(0.7, "rgba(90,220,255,0.35)");
    sg.addColorStop(1, "rgba(160,120,255,0)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(x, y, 34, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

type EnemyLike = {
  x: number; y: number; r: number; art: string; hitT: number; angle: number; t: number; color: string;
};

export function drawEnemy(ctx: CanvasRenderingContext2D, e: EnemyLike) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  const s = e.r / 16;
  ctx.scale(s, s);
  const base = e.color;
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = "rgba(255,255,255,0.5)";

  switch (e.art) {
    case "scout":
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.moveTo(0, 16); ctx.lineTo(13, -6); ctx.lineTo(5, -12); ctx.lineTo(0, -4);
      ctx.lineTo(-5, -12); ctx.lineTo(-13, -6);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case "fighter":
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.moveTo(0, 18); ctx.lineTo(16, 2); ctx.lineTo(9, -14); ctx.lineTo(0, -8);
      ctx.lineTo(-9, -14); ctx.lineTo(-16, 2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(-2, -2, 4, 9);
      break;
    case "heavy":
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.moveTo(0, 17); ctx.lineTo(18, 8); ctx.lineTo(20, -8); ctx.lineTo(8, -16);
      ctx.lineTo(-8, -16); ctx.lineTo(-20, -8); ctx.lineTo(-18, 8);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(20,20,40,0.85)";
      ctx.fillRect(-12, -6, 6, 14);
      ctx.fillRect(6, -6, 6, 14);
      break;
    case "bomber":
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 18, 0, 0, TAU);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,180,90,0.9)";
      ctx.beginPath(); ctx.arc(0, 4, 5, 0, TAU); ctx.fill();
      break;
    case "drone":
      ctx.fillStyle = base;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const px = Math.cos(a) * 14;
        const py = Math.sin(a) * 14;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(120,255,220,0.8)";
      ctx.beginPath(); ctx.arc(0, 0, 9 + Math.sin(e.t * 6) * 1.5, 0, TAU); ctx.stroke();
      break;
    case "turret":
      ctx.fillStyle = base;
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(20,25,45,0.9)";
      ctx.fillRect(-3, 0, 6, 20);
      ctx.fillStyle = "rgba(255,120,120,0.9)";
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
      break;
    case "kamikaze":
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.moveTo(0, 20); ctx.lineTo(11, -10); ctx.lineTo(0, -3); ctx.lineTo(-11, -10);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(255,90,60,0.7)";
      ctx.beginPath(); ctx.arc(0, -2, 7 + Math.sin(e.t * 20) * 2, 0, TAU); ctx.fill();
      ctx.restore();
      break;
    case "elite":
    default:
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.moveTo(0, 20); ctx.lineTo(10, 6); ctx.lineTo(22, 0); ctx.lineTo(12, -8);
      ctx.lineTo(6, -18); ctx.lineTo(0, -10); ctx.lineTo(-6, -18); ctx.lineTo(-12, -8);
      ctx.lineTo(-22, 0); ctx.lineTo(-10, 6);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(200,120,255,0.6)";
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
      ctx.restore();
      break;
  }

  if (e.hitT > 0) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(1, e.hitT * 6);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawBoss(
  ctx: CanvasRenderingContext2D,
  b: { x: number; y: number; r: number; art: string; hitT: number; t: number; phase: number; hp: number; maxHp: number },
) {
  ctx.save();
  ctx.translate(b.x, b.y);
  const s = b.r / 60;
  ctx.scale(s, s);
  const dmg = 1 - b.hp / b.maxHp;
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(255,255,255,0.45)";

  if (b.art === "citadel") {
    const g = ctx.createLinearGradient(0, -60, 0, 60);
    g.addColorStop(0, "#2b3a72");
    g.addColorStop(1, "#101634");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 60); ctx.lineTo(46, 26); ctx.lineTo(70, -10); ctx.lineTo(40, -44);
    ctx.lineTo(0, -30); ctx.lineTo(-40, -44); ctx.lineTo(-70, -10); ctx.lineTo(-46, 26);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(10,14,32,0.9)";
    ctx.fillRect(-56, -14, 22, 40);
    ctx.fillRect(34, -14, 22, 40);
  } else if (b.art === "tempest") {
    const g = ctx.createLinearGradient(0, -60, 0, 60);
    g.addColorStop(0, "#0f3c46");
    g.addColorStop(1, "#08202c");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, 78, 46, 0, 0, TAU);
    ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.rotate(b.t * 1.4);
    ctx.strokeStyle = "rgba(120,240,255,0.8)";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 56 - i * 12, 22 - i * 5, (i * Math.PI) / 3, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    const g = ctx.createLinearGradient(0, -70, 0, 70);
    g.addColorStop(0, "#4a1d64");
    g.addColorStop(1, "#150a2a");
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const rr = i % 2 === 0 ? 76 : 44;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr * 0.8;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  // Core glows brighter as phases escalate
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const cr = 22 + b.phase * 5 + Math.sin(b.t * 5) * 3;
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, cr);
  const coreCol = b.phase >= 3 ? "255,70,90" : b.phase === 2 ? "255,150,80" : "255,110,190";
  cg.addColorStop(0, `rgba(${coreCol},0.95)`);
  cg.addColorStop(1, `rgba(${coreCol},0)`);
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(0, 0, cr, 0, TAU); ctx.fill();
  ctx.restore();

  // Damage scarring
  if (dmg > 0.35) {
    ctx.strokeStyle = `rgba(255,120,60,${Math.min(0.85, dmg)})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 14);
      ctx.lineTo(Math.cos(a) * 60, Math.sin(a) * 34);
      ctx.stroke();
    }
  }

  if (b.hitT > 0) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(0.8, b.hitT * 5);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(0, 0, 70, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
