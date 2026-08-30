'use client';

import { useEffect, useRef } from 'react';
import { Camera } from 'lucide-react';

export function ReactionCamera({ stream, phase, countdown, inputMode }) {
  const previewRef = useRef(null);

  useEffect(() => {
    if (previewRef.current && stream) {
      previewRef.current.srcObject = stream;
      previewRef.current.play().catch(() => {});
    }
  }, [stream]);

  const recording = phase === 'RECORDING';

  return (
    <div className={`reaction-cam ${recording ? 'is-recording' : ''}`} aria-label="Live reaction camera preview">
      {stream ? (
        <video ref={previewRef} autoPlay muted playsInline />
      ) : (
        <div className="camera-placeholder">
          <Camera size={27} />
          <span>{inputMode === 'fixture' ? 'Demo dog' : 'Your dog'}</span>
        </div>
      )}
      {recording && <div className="rec-badge"><span /> REC {String(countdown).padStart(2, '0')}</div>}
    </div>
  );
}

