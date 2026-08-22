/* Shared math + pooling helpers for LoveHub Air Force. */

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)] as T;
export const TAU = Math.PI * 2;

/** Generic object pool: avoids per-frame allocations in the game loop. */
export class Pool<T> {
  private free: T[] = [];
  public active: T[] = [];
  constructor(
    private factory: () => T,
    private reset: (o: T) => void,
    prealloc = 0,
  ) {
    for (let i = 0; i < prealloc; i++) this.free.push(factory());
  }
  spawn(): T {
    const o = this.free.pop() ?? this.factory();
    this.reset(o);
    this.active.push(o);
    return o;
  }
  /** Remove by index (swap-pop, O(1)). */
  releaseAt(i: number) {
    const o = this.active[i] as T;
    const last = this.active.pop() as T;
    if (i < this.active.length) this.active[i] = last;
    this.free.push(o);
  }
  clear() {
    while (this.active.length) this.free.push(this.active.pop() as T);
  }
  get count() {
    return this.active.length;
  }
}

export function circleHit(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
) {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy <= r * r;
}
