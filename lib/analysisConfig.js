export const TWELVELABS_MODEL = 'pegasus1.5';
export const TWELVELABS_ENDPOINT = 'https://api.twelvelabs.io/v1.3/analyze';

export const DOG_REACTION_PROMPT = `Analyze only the observable body language of the dog in this video.

Score each requested signal from 0.0 (absent) to 1.0 (very strong): tail wagging, movement toward the stimulus or camera, sustained visual attention, playful or loose body posture, excitement or activity, avoidance, disengagement or turning away, and tense or stressed body posture.

If the dog is absent, obstructed, or its behavior is unclear, lower confidence. Describe visible behavior only. Do not infer complex human emotions. Do not make medical claims or breeding recommendations. Return only the requested schema fields.`;

const score = { type: 'number' };

export const DOG_REACTION_SCHEMA = {
  type: 'object',
  properties: {
    tailWagging: score,
    approaching: score,
    sustainedAttention: score,
    playfulBodyLanguage: score,
    excitement: score,
    avoidance: score,
    disengagement: score,
    stressSignals: score,
    confidence: score,
    summary: { type: 'string' },
  },
  required: [
    'tailWagging',
    'approaching',
    'sustainedAttention',
    'playfulBodyLanguage',
    'excitement',
    'avoidance',
    'disengagement',
    'stressSignals',
    'confidence',
    'summary',
  ],
};

