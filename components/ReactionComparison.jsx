'use client';

import { useState } from 'react';
import { Camera, CameraOff, Heart, PawPrint, X } from 'lucide-react';

function CandidateReplay({ dog }) {
  const [failed, setFailed] = useState(false);

  return (
    <figure className="comparison-video candidate-replay">
      {!failed ? (
        <video
          src={dog.videoUrl}
          poster={dog.posterUrl}
          autoPlay
          muted
          loop
          playsInline
          onError={() => setFailed(true)}
          aria-label={`${dog.name}'s candidate video replay`}
        />
      ) : (
        // oxlint-disable-next-line next/no-img-element
        <img src={dog.posterUrl} alt={`${dog.name}, the candidate dog`} />
      )}
      <figcaption><span>Candidate</span><strong>{dog.name}</strong></figcaption>
    </figure>
  );
}

function ReactionReplay({ reactionUrl }) {
  return (
    <figure className="comparison-video reaction-replay">
      {reactionUrl ? (
        <video
          src={reactionUrl}
          autoPlay
          muted
          loop
          playsInline
          aria-label="Recorded reaction replay"
        />
      ) : (
        <div className="reaction-replay-placeholder">
          <Camera size={34} />
          <PawPrint size={20} />
          <span>Demo reaction</span>
        </div>
      )}
      <figcaption><span>Reaction</span><strong>Your dog</strong></figcaption>
    </figure>
  );
}

export function ReactionComparison({ dog, reactionUrl, result }) {
  const match = result === 'MATCH';
  const retry = result === 'RETRY';

  return (
    <div className={`reaction-comparison ${match ? 'comparison-match' : retry ? 'comparison-retry' : 'comparison-pass'}`}>
      <div className="comparison-kicker">The canine verdict</div>
      <div className="comparison-pair">
        <CandidateReplay dog={dog} />
        <div className="comparison-verdict" aria-hidden="true">
          <span className="verdict-orbit" />
          <div className="verdict-icon">
            {match ? <Heart fill="currentColor" /> : retry ? <CameraOff /> : <X />}
          </div>
          <b>{match ? 'MATCH' : retry ? 'RETRY' : 'PASS'}</b>
        </div>
        <ReactionReplay reactionUrl={reactionUrl} />
      </div>
      <output className="comparison-copy" aria-live="assertive">
        <strong>{match ? "IT'S A MATCH" : retry ? 'NO DOG DETECTED' : 'NOT FEELING IT'}</strong>
        <span>{match ? 'The tail has spoken.' : retry ? 'Keep your dog in frame and try again.' : 'No hard feelings. Next pup.'}</span>
      </output>
      {match && (
        <div className="match-sparks" aria-hidden="true">
          <Heart fill="currentColor" /><PawPrint fill="currentColor" /><Heart fill="currentColor" />
        </div>
      )}
    </div>
  );
}
