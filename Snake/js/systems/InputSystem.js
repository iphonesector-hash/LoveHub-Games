/**
 * Full-screen touch steering — no on-screen joystick graphic
 */

const DEADZONE = 0.06;
const JOY_RADIUS = 72;
const SENS_KEY = 'snake3d_sensitivity';

export class InputSystem {
  constructor(container) {
    this.container = container || document.body;
    this.enabled = true;
    this.heading = { x: 0, z: -1 };
    this.magnitude = 0;
    this.boostHeld = false;
    this.analogActive = false;
    this.touch = { active: false, id: null, ox: 0, oy: 0 };
    this.side = localStorage.getItem('snake3d_joy_side') || 'right';
    this.sensitivity = parseFloat(localStorage.getItem(SENS_KEY) || '1') || 1;
    this._keys = new Set();
    this._bind();
    this._applySide();
  }

  _bind() {
    window.addEventListener('keydown', this._onKeyDown, { passive: false });
    window.addEventListener('keyup', this._onKeyUp, { passive: false });
    this.container.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.container.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.container.addEventListener('touchend', this._onTouchEnd, { passive: false });
    this.container.addEventListener('touchcancel', this._onTouchEnd, { passive: false });
    this.boostBtn = document.getElementById('btn-boost');
    if (this.boostBtn) {
      const down = (e) => { e.preventDefault(); e.stopPropagation(); if (!this.enabled) return; this.boostHeld = true; this.boostBtn.classList.add('active'); };
      const up = (e) => { e.preventDefault(); this.boostHeld = false; this.boostBtn.classList.remove('active'); };
      this.boostBtn.addEventListener('touchstart', down, { passive: false });
      this.boostBtn.addEventListener('touchend', up, { passive: false });
      this.boostBtn.addEventListener('touchcancel', up, { passive: false });
      this.boostBtn.addEventListener('mousedown', down);
      this.boostBtn.addEventListener('mouseup', up);
      this.boostBtn.addEventListener('mouseleave', up);
    }
  }

  _isUI(el) {
    if (!el?.closest) return false;
    return !!(el.closest('.screen') || el.closest('.hud-btn') || el.closest('#btn-boost') || el.closest('.btn') || el.closest('.lang-btn') || el.closest('.panel') || el.closest('.menu-content'));
  }

  _applySide() {
    if (!this.boostBtn) return;
    this.boostBtn.classList.toggle('side-left', this.side === 'left');
  }

  setSensitivity(v) {
    this.sensitivity = Math.max(0.5, Math.min(1.5, Number(v) || 1));
    localStorage.setItem(SENS_KEY, String(this.sensitivity));
  }

  _onTouchStart = (e) => {
    if (!this.enabled) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (this._isUI(document.elementFromPoint(t.clientX, t.clientY))) continue;
      e.preventDefault();
      if (this.touch.active) continue;
      this.touch.active = true;
      this.touch.id = t.identifier;
      this.touch.ox = t.clientX;
      this.touch.oy = t.clientY;
      this.analogActive = true;
      this._updateFromTouch(t.clientX, t.clientY, false);
    }
  };

  _onTouchMove = (e) => {
    if (!this.enabled || !this.touch.active) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== this.touch.id) continue;
      e.preventDefault();
      this._updateFromTouch(t.clientX, t.clientY, true);
    }
  };

  _onTouchEnd = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier !== this.touch.id) continue;
      e.preventDefault();
      this.touch.active = false;
      this.touch.id = null;
      this.analogActive = false;
      this.magnitude = 0;
    }
  };

  _updateFromTouch(cx, cy, follow) {
    let dx = cx - this.touch.ox;
    let dy = cy - this.touch.oy;
    const dist = Math.hypot(dx, dy);
    const max = JOY_RADIUS;
    if (follow && dist > max * 1.25) {
      const s = (dist - max) / dist;
      this.touch.ox += dx * s * 0.5;
      this.touch.oy += dy * s * 0.5;
      dx = cx - this.touch.ox;
      dy = cy - this.touch.oy;
    }
    const d2 = Math.hypot(dx, dy);
    const norm = Math.min(1, d2 / max);
    if (norm < DEADZONE) { this.magnitude = 0; return; }
    const t = (norm - DEADZONE) / (1 - DEADZONE);
    const mag = t * t * (3 - 2 * t);
    const len = Math.hypot(dx, dy) || 1;
    this.heading = { x: dx / len, z: dy / len };
    this.magnitude = Math.min(1, Math.max(0.45, mag) * this.sensitivity);
  }

  _onKeyDown = (e) => {
    if (!this.enabled) return;
    const c = e.code;
    if (['ArrowUp','KeyW','ArrowDown','KeyS','ArrowLeft','KeyA','ArrowRight','KeyD'].includes(c)) {
      e.preventDefault(); this._keys.add(c); this._syncKeys();
    }
    if (c === 'Space' || c === 'ShiftLeft' || c === 'ShiftRight') { e.preventDefault(); this.boostHeld = true; }
  };

  _onKeyUp = (e) => {
    this._keys.delete(e.code); this._syncKeys();
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.boostHeld = false; this.boostBtn?.classList.remove('active');
    }
  };

  _syncKeys() {
    if (this.analogActive) return;
    let x = 0, z = 0;
    if (this._keys.has('ArrowUp') || this._keys.has('KeyW')) z -= 1;
    if (this._keys.has('ArrowDown') || this._keys.has('KeyS')) z += 1;
    if (this._keys.has('ArrowLeft') || this._keys.has('KeyA')) x -= 1;
    if (this._keys.has('ArrowRight') || this._keys.has('KeyD')) x += 1;
    if (x === 0 && z === 0) { this.magnitude = 0; return; }
    const len = Math.hypot(x, z) || 1;
    this.heading = { x: x / len, z: z / len };
    this.magnitude = this.sensitivity;
  }

  update() {}
  getHeading() { return this.heading; }
  getMagnitude() { return this.magnitude; }
  isBoosting() { return this.boostHeld; }
  setEnabled(v) {
    this.enabled = v;
    if (!v) {
      this.boostHeld = false; this.magnitude = 0; this.analogActive = false;
      this.touch.active = false; this._keys.clear(); this.boostBtn?.classList.remove('active');
    }
  }
  showControls(show) { this.boostBtn?.classList.toggle('hidden', !show); }
  getDirection() { return this.heading; }
  isAnalog() { return this.analogActive; }
  showJoystick(show) { this.showControls(show); }
  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.container.removeEventListener('touchstart', this._onTouchStart);
    this.container.removeEventListener('touchmove', this._onTouchMove);
    this.container.removeEventListener('touchend', this._onTouchEnd);
    this.container.removeEventListener('touchcancel', this._onTouchEnd);
  }
}
