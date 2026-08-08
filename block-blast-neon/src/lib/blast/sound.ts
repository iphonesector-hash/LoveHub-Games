let ctx: AudioContext | null = null;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, gain = 0.08, type: OscillatorType = "sine") {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + start);
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.02);
}

export type SoundName = "place" | "clear" | "combo" | "invalid" | "win" | "lose";

export function playSound(name: SoundName) {
  switch (name) {
    case "place":
      tone(320, 0, 0.09, 0.05, "triangle");
      break;
    case "clear":
      [523, 659, 784].forEach((f, i) => tone(f, i * 0.05, 0.18, 0.06, "triangle"));
      break;
    case "combo":
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.045, 0.22, 0.06, "sawtooth"));
      break;
    case "invalid":
      tone(120, 0, 0.12, 0.05, "square");
      break;
    case "win":
      [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.11, 0.4, 0.07, "triangle"));
      break;
    case "lose":
      [392, 330, 262].forEach((f, i) => tone(f, i * 0.13, 0.35, 0.06, "sine"));
      break;
  }
}
