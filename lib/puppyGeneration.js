export const OPENROUTER_IMAGE_ENDPOINT = 'https://openrouter.ai/api/v1/images';
export const DEFAULT_PUPPY_MODEL = 'bytedance-seed/seedream-4.5';

export const PUPPY_PROMPT = `Create one photorealistic, wholesome studio portrait of a fictional puppy inspired equally by BOTH reference dogs. Blend visible coat colors and markings, fur length and texture, ear shape, muzzle, and overall build. Show only one healthy puppy, centered and looking at the camera, with soft natural light, a simple warm neutral background, detailed fur, no collar, no text, and no watermark. This is a playful artistic visualization, not a genetic prediction.`;

const MAX_ERROR_LENGTH = 180;

function bytesToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function safeProviderMessage(payload, status) {
  const raw = payload?.error?.message || payload?.message;
  if (typeof raw !== 'string') return `OpenRouter returned ${status}.`;
  return raw
    .replace(/[A-Za-z0-9+/_=-]{48,}/g, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_ERROR_LENGTH);
}

async function imageDataUrl(image) {
  const mediaType = image.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return `data:${mediaType};base64,${bytesToBase64(await image.arrayBuffer())}`;
}

export async function generatePuppyImage(firstFrame, secondFrame, apiKey, options = {}) {
  const model = options.model || DEFAULT_PUPPY_MODEL;
  const siteUrl = options.siteUrl || 'http://localhost:3000';
  const response = await fetch(OPENROUTER_IMAGE_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': siteUrl,
      'X-Title': 'Pawfect Puppy Preview',
    },
    body: JSON.stringify({
      model,
      prompt: PUPPY_PROMPT,
      resolution: '2K',
      aspect_ratio: '1:1',
      n: 1,
      input_references: await Promise.all([firstFrame, secondFrame].map(async (frame) => ({
        type: 'image_url',
        image_url: { url: await imageDataUrl(frame) },
      }))),
    }),
    signal: AbortSignal.timeout(120_000),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`OpenRouter returned ${response.status}.`);
  }

  if (!response.ok) throw new Error(safeProviderMessage(payload, response.status));
  const generated = payload?.data?.[0];
  if (!generated?.b64_json) throw new Error('OpenRouter returned no puppy image.');

  return {
    bytes: base64ToBytes(generated.b64_json),
    mediaType: generated.media_type || 'image/png',
    model,
  };
}
