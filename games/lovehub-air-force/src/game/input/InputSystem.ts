/* Unified pointer / touch / keyboard input. Mobile drag is the primary path. */

export class InputSystem {
  target: HTMLElement | null = null;
  pointerActive = false;
  /** Desired position in CSS pixels relative to canvas. */
  x = 0;
  y = 0;
  hasTarget = false;
  keys = new Set<string>();
  sensitivity = 1;
  private grabOffsetX = 0;
  private grabOffsetY = 0;
  private getShipPos: () => { x: number; y: number } = () => ({ x: 0, y: 0 });

  attach(el: HTMLElement, getShipPos: () => { x: number; y: number }) {
    this.detach();
    this.target = el;
    this.getShipPos = getShipPos;
    el.addEventListener("pointerdown", this.onDown, { passive: false });
    window.addEventListener("pointermove", this.onMove, { passive: false });
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  detach() {
    const el = this.target;
    if (el) el.removeEventListener("pointerdown", this.onDown);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("pointercancel", this.onUp);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.target = null;
    this.pointerActive = false;
    this.hasTarget = false;
    this.keys.clear();
  }

  private local(e: PointerEvent) {
    const r = (this.target as HTMLElement).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown = (e: PointerEvent) => {
    e.preventDefault();
    const p = this.local(e);
    const ship = this.getShipPos();
    const dx = ship.x - p.x;
    const dy = ship.y - p.y;
    // Grab-relative when starting near the ship, absolute otherwise.
    const near = dx * dx + dy * dy < 120 * 120;
    this.grabOffsetX = near ? dx : 0;
    this.grabOffsetY = near ? dy : Math.min(0, dy);
    this.pointerActive = true;
    this.hasTarget = true;
    this.x = p.x + this.grabOffsetX;
    this.y = p.y + this.grabOffsetY;
  };

  private onMove = (e: PointerEvent) => {
    if (!this.pointerActive || !this.target) return;
    e.preventDefault();
    const p = this.local(e);
    this.x = p.x + this.grabOffsetX * this.sensitivity;
    this.y = p.y + this.grabOffsetY * this.sensitivity;
  };

  private onUp = () => {
    this.pointerActive = false;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    this.keys.add(e.key.toLowerCase());
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  /** Keyboard axis, -1..1 */
  axis() {
    const k = this.keys;
    const x = (k.has("arrowright") || k.has("d") ? 1 : 0) - (k.has("arrowleft") || k.has("a") ? 1 : 0);
    const y = (k.has("arrowdown") || k.has("s") ? 1 : 0) - (k.has("arrowup") || k.has("w") ? 1 : 0);
    return { x, y };
  }
}
