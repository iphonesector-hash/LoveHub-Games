/**
 * AudioManager — synthesized SFX via Web Audio API (no external assets required).
 * Handles mobile autoplay restrictions, volume settings, mute, and haptic feedback.
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = 0.7;
    this.musicVol = 0.45;
    this.sfxVol = 0.7;
    this.muteMusic = false;
    this.muteSfx = false;
    this.haptic = true;
    this._currentWorld = null;
    this._enabled = true;
    this._unlocked = false;
    try {
      const s = JSON.parse(localStorage.getItem('snake3d_audio') || '{}');
      if (s.master != null) this.master = s.master;
      if (s.musicVol != null) this.musicVol = s.musicVol;
      if (s.sfxVol != null) this.sfxVol = s.sfxVol;
      if (s.muteMusic != null) this.muteMusic = s.muteMusic;
      if (s.muteSfx != null) this.muteSfx = s.muteSfx;
      if (s.haptic != null) this.haptic = s.haptic;
    } catch {}
  }

  _ensure() {
    if (this.ctx) return true;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      return true;
    } catch {
      return false;
    }
  }

  /** Call on first user gesture to unlock audio on mobile */
  unlock() {
    if (this._unlocked) return;
    if (!this._ensure()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this._unlocked = true;
  }

  save() {
    localStorage.setItem('snake3d_audio', JSON.stringify({
      master: this.master, musicVol: this.musicVol, sfxVol: this.sfxVol,
      muteMusic: this.muteMusic, muteSfx: this.muteSfx, haptic: this.haptic,
    }));
  }

  setMaster(v) { this.master = Math.max(0, Math.min(1, v)); this.save(); }
  setMusicVol(v) { this.musicVol = Math.max(0, Math.min(1, v)); this.save(); }
  setSfxVol(v) { this.sfxVol = Math.max(0, Math.min(1, v)); this.save(); }
  setMuteMusic(m) { this.muteMusic = !!m; this.save(); }
  setMuteSfx(m) { this.muteSfx = !!m; this.save(); }
  setHaptic(h) { this.haptic = !!h; this.save(); }

  vibrate(pattern) {
    if (!this.haptic) return;
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch {}
  }

  playSfx(id) {
    if (!this._enabled || this.muteSfx || !this._ensure()) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const vol = this.master * this.sfxVol * 0.18;
      const map = {
        eat: [520, 0.06, 'sine'],
        crystal: [680, 0.08, 'sine'],
        star: [880, 0.1, 'sine'],
        power: [440, 0.12, 'triangle'],
        boost: [200, 0.05, 'sawtooth'],
        collision: [120, 0.1, 'sawtooth'],
        death: [90, 0.25, 'sawtooth'],
        loot: [600, 0.07, 'sine'],
        levelup: [660, 0.2, 'sine'],
        event: [300, 0.15, 'triangle'],
        click: [400, 0.04, 'sine'],
        mission: [520, 0.12, 'sine'],
        kill: [180, 0.14, 'sawtooth'],
        shield: [360, 0.1, 'triangle'],
        chest: [720, 0.15, 'sine'],
        teleport: [200, 0.12, 'sine'],
        bite: [150, 0.1, 'sawtooth'],
      };
      const [freq, dur, type] = map[id] || [350, 0.06, 'sine'];
      o.type = type;
      o.frequency.setValueAtTime(freq, now);
      if (id === 'levelup' || id === 'star' || id === 'chest') {
        o.frequency.linearRampToValueAtTime(freq * 1.5, now + dur);
      }
      if (id === 'death' || id === 'collision') {
        o.frequency.linearRampToValueAtTime(freq * 0.5, now + dur);
      }
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(now); o.stop(now + dur + 0.02);
    } catch {}

    // Haptics
    if (id === 'eat' || id === 'loot') this.vibrate(8);
    else if (id === 'power' || id === 'crystal' || id === 'star') this.vibrate(15);
    else if (id === 'kill' || id === 'bite') this.vibrate([10, 30, 20]);
    else if (id === 'collision') this.vibrate(30);
    else if (id === 'death') this.vibrate([40, 60, 80]);
    else if (id === 'chest' || id === 'levelup') this.vibrate([20, 40, 20]);
  }

  enterWorld(worldId) {
    this._currentWorld = worldId;
    this.playSfx('event');
  }

  resume() {
    this.unlock();
  }
}

export const audio = new AudioManager();
