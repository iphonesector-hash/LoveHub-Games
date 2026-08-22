import type { HudState } from "@/game/core/Game";
import type { StringKey } from "@/game/i18n";
import { WEAPON_ORDER, WEAPONS, type WeaponId } from "@/game/weapons/Weapons";

type Props = {
  hud: HudState;
  T: (k: StringKey) => string;
  onPause: () => void;
  onWeapon: (w: WeaponId) => void;
};

function Bar({ value, max, className, label }: { value: number; max: number; className: string; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="lh-bar" role="meter" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemax={max}>
      <span className={`lh-bar-fill ${className}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Hud({ hud, T, onPause, onWeapon }: Props) {
  return (
    <div className="lh-hud">
      <div className="lh-hud-top">
        <div className="lh-hud-left">
          <div className="lh-score">{hud.score.toLocaleString()}</div>
          <div className="lh-sub">
            {T("level")} {hud.levelId} · {T("wave")} {hud.wave}/{hud.waveTotal}
          </div>
          {hud.combo > 1 && <div className="lh-combo">×{hud.combo.toFixed(1)} {T("combo")}</div>}
        </div>
        <button type="button" className="lh-icon-btn" onClick={onPause} aria-label={T("paused")}>
          <span className="lh-pause-glyph" />
        </button>
      </div>

      {hud.boss && (
        <div className="lh-bossbar">
          <div className="lh-boss-name">
            <span>{T("boss")} · {hud.boss.name}</span>
            <span className="lh-boss-phase">PH {hud.boss.phase}</span>
          </div>
          <div className="lh-bar lh-bar-boss">
            <span className="lh-bar-fill lh-fill-boss" style={{ width: `${hud.boss.frac * 100}%` }} />
          </div>
        </div>
      )}

      <div className="lh-hud-bottom">
        <div className="lh-gauges">
          <Bar value={hud.health} max={hud.maxHealth} className="lh-fill-hull" label={T("health")} />
          <Bar value={hud.shield} max={hud.maxShield} className="lh-fill-shield" label={T("shield")} />
          <Bar value={hud.energy} max={hud.maxEnergy} className="lh-fill-energy" label={T("energy")} />
        </div>
        <div className="lh-weapons">
          {WEAPON_ORDER.map((w) => (
            <button
              key={w}
              type="button"
              className={`lh-weapon ${hud.weapon === w ? "is-active" : ""}`}
              style={{ ["--wc" as string]: WEAPONS[w].color }}
              onClick={() => onWeapon(w)}
              aria-label={WEAPONS[w].name}
            >
              {WEAPONS[w].name.split(" ")[0]}
            </button>
          ))}
        </div>
        <div className="lh-weapon-meta">
          {hud.weaponName} · L{hud.weaponLevel}
          {hud.rapid ? " · RAPID" : ""}
          {hud.multiplier ? " · ×2" : ""}
        </div>
      </div>
    </div>
  );
}
