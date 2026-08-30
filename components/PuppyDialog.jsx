'use client';

import { useEffect, useRef, useState } from 'react';
import { Egg, Heart, LoaderCircle, PawPrint, RotateCcw, Sparkles, X } from 'lucide-react';

export function PuppyDialog({ open, puppy, onClose, onRetry }) {
  const dialogRef = useRef(null);
  const headingRef = useRef(null);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setCountdown(10);
      setTimeout(() => headingRef.current?.focus(), 50);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open || puppy.status !== 'generating' || countdown <= 0) return undefined;
    const timer = setTimeout(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, open, puppy.status]);

  return (
    <dialog
      ref={dialogRef}
      className="puppy-dialog"
      aria-labelledby="puppy-dialog-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClose={onClose}
    >
      <button className="puppy-dialog-close" type="button" onClick={onClose} aria-label="Close puppy preview">
        <X />
      </button>
      <div className="puppy-dialog-kicker"><PawPrint size={15} /> The puppy portal</div>
      <h2 id="puppy-dialog-title" ref={headingRef} tabIndex={-1}>
        {puppy.status === 'ready' ? 'The puppy has arrived!' : 'Future floof incoming'}
      </h2>

      <div className={`puppy-portrait status-${puppy.status}`} aria-live="polite">
        {puppy.status === 'ready' && puppy.imageUrl ? (
          <>
            {/* oxlint-disable-next-line next/no-img-element */}
            <img src={puppy.imageUrl} alt="A playful AI-generated puppy portrait inspired by both dogs" />
            <div className="puppy-arrived-badge"><Sparkles /> Puppy hatched</div>
          </>
        ) : puppy.status === 'error' ? (
          <div className="puppy-error-state">
            <PawPrint size={44} />
            <strong>The puppy portrait got lost chasing a tennis ball.</strong>
            <span>We can send the same two dog snapshots again.</span>
          </div>
        ) : (
          <div className="puppy-loading-state">
            <div className={`puppy-hatch-stage ${countdown <= 3 ? 'almost-hatched' : ''}`}>
              <span className="orbit-paw"><PawPrint fill="currentColor" /></span>
              <span className="orbit-heart"><Heart fill="currentColor" /></span>
              <div className="puppy-egg">
                <Egg />
                {countdown > 0 ? <b>{countdown}</b> : <LoaderCircle className="spin" />}
              </div>
            </div>
            <strong>{countdown > 0 ? 'Puppy hatching…' : 'Still fluffing the fur…'}</strong>
            <span>Combining ears, markings, and maximum floof.</span>
          </div>
        )}
      </div>

      <p className="puppy-disclaimer">A playful AI preview inspired by both dogs—not a genetic prediction.</p>
      <div className="puppy-dialog-actions">
        {puppy.status === 'error' && (
          <button className="puppy-retry" type="button" onClick={() => { setCountdown(10); onRetry(); }}>
            <RotateCcw size={17} /> Try again
          </button>
        )}
        <button className="puppy-done" type="button" onClick={onClose}>
          {puppy.status === 'ready' ? 'So cute!' : 'Close'}
        </button>
      </div>
    </dialog>
  );
}
