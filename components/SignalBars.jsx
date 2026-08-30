const positiveSignals = [
  ['tailWagging', 'Tail wagging'],
  ['sustainedAttention', 'Attention'],
  ['approaching', 'Approaching'],
  ['playfulBodyLanguage', 'Playfulness'],
  ['excitement', 'Excitement'],
];

const cautionSignals = [
  ['avoidance', 'Avoidance'],
  ['disengagement', 'Disengagement'],
  ['stressSignals', 'Stress'],
];

function SignalRow({ label, value, caution = false }) {
  const percent = Math.round(value * 100);
  return (
    <div className="signal-row">
      <div className="signal-label"><span>{label}</span><b>{percent}%</b></div>
      <div className="signal-track" aria-label={`${label}: ${percent}%`}>
        <span className={caution ? 'caution' : ''} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function SignalBars({ reaction, compact = false }) {
  return (
    <div className={`signal-results ${compact ? 'compact' : ''}`}>
      <p className="signal-group-title positive-title">Positive signals</p>
      {positiveSignals.map(([key, label]) => (
        <SignalRow key={key} label={label} value={reaction[key]} />
      ))}
      <p className="signal-group-title caution-title">Caution signals</p>
      {cautionSignals.map(([key, label]) => (
        <SignalRow key={key} label={label} value={reaction[key]} caution />
      ))}
    </div>
  );
}
