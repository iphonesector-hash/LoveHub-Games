/* Score, combo and kill-streak bookkeeping. Leaderboard-ready shape. */

export type RunSummary = {
  levelId: number;
  score: number;
  kills: number;
  maxCombo: number;
  loveEnergy: number;
  perfect: boolean;
  timeMs: number;
};

export class ScoreSystem {
  score = 0;
  combo = 1;
  comboTimer = 0;
  streak = 0;
  maxCombo = 1;
  kills = 0;
  loveEnergy = 0;
  private readonly comboWindow = 2.4;

  reset() {
    this.score = 0; this.combo = 1; this.comboTimer = 0; this.streak = 0;
    this.maxCombo = 1; this.kills = 0; this.loveEnergy = 0;
  }

  update(dt: number) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 1; this.streak = 0; }
    }
  }

  /** Returns the awarded points (already combo-multiplied). */
  addKill(base: number, energy: number) {
    this.kills++;
    this.streak++;
    this.comboTimer = this.comboWindow;
    this.combo = Math.min(8, 1 + Math.floor(this.streak / 4) * 0.5 + (this.streak >= 20 ? 1 : 0));
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const pts = Math.round(base * this.combo);
    this.score += pts;
    this.loveEnergy += energy;
    return pts;
  }

  addBonus(pts: number, energy = 0) {
    this.score += pts;
    this.loveEnergy += energy;
  }

  breakCombo() {
    this.combo = 1;
    this.streak = 0;
    this.comboTimer = 0;
  }
}

/** Future server leaderboard hook — client scores must be re-validated server-side. */
export interface LeaderboardAdapter {
  submit(run: RunSummary): Promise<void>;
  top(levelId: number, limit: number): Promise<{ name: string; score: number }[]>;
}

export const noopLeaderboard: LeaderboardAdapter = {
  async submit() { /* wired up when a validated backend exists */ },
  async top() { return []; },
};
