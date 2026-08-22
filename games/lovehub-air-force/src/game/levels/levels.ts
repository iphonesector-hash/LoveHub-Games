/* Data-driven level definitions. Adding Level 4 = adding an entry here. */
import type { EnvKind } from "../effects/Background";

export type Formation = "line" | "vee" | "arc" | "sides" | "columns" | "spiral" | "single";

export type Wave = {
  type: string;
  count: number;
  formation: Formation;
  /** Seconds to wait after the previous wave starts before spawning. */
  delay: number;
  speed?: number;
  hpMul?: number;
  /** Wait for the field to be clear before advancing past this wave. */
  clearRequired?: boolean;
};

export type BossConfig = {
  id: string;
  name: string;
  art: "citadel" | "tempest" | "eidolon";
  hp: number;
  r: number;
  reward: number;
  phases: {
    /** Fraction of max HP at which the phase begins. */
    from: number;
    attacks: ("fan" | "aimed" | "sweep" | "ring" | "laserRain" | "spiral" | "minions")[];
    interval: number;
    speed: number;
  }[];
};

export type LevelConfig = {
  id: number;
  key: string;
  name: string;
  subtitle: string;
  env: EnvKind;
  tonic: number;
  scrollSpeed: number;
  difficulty: number;
  waves: Wave[];
  boss: BossConfig;
};

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    key: "first-flight",
    name: "First Flight",
    subtitle: "Skyline patrol over the Lumen District",
    env: "city",
    tonic: 110,
    scrollSpeed: 1,
    difficulty: 1,
    waves: [
      { type: "scout", count: 5, formation: "line", delay: 1.2, speed: 90 },
      { type: "scout", count: 6, formation: "vee", delay: 5, speed: 100 },
      { type: "fighter", count: 4, formation: "arc", delay: 6 },
      { type: "scout", count: 8, formation: "columns", delay: 6, speed: 110 },
      { type: "turret", count: 3, formation: "line", delay: 6.5 },
      { type: "fighter", count: 5, formation: "sides", delay: 6 },
      { type: "kamikaze", count: 4, formation: "spiral", delay: 5.5 },
      { type: "heavy", count: 2, formation: "line", delay: 6, clearRequired: true },
    ],
    boss: {
      id: "citadel", name: "Aegis Citadel", art: "citadel", hp: 2600, r: 92, reward: 320,
      phases: [
        { from: 1, attacks: ["fan", "aimed"], interval: 1.5, speed: 1 },
        { from: 0.62, attacks: ["fan", "sweep", "minions"], interval: 1.15, speed: 1.15 },
        { from: 0.28, attacks: ["ring", "sweep", "aimed"], interval: 0.8, speed: 1.35 },
      ],
    },
  },
  {
    id: 2,
    key: "love-storm",
    name: "Love Storm",
    subtitle: "Thunderfront over the drowned coast",
    env: "storm",
    tonic: 98,
    scrollSpeed: 1.5,
    difficulty: 1.35,
    waves: [
      { type: "fighter", count: 6, formation: "vee", delay: 1.2 },
      { type: "kamikaze", count: 5, formation: "sides", delay: 5 },
      { type: "bomber", count: 3, formation: "line", delay: 5.5 },
      { type: "drone", count: 4, formation: "arc", delay: 5.5 },
      { type: "fighter", count: 8, formation: "columns", delay: 5 },
      { type: "turret", count: 4, formation: "line", delay: 5.5 },
      { type: "heavy", count: 3, formation: "vee", delay: 6 },
      { type: "kamikaze", count: 8, formation: "spiral", delay: 5.5 },
      { type: "bomber", count: 4, formation: "arc", delay: 6, clearRequired: true },
    ],
    boss: {
      id: "tempest", name: "Tempest Halo", art: "tempest", hp: 4200, r: 104, reward: 520,
      phases: [
        { from: 1, attacks: ["sweep", "aimed", "ring"], interval: 1.3, speed: 1.1 },
        { from: 0.66, attacks: ["laserRain", "fan", "minions"], interval: 1.0, speed: 1.25 },
        { from: 0.3, attacks: ["spiral", "laserRain", "ring"], interval: 0.7, speed: 1.5 },
      ],
    },
  },
  {
    id: 3,
    key: "memory-nebula",
    name: "Memory Nebula",
    subtitle: "Where every remembered light still burns",
    env: "nebula",
    tonic: 132,
    scrollSpeed: 2,
    difficulty: 1.75,
    waves: [
      { type: "drone", count: 5, formation: "arc", delay: 1.2 },
      { type: "elite", count: 2, formation: "line", delay: 5 },
      { type: "kamikaze", count: 8, formation: "spiral", delay: 5 },
      { type: "heavy", count: 4, formation: "vee", delay: 5.5 },
      { type: "bomber", count: 5, formation: "columns", delay: 5.5 },
      { type: "elite", count: 3, formation: "arc", delay: 6 },
      { type: "turret", count: 5, formation: "line", delay: 5.5 },
      { type: "drone", count: 6, formation: "sides", delay: 5.5 },
      { type: "elite", count: 4, formation: "vee", delay: 6, clearRequired: true },
    ],
    boss: {
      id: "eidolon", name: "Eidolon Heart", art: "eidolon", hp: 6400, r: 118, reward: 860,
      phases: [
        { from: 1, attacks: ["ring", "aimed", "spiral"], interval: 1.2, speed: 1.2 },
        { from: 0.7, attacks: ["laserRain", "spiral", "minions"], interval: 0.95, speed: 1.4 },
        { from: 0.34, attacks: ["ring", "spiral", "laserRain", "sweep"], interval: 0.6, speed: 1.7 },
      ],
    },
  },
];

export const getLevel = (id: number) => LEVELS.find((l) => l.id === id) ?? (LEVELS[0] as LevelConfig);
