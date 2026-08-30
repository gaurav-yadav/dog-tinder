import { Heart, X } from 'lucide-react';

export function ResultOverlay({ result }) {
  if (!result) return null;
  const match = result === 'MATCH';

  return (
    <output className={`result-overlay ${match ? 'match-overlay' : 'pass-overlay'}`} aria-live="assertive">
      <div className="result-icon">{match ? <Heart fill="currentColor" /> : <X />}</div>
      <strong>{match ? "IT'S A MATCH" : 'NOT FEELING IT'}</strong>
      <span>{match ? 'The tail has spoken.' : 'No hard feelings. Next pup.'}</span>
    </output>
  );
}
