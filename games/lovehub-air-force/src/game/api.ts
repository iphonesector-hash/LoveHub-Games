/* Public embedding API + Couple Mode hooks for the LoveHub Games Hub.
   The game runs fully standalone; LoveHub is never required. */
import type { Game, HudState } from "./core/Game";
import { saveSystem } from "./systems/SaveSystem";
import type { RunSummary, LeaderboardAdapter } from "./systems/ScoreSystem";
import { noopLeaderboard } from "./systems/ScoreSystem";

export type GameEvent =
  | { type: "hud"; payload: HudState }
  | { type: "runEnd"; payload: RunSummary & { victory: boolean } };

type Listener = (e: GameEvent) => void;

export type PublicApi = {
  version: string;
  start: (levelId?: number) => void;
  pause: () => void;
  resume: () => void;
  getScore: () => number;
  getProgress: () => {
    unlockedLevels: number;
    highScore: number;
    loveEnergy: number;
    upgrades: Record<string, number>;
  };
  on: (fn: Listener) => () => void;
  setLeaderboard: (a: LeaderboardAdapter) => void;
  destroy: () => void;
};

const listeners = new Set<Listener>();
export let leaderboard: LeaderboardAdapter = noopLeaderboard;

export function emit(e: GameEvent) {
  listeners.forEach((l) => l(e));
}

export function registerGameApi(game: Game, destroy: () => void) {
  const api: PublicApi = {
    version: "1.0.0",
    start: (levelId = 1) => game.startLevel(levelId),
    pause: () => game.pause(),
    resume: () => game.resume(),
    getScore: () => game.score.score,
    getProgress: () => ({
      unlockedLevels: saveSystem.data.unlockedLevels,
      highScore: saveSystem.data.highScore,
      loveEnergy: saveSystem.data.loveEnergy,
      upgrades: { ...saveSystem.data.upgrades },
    }),
    on: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setLeaderboard: (a) => {
      leaderboard = a;
    },
    destroy,
  };
  (window as unknown as Record<string, unknown>)["LoveHubAirForce"] = api;
  return () => {
    delete (window as unknown as Record<string, unknown>)["LoveHubAirForce"];
    listeners.clear();
  };
}

/* ---------- Couple Mode (architecture only — not faked as online) ---------- */

export type CouplePlayerState = {
  slot: 0 | 1;
  x: number;
  y: number;
  alive: boolean;
  down: boolean;
};

export type CoupleSession = {
  /** Shared hull/energy pool for cooperative runs. */
  sharedResources: boolean;
  players: CouplePlayerState[];
  onPartnerState?: (s: CouplePlayerState) => void;
  sendState?: (s: CouplePlayerState) => void;
  revivePartner?: (slot: 0 | 1) => void;
  onCoupleCombo?: (multiplier: number) => void;
};

/** Transport is intentionally unimplemented until a real backend exists. */
export interface CoupleTransport {
  connect(roomId: string): Promise<CoupleSession>;
  disconnect(): void;
}

export const coupleModeAvailable = false;
