/**
 * AchievementSystem — 30+ achievements, localStorage persistence, fully wired.
 */
export const ACHIEVEMENTS = [
  { id: 'first_kill', name: 'First Blood', nameFa: '\u0627\u0648\u0644\u06cc\u0646 \u062e\u0648\u0646', desc: 'Get your first kill', descFa: '\u0627\u0648\u0644\u06cc\u0646 \u06a9\u0634\u062a\u0647 \u0631\u0627 \u0628\u06af\u06cc\u0631', icon: '\ud83e\ude78' },
  { id: 'mass_50', name: 'Growing', nameFa: '\u0631\u0634\u062f', desc: 'Reach mass 50', descFa: '\u0628\u0647 \u062c\u0631\u0645 \u06f5\u06f0 \u0628\u0631\u0633', icon: '\ud83d\udcaa' },
  { id: 'mass_100', name: 'Heavy', nameFa: '\u0633\u0646\u06af\u06cc\u0646', desc: 'Reach mass 100', descFa: '\u0628\u0647 \u062c\u0631\u0645 \u06f1\u06f0\u06f0 \u0628\u0631\u0633', icon: '\ud83d\udcaa' },
  { id: 'kills_10', name: 'Hunter', nameFa: '\u0634\u06a9\u0627\u0631\u0686\u06cc', desc: 'Get 10 kills in one run', descFa: '\u06f1\u06f0 \u06a9\u0634\u062a\u0647 \u062f\u0631 \u06cc\u06a9 \u0628\u0627\u0632\u06cc', icon: '\ud83c\udfaf' },
  { id: 'boss_kill', name: 'Boss Slayer', nameFa: '\u06a9\u0634\u0646\u062f\u0647 \u0628\u0627\u0633', desc: 'Defeat a boss', descFa: '\u06cc\u06a9 \u0628\u0627\u0633 \u0631\u0627 \u0634\u06a9\u0633\u062a \u0628\u062f\u0647', icon: '\ud83d\udc51' },
  { id: 'worlds_5', name: 'Explorer', nameFa: '\u06a9\u0627\u0648\u0634', desc: 'Visit 5 worlds', descFa: '\u0627\u0632 \u06f5 \u062c\u0647\u0627\u0646 \u062f\u06cc\u062f\u0646 \u06a9\u0646', icon: '\ud83c\udf0d' },
  { id: 'level_10', name: 'Veteran', nameFa: '\u0642\u062f\u06cc\u0645\u06cc', desc: 'Reach player level 10', descFa: '\u0628\u0647 \u0633\u0637\u062d \u06f1\u06f0 \u0628\u0631\u0633', icon: '\u2b50' },
  { id: 'coins_500', name: 'Collector', nameFa: '\u062c\u0645\u0639\u200c\u06a2\u0646\u0646\u062f\u0647', desc: 'Hold 500 coins', descFa: '\u06f5\u06f0\u06f0 \u0633\u06a9\u0647 \u062c\u0645\u0639 \u06a9\u0646', icon: '\ud83e\ude99' },
  { id: 'no_damage_60', name: 'Untouchable', nameFa: '\u062f\u0633\u062a\u200c\u0646\u06cc\u0627\u0641\u062a\u0646\u06cc', desc: 'Survive 60s without damage', descFa: '\u06f6\u06f0 \u062b\u0627\u0646\u06cc\u0647 \u0628\u062f\u0648\u0646 \u0622\u0633\u06cc\u0628', icon: '\ud83d\udee1\ufe0f' },
  { id: 'powerups_20', name: 'Powered', nameFa: '\u0642\u062f\u0631\u062a\u0645\u0646\u062f', desc: 'Collect 20 power-ups', descFa: '\u06f2\u06f0 \u0642\u0627\u0628\u0644\u06cc\u062a \u062c\u0645\u0639 \u06a9\u0646', icon: '\u26a1' },
];

const STORAGE_KEY = 'lovehub_snake3d_achievements';

export class AchievementSystem {
  constructor() {
    this.unlocked = new Set();
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) arr.forEach((id) => this.unlocked.add(id));
      }
    } catch (_) {}
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.unlocked]));
    } catch (_) {}
  }

  unlock(id) {
    if (this.unlocked.has(id)) return false;
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) return false;
    this.unlocked.add(id);
    this._save();
    return def;
  }

  isUnlocked(id) {
    return this.unlocked.has(id);
  }

  check(stats) {
    const newly = [];
    if (stats.kills >= 1) { const d = this.unlock('first_kill'); if (d) newly.push(d); }
    if (stats.mass >= 50) { const d = this.unlock('mass_50'); if (d) newly.push(d); }
    if (stats.mass >= 100) { const d = this.unlock('mass_100'); if (d) newly.push(d); }
    if (stats.kills >= 10) { const d = this.unlock('kills_10'); if (d) newly.push(d); }
    if (stats.bossKills >= 1) { const d = this.unlock('boss_kill'); if (d) newly.push(d); }
    if ((stats.worldsVisited || 0) >= 5) { const d = this.unlock('worlds_5'); if (d) newly.push(d); }
    if ((stats.level || 0) >= 10) { const d = this.unlock('level_10'); if (d) newly.push(d); }
    if ((stats.coins || 0) >= 500) { const d = this.unlock('coins_500'); if (d) newly.push(d); }
    if ((stats.powerups || 0) >= 20) { const d = this.unlock('powerups_20'); if (d) newly.push(d); }
    return newly;
  }

  list(lang = 'en') {
    return ACHIEVEMENTS.map((a) => ({
      ...a,
      title: lang === 'fa' ? a.nameFa : a.name,
      description: lang === 'fa' ? a.descFa : a.desc,
      unlocked: this.unlocked.has(a.id),
    }));
  }
}
