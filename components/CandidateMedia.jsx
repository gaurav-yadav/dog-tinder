'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

export function CandidateMedia({ dog, phase, videoRef, candidateNumber }) {
  const [videoFailed, setVideoFailed] = useState(false);

  const playVideo = () => {
    videoRef.current?.play().catch(() => {});
  };

  return (
    <>
      {!videoFailed ? (
        <video
          ref={videoRef}
          key={dog.id}
          className="candidate-image"
          src={dog.videoUrl}
          poster={dog.posterUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={playVideo}
          onError={() => setVideoFailed(true)}
          aria-label={`${dog.name}'s candidate video`}
        />
      ) : (
        // oxlint-disable-next-line next/no-img-element
        <img
          alt={`${dog.name}, the current candidate dog`}
          className="candidate-image candidate-poster"
          src={dog.posterUrl}
        />
      )}
      <div className="image-shade" />
      {phase === 'ANALYZING' && <div className="scan-line" aria-hidden="true" />}
      <div className="clip-label">
        <Sparkles size={13} /> Candidate {String(candidateNumber).padStart(2, '0')}
      </div>
      <div className="candidate-copy">
        <p>Meet</p>
        <h1>{dog.name}<span>.</span></h1>
        <div className="live-tag">
          <span /> {videoFailed ? 'Photo placeholder · add MP4 anytime' : 'Clip playing'}
        </div>
      </div>
    </>
  );
}
