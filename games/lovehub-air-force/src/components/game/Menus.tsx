import type { StringKey, Lang } from "@/game/i18n";
import { LEVELS } from "@/game/levels/levels";
import { UPGRADES, upgradeCost } from "@/game/systems/UpgradeSystem";
import type { Settings, UpgradeKey } from "@/game/systems/SaveSystem";
import type { RunSummary } from "@/game/systems/ScoreSystem";

type TFn = (k: StringKey) => string;

export function LoadingScreen({ T, progress }: { T: TFn; progress: number }) {
  return (
    <div className="lh-screen lh-center">
      <div className="lh-logo">
        <span className="lh-logo-mark" aria-hidden />
        <h1 className="lh-title">{T("title")}</h1>
        <p className="lh-tagline">{T("tagline")}</p>
      </div>
      <div className="lh-loadbar"><span style={{ width: `${progress}%` }} /></div>
      <p className="lh-sub">{T("loading")}</p>
    </div>
  );
}

export function MainMenu({
  T, highScore, loveEnergy, onPlay, onLevels, onHangar, onSettings,
}: {
  T: TFn; highScore: number; loveEnergy: number;
  onPlay: () => void; onLevels: () => void; onHangar: () => void; onSettings: () => void;
}) {
  return (
    <div className="lh-screen lh-center">
      <div className="lh-logo">
        <span className="lh-logo-mark" aria-hidden />
        <h1 className="lh-title">{T("title")}</h1>
        <p className="lh-tagline">{T("tagline")}</p>
      </div>
      <div className="lh-stats-row">
        <div><span className="lh-stat-k">{T("best")}</span><span className="lh-stat-v">{highScore.toLocaleString()}</span></div>
        <div><span className="lh-stat-k">{T("loveEnergy")}</span><span className="lh-stat-v">{loveEnergy.toLocaleString()}</span></div>
      </div>
      <div className="lh-menu">
        <button type="button" className="lh-btn lh-btn-primary" onClick={onPlay}>{T("play")}</button>
        <button type="button" className="lh-btn" onClick={onLevels}>{T("levelSelect")}</button>
        <button type="button" className="lh-btn" onClick={onHangar}>{T("hangar")}</button>
        <button type="button" className="lh-btn" onClick={onSettings}>{T("settings")}</button>
      </div>
      <p className="lh-foot">{T("couplePreview")}</p>
    </div>
  );
}

