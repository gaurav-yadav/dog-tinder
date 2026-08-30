import { normalizeReaction } from './scoring';
import {
  DOG_REACTION_PROMPT,
  DOG_REACTION_SCHEMA,
  TWELVELABS_ENDPOINT,
  TWELVELABS_MODEL,
} from './analysisConfig';

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
    model_name: TWELVELABS_MODEL,
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
    response = await fetch(TWELVELABS_ENDPOINT, {
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

  const requestId = response.headers.get('x-request-id') || response.headers.get('request-id');
  const payload = await response.json();
  if (payload.finish_reason && payload.finish_reason !== 'stop') {
    throw new Error(`TwelveLabs response ended with ${payload.finish_reason}.`);
  }

  const rawData = typeof payload.data === 'string' ? JSON.parse(payload.data) : payload.data;
  return {
    reaction: normalizeReaction(rawData),
    providerReceipt: {
      requestId,
      finishReason: payload.finish_reason || 'stop',
    },
  };
}
