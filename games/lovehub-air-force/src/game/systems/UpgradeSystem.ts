/* Progression: Love Energy upgrades with a soft, non-grindy cost curve. */
import type { UpgradeKey } from "./SaveSystem";

export type UpgradeDef = {
  key: UpgradeKey;
  labelKey: "damage" | "fireRate" | "shieldMax" | "hullMax" | "missile" | "laser" | "energyCap";
  max: number;
  baseCost: number;
  /** Multiplier/absolute value applied per level. */
  perLevel: number;
  unit: string;
};

export const UPGRADES: UpgradeDef[] = [
  { key: "damage", labelKey: "damage", max: 8, baseCost: 120, perLevel: 0.12, unit: "%" },
  { key: "fireRate", labelKey: "fireRate", max: 8, baseCost: 130, perLevel: 0.06, unit: "%" },
  { key: "health", labelKey: "hullMax", max: 6, baseCost: 150, perLevel: 20, unit: "HP" },
  { key: "shield", labelKey: "shieldMax", max: 6, baseCost: 160, perLevel: 15, unit: "SP" },
  { key: "missile", labelKey: "missile", max: 5, baseCost: 180, perLevel: 0.18, unit: "%" },
  { key: "laser", labelKey: "laser", max: 5, baseCost: 180, perLevel: 0.18, unit: "%" },
  { key: "energy", labelKey: "energyCap", max: 5, baseCost: 140, perLevel: 20, unit: "EN" },
];

export const upgradeCost = (def: UpgradeDef, current: number) =>
  Math.round(def.baseCost * Math.pow(1.35, current));

export type DerivedStats = {
  maxHealth: number;
  maxShield: number;
  maxEnergy: number;
  damageMul: number;
  fireRateMul: number;
  missileMul: number;
  laserMul: number;
};

export function deriveStats(u: Record<UpgradeKey, number>): DerivedStats {
  return {
    maxHealth: 100 + u.health * 20,
    maxShield: 50 + u.shield * 15,
    maxEnergy: 100 + u.energy * 20,
    damageMul: 1 + u.damage * 0.12,
    fireRateMul: 1 + u.fireRate * 0.06,
    missileMul: 1 + u.missile * 0.18,
    laserMul: 1 + u.laser * 0.18,
  };
}
