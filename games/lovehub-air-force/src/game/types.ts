/* Shared entity types. */

export type Bullet = {
  x: number; y: number; vx: number; vy: number; r: number;
  dmg: number; color: string; kind: string; life: number;
  homing: number; pierce: number; hitIds: number[]; trail: number;
  wave: number; t: number; baseVx: number;
};

export type Enemy = {
  id: number;
  x: number; y: number; vx: number; vy: number; r: number;
  hp: number; maxHp: number; dmg: number; score: number;
  typeId: string; art: string; color: string;
  t: number; hitT: number; angle: number; fireT: number; fireEvery: number;
  pattern: string; px: number; py: number; amp: number; freq: number; phase: number;
  alive: boolean; shielded: boolean; drop: number; energy: number;
};

export type PowerUp = {
  x: number; y: number; vy: number; vx: number; kind: PowerUpKind; t: number; r: number;
};

export type PowerUpKind =
  | "weapon" | "shield" | "health" | "energy" | "rapid" | "spread" | "missile" | "multiplier" | "love";
