import { normalizeReaction } from './scoring';

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

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function shouldRetry(status) {
  return status === 429 || status >= 500;
}

export async function analyzeReactionVideo(video, apiKey) {
  const base64 = arrayBufferToBase64(await video.arrayBuffer());
  const requestBody = {
    model_name: 'pegasus1.5',
    video: { type: 'base64_string', base64_string: base64 },
    prompt_v2: { input_text: DOG_REACTION_PROMPT },
    temperature: 0.1,
    stream: false,
    max_tokens: 512,
    response_format: {
      type: 'json_schema',
      json_schema: DOG_REACTION_SCHEMA,
    },
  };

  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch('https://api.twelvelabs.io/v1.3/analyze', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(60_000),
    });

    if (response.ok || !shouldRetry(response.status) || attempt === 1) break;
    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  if (!response?.ok) {
    throw new Error(`TwelveLabs returned ${response?.status || 'no response'}.`);
  }

  const payload = await response.json();
  if (payload.finish_reason && payload.finish_reason !== 'stop') {
    throw new Error(`TwelveLabs response ended with ${payload.finish_reason}.`);
  }

  const rawData = typeof payload.data === 'string' ? JSON.parse(payload.data) : payload.data;
  return normalizeReaction(rawData);
}

