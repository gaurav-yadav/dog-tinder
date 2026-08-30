'use client';

import { Check, FlaskConical, Video } from 'lucide-react';
import { reactionFixtures } from '@/data/reactionFixtures';

export function DemoControls({
  open,
  inputMode,
  fixtureId,
  forceFallback,
  lastAnalysis,
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

      {lastAnalysis?.analysisReceipt && (
        <details className="analysis-receipt" open>
          <summary>Latest analysis receipt</summary>
          <div className={`receipt-status ${lastAnalysis.analysisReceipt.succeeded ? 'success' : 'fallback'}`}>
            <span />
            <b>
              {lastAnalysis.analysisReceipt.succeeded
                ? 'Confirmed by TwelveLabs'
                : lastAnalysis.analysisReceipt.attempted
                  ? 'TwelveLabs attempted · fallback used'
                  : 'Not sent · fixture used'}
            </b>
          </div>
          <dl className="receipt-meta">
            <div><dt>Model</dt><dd>{lastAnalysis.analysisReceipt.model}</dd></div>
            <div><dt>Finished</dt><dd>{new Date(lastAnalysis.analysisReceipt.completedAt).toLocaleTimeString()}</dd></div>
            {lastAnalysis.analysisReceipt.requestId && (
              <div><dt>Request ID</dt><dd>{lastAnalysis.analysisReceipt.requestId}</dd></div>
            )}
            <div>
              <dt>Recording saved</dt>
              <dd>{lastAnalysis.analysisReceipt.recordedToDisk ? 'Yes · debug download' : 'No · memory only'}</dd>
            </div>
            {lastAnalysis.analysisReceipt.recordingFilename && (
              <div><dt>Filename</dt><dd>{lastAnalysis.analysisReceipt.recordingFilename}</dd></div>
            )}
            {lastAnalysis.analysisReceipt.recordingLocation && (
              <div><dt>Location</dt><dd>{lastAnalysis.analysisReceipt.recordingLocation}</dd></div>
            )}
          </dl>
          {lastAnalysis.fallbackReason && <p className="receipt-error">{lastAnalysis.fallbackReason}</p>}
          <p className="receipt-label">Prompt sent</p>
          <pre>{lastAnalysis.analysisReceipt.prompt}</pre>
          <p className="receipt-label">Normalized return</p>
          <pre>{JSON.stringify(lastAnalysis.reaction, null, 2)}</pre>
        </details>
      )}
    </aside>
  );
}
