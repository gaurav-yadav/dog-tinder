'use client';

import { Check, FlaskConical, Video } from 'lucide-react';
import { reactionFixtures } from '@/data/reactionFixtures';

export function DemoControls({
  open,
  inputMode,
  fixtureId,
  forceFallback,
  disabled,
  onInputMode,
  onFixture,
  onForceFallback,
}) {
  if (!open) return null;

  return (
    <aside className="demo-drawer" aria-label="Demo controls">
      <div className="drawer-title"><FlaskConical size={16} /> Hackathon controls</div>
      <fieldset disabled={disabled}>
        <legend>Reaction source</legend>
        <div className="mode-switch">
          <button className={inputMode === 'fixture' ? 'selected' : ''} onClick={() => onInputMode('fixture')} type="button">
            <Video size={15} /> Prerecorded
          </button>
          <button className={inputMode === 'webcam' ? 'selected' : ''} onClick={() => onInputMode('webcam')} type="button">
            <span className="webcam-dot" /> Webcam
          </button>
        </div>
      </fieldset>

      {inputMode === 'fixture' && (
        <label className="fixture-select">
          <span>Guaranteed reaction</span>
          <select value={fixtureId} onChange={(event) => onFixture(event.target.value)} disabled={disabled}>
            {Object.values(reactionFixtures).map((fixture) => (
              <option key={fixture.id} value={fixture.id}>{fixture.label}</option>
            ))}
          </select>
        </label>
      )}

      <label className="force-fallback">
        <input
          type="checkbox"
          checked={forceFallback}
          onChange={(event) => onForceFallback(event.target.checked)}
          disabled={disabled}
        />
        <span className="checkbox-ui">{forceFallback && <Check size={13} />}</span>
        <span><b>Force fallback</b><small>Skip TwelveLabs for a guaranteed run</small></span>
      </label>
    </aside>
  );
}

