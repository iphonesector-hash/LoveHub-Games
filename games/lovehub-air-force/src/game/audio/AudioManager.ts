/* Procedural WebAudio manager: no binary assets, respects autoplay policy. */

type SfxName =
  | "shoot"
  | "laser"
  | "missile"
  | "burst"
  | "hit"
  | "explode"
  | "bigExplode"
  | "powerup"
  | "damage"
  | "ui"
  | "bossWarn"
  | "victory"
  | "defeat";

export class AudioManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  private musicTimer: number | null = null;
  private lastPlay: Record<string, number> = {};
  musicVolume = 0.5;
  sfxVolume = 0.7;
  private unlocked = false;

  /** Must be called from a user gesture. */
  unlock() {
    if (this.unlocked) return;
    const AC =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume * 0.35;
    this.sfxGain.gain.value = this.sfxVolume;
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.ctx.destination);
    this.unlocked = true;
    void this.ctx.resume();
  }

  setMusicVolume(v: number) {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = v * 0.35;
  }
  setSfxVolume(v: number) {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    slideTo?: number,
  ) {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol: number, filterFreq: number) {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filt).connect(g).connect(this.sfxGain);
    src.start();
  }

  play(name: SfxName) {
    if (!this.ctx || this.sfxVolume <= 0) return;
    const now = performance.now();
    const gap = name === "shoot" || name === "hit" ? 45 : 20;
    if ((this.lastPlay[name] ?? 0) + gap > now) return;
    this.lastPlay[name] = now;
    switch (name) {
      case "shoot":
        this.tone(880, 0.06, "square", 0.05, 420);
        break;
      case "laser":
        this.tone(1400, 0.12, "sawtooth", 0.05, 700);
        break;
      case "missile":
        this.tone(220, 0.2, "triangle", 0.07, 90);
        break;
      case "burst":
        this.tone(160, 0.35, "sine", 0.12, 60);
        this.noise(0.35, 0.15, 1800);
        break;
      case "hit":
        this.noise(0.05, 0.08, 4000);
        break;
      case "explode":
        this.noise(0.35, 0.28, 1200);
        this.tone(140, 0.3, "sine", 0.12, 50);
        break;
      case "bigExplode":
        this.noise(0.9, 0.4, 900);
        this.tone(90, 0.9, "sine", 0.2, 35);
        break;
      case "powerup":
        this.tone(520, 0.1, "sine", 0.1, 900);
        this.tone(780, 0.18, "sine", 0.08, 1300);
        break;
      case "damage":
        this.tone(200, 0.25, "sawtooth", 0.12, 70);
        break;
      case "ui":
        this.tone(660, 0.06, "sine", 0.06, 880);
        break;
      case "bossWarn":
        this.tone(120, 0.7, "sawtooth", 0.12, 240);
        break;
      case "victory":
        [523, 659, 784, 1047].forEach((f, i) =>
          window.setTimeout(() => this.tone(f, 0.35, "triangle", 0.11), i * 130),
        );
        break;
      case "defeat":
        [440, 349, 262, 196].forEach((f, i) =>
          window.setTimeout(() => this.tone(f, 0.45, "sine", 0.12), i * 170),
        );
        break;
      default:
        break;
    }
  }

  /** Simple evolving pad + arpeggio loop keyed to a level's tonic. */
  startMusic(tonic = 110) {
    if (!this.ctx || !this.musicGain) return;
    this.stopMusic();
    const ctx = this.ctx;
    const makePad = (f: number, type: OscillatorType, vol: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = f;
      g.gain.value = vol;
      osc.connect(g).connect(this.musicGain as GainNode);
      osc.start();
      this.musicNodes.push({ osc, gain: g });
    };
    makePad(tonic, "sine", 0.22);
    makePad(tonic * 1.5, "sine", 0.1);
    makePad(tonic * 2, "triangle", 0.05);

    const scale = [0, 3, 5, 7, 10, 12];
    let step = 0;
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain) return;
      const semi = scale[step % scale.length] as number;
      const f = tonic * 4 * Math.pow(2, semi / 12);
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      osc.connect(g).connect(this.musicGain);
      osc.start(t0);
      osc.stop(t0 + 0.55);
      step += Math.random() < 0.3 ? 2 : 1;
    }, 420);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicNodes.forEach(({ osc, gain }) => {
      try {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      } catch {
        /* already stopped */
      }
    });
    this.musicNodes = [];
  }

  dispose() {
    this.stopMusic();
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
    this.unlocked = false;
  }
}

export const audio = new AudioManager();