export function LevelSelect({
  T, unlocked, onBack, onStart,
}: { T: TFn; unlocked: number; onBack: () => void; onStart: (id: number) => void }) {
  return (
    <div className="lh-screen">
      <header className="lh-head">
        <button type="button" className="lh-btn lh-btn-ghost" onClick={onBack}>{T("back")}</button>
        <h2>{T("levelSelect")}</h2>
      </header>
      <div className="lh-cards">
        {LEVELS.map((l) => {
          const locked = l.id > unlocked;
          return (
            <button
              key={l.id}
              type="button"
              className={`lh-card lh-card-${l.env} ${locked ? "is-locked" : ""}`}
              disabled={locked}
              onClick={() => onStart(l.id)}
            >
              <span className="lh-card-idx">{String(l.id).padStart(2, "0")}</span>
              <span className="lh-card-name">{l.name}</span>
              <span className="lh-card-sub">{locked ? T("locked") : l.subtitle}</span>
              <span className="lh-card-boss">{T("boss")}: {l.boss.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Hangar({
  T, lang, loveEnergy, upgrades, onBuy, onBack,
}: {
  T: TFn; lang: Lang; loveEnergy: number;
  upgrades: Record<UpgradeKey, number>; onBuy: (k: UpgradeKey) => void; onBack: () => void;
}) {
  return (
    <div className="lh-screen">
      <header className="lh-head">
        <button type="button" className="lh-btn lh-btn-ghost" onClick={onBack}>{T("back")}</button>
        <h2>{T("hangar")}</h2>
        <span className="lh-pill">{T("loveEnergy")}: {loveEnergy.toLocaleString()}</span>
      </header>
      <div className="lh-upgrades">
        {UPGRADES.map((u) => {
          const lvl = upgrades[u.key];
          const maxed = lvl >= u.max;
          const cost = upgradeCost(u, lvl);
          const afford = loveEnergy >= cost;
          return (
            <div key={u.key} className="lh-upg">
              <div className="lh-upg-info">
                <span className="lh-upg-name">{T(u.labelKey)}</span>
                <span className="lh-pips">
                  {Array.from({ length: u.max }, (_, i) => (
                    <i key={i} className={i < lvl ? "on" : ""} />
                  ))}
                </span>
              </div>
              <button
                type="button"
                className={`lh-btn lh-btn-sm ${maxed || !afford ? "is-dim" : "lh-btn-primary"}`}
                disabled={maxed || !afford}
                onClick={() => onBuy(u.key)}
              >
                {maxed ? T("maxed") : `${T("upgrade")} · ${cost}`}
              </button>
            </div>
          );
        })}
      </div>
      <p className="lh-foot">{lang === "fa" ? "انرژی عشق را در نبردها به دست آورید." : "Earn Love Energy in combat, spend it here."}</p>
    </div>
  );
}

export function SettingsScreen({
  T, settings, onChange, onReset, onBack,
}: {
  T: TFn; settings: Settings; onChange: (p: Partial<Settings>) => void; onReset: () => void; onBack: () => void;
}) {
  return (
    <div className="lh-screen">
      <header className="lh-head">
        <button type="button" className="lh-btn lh-btn-ghost" onClick={onBack}>{T("back")}</button>
        <h2>{T("settings")}</h2>
      </header>
      <div className="lh-settings">
        <label className="lh-row">
          <span>{T("music")}</span>
          <input type="range" min={0} max={1} step={0.05} value={settings.music}
            onChange={(e) => onChange({ music: Number(e.target.value) })} />
        </label>
        <label className="lh-row">
          <span>{T("sfx")}</span>
          <input type="range" min={0} max={1} step={0.05} value={settings.sfx}
            onChange={(e) => onChange({ sfx: Number(e.target.value) })} />
        </label>
        <label className="lh-row">
          <span>{T("sensitivity")}</span>
          <input type="range" min={0.5} max={1.5} step={0.05} value={settings.sensitivity}
            onChange={(e) => onChange({ sensitivity: Number(e.target.value) })} />
        </label>
        <label className="lh-row">
          <span>{T("shake")}</span>
          <input type="checkbox" checked={settings.shake} onChange={(e) => onChange({ shake: e.target.checked })} />
        </label>
        <label className="lh-row">
          <span>{T("reducedEffects")}</span>
          <input type="checkbox" checked={settings.reducedEffects}
            onChange={(e) => onChange({ reducedEffects: e.target.checked })} />
        </label>
        <div className="lh-row">
          <span>{T("language")}</span>
          <div className="lh-seg">
            <button type="button" className={settings.lang === "en" ? "on" : ""} onClick={() => onChange({ lang: "en" })}>EN</button>
            <button type="button" className={settings.lang === "fa" ? "on" : ""} onClick={() => onChange({ lang: "fa" })}>فا</button>
          </div>
        </div>
        <button type="button" className="lh-btn lh-btn-ghost" onClick={onReset}>{T("resetProgress")}</button>
      </div>
    </div>
  );
}

export function PauseOverlay({
  T, onResume, onRestart, onQuit,
}: { T: TFn; onResume: () => void; onRestart: () => void; onQuit: () => void }) {
  return (
    <div className="lh-overlay">
      <div className="lh-panel">
        <h2>{T("paused")}</h2>
        <div className="lh-menu">
          <button type="button" className="lh-btn lh-btn-primary" onClick={onResume}>{T("resume")}</button>
          <button type="button" className="lh-btn" onClick={onRestart}>{T("restart")}</button>
          <button type="button" className="lh-btn lh-btn-ghost" onClick={onQuit}>{T("quit")}</button>
        </div>
      </div>
    </div>
  );
}

export function ResultOverlay({
  T, summary, highScore, hasNext, onRestart, onNext, onQuit,
}: {
  T: TFn; summary: RunSummary & { victory: boolean }; highScore: number; hasNext: boolean;
  onRestart: () => void; onNext: () => void; onQuit: () => void;
}) {
  return (
    <div className="lh-overlay">
      <div className={`lh-panel ${summary.victory ? "is-win" : "is-lose"}`}>
        <h2>{summary.victory ? T("victory") : T("gameOver")}</h2>
        <div className="lh-result">
          <div><span>{T("score")}</span><strong>{summary.score.toLocaleString()}</strong></div>
          <div><span>{T("best")}</span><strong>{highScore.toLocaleString()}</strong></div>
          <div><span>{T("combo")}</span><strong>×{summary.maxCombo.toFixed(1)}</strong></div>
          <div><span>{T("earned")}</span><strong>{summary.loveEnergy} ♥</strong></div>
        </div>
        {summary.perfect && <p className="lh-perfect">{T("perfect")} +3000</p>}
        <div className="lh-menu">
          {hasNext && <button type="button" className="lh-btn lh-btn-primary" onClick={onNext}>{T("nextMission")}</button>}
          <button type="button" className={`lh-btn ${hasNext ? "" : "lh-btn-primary"}`} onClick={onRestart}>{T("restart")}</button>
          <button type="button" className="lh-btn lh-btn-ghost" onClick={onQuit}>{T("quit")}</button>
        </div>
      </div>
    </div>
  );
}
