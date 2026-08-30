const signalKeys = [
  'tailWagging',
  'approaching',
  'sustainedAttention',
  'playfulBodyLanguage',
  'excitement',
  'avoidance',
  'disengagement',
  'stressSignals',
  'confidence',
];

export function normalizeReaction(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Reaction analysis must be an object.');
  }

  const normalized = {};
  for (const key of signalKeys) {
    const value = input[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`Reaction signal ${key} is invalid.`);
    }
    normalized[key] = Math.max(0, Math.min(1, value));
  }

  if (typeof input.summary !== 'string' || !input.summary.trim()) {
    throw new Error('Reaction summary is invalid.');
  }
  normalized.summary = input.summary.trim().slice(0, 500);
  return normalized;
}

export function scoreReaction(input) {
  const reaction = normalizeReaction(input);
  const positiveScore =
    reaction.tailWagging * 1.0 +
    reaction.approaching * 1.3 +
    reaction.sustainedAttention * 1.2 +
    reaction.playfulBodyLanguage * 1.3 +
    reaction.excitement * 0.8;

  const negativeScore =
    reaction.avoidance * 1.5 +
    reaction.disengagement * 1.3 +
    reaction.stressSignals * 1.5;

  const score = positiveScore - negativeScore;
  const observedSignalStrength =
    reaction.tailWagging +
    reaction.approaching +
    reaction.sustainedAttention +
    reaction.playfulBodyLanguage +
    reaction.excitement +
    reaction.avoidance +
    reaction.disengagement +
    reaction.stressSignals;
  const usableReaction = reaction.confidence >= 0.25 && observedSignalStrength >= 0.1;
  const positive = score >= 1.2 && reaction.confidence >= 0.55;

  return {
    reaction,
    score: Number(score.toFixed(3)),
    positiveScore: Number(positiveScore.toFixed(3)),
    negativeScore: Number(negativeScore.toFixed(3)),
    result: usableReaction ? (positive ? 'MATCH' : 'PASS') : 'RETRY',
  };
}
