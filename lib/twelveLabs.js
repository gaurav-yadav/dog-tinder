import { normalizeReaction } from './scoring.js';
import {
  DOG_REACTION_PROMPT,
  DOG_REACTION_SCHEMA,
  TWELVELABS_ENDPOINT,
  TWELVELABS_MODEL,
} from './analysisConfig.js';

const MAX_PROVIDER_DETAIL_LENGTH = 240;

function sanitizeProviderDetail(value, secrets = []) {
  if (typeof value !== 'string') return null;

  let sanitized = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0);
    return codePoint <= 31 || codePoint === 127 ? ' ' : character;
  }).join('').replace(/\s+/g, ' ').trim();
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length >= 4) {
      sanitized = sanitized.replaceAll(secret, '[redacted]');
    }
  }

  // Avoid forwarding an echoed API token or video payload from an upstream error.
  sanitized = sanitized.replace(/[A-Za-z0-9+/_=-]{64,}/g, '[redacted]');
  return sanitized ? sanitized.slice(0, MAX_PROVIDER_DETAIL_LENGTH) : null;
}

function requestMetadata(response) {
  return {
    requestId: response.headers.get('x-request-id') || response.headers.get('request-id'),
    apiVersion: response.headers.get('x-api-version'),
  };
}

export class TwelveLabsError extends Error {
  constructor(message, details = {}, options = {}) {
    super(message, options);
    this.name = 'TwelveLabsError';
    this.status = details.status ?? null;
    this.code = details.code || null;
    this.providerMessage = details.providerMessage || null;
    this.requestId = details.requestId || null;
    this.apiVersion = details.apiVersion || null;
    this.retryable = Boolean(details.retryable);
    this.finishReason = details.finishReason || null;
  }
}

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

async function providerError(response, apiKey) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // TwelveLabs documents JSON errors, but a proxy can still return an empty body.
  }

  const details = payload?.error && typeof payload.error === 'object' ? payload.error : payload;
  const code = sanitizeProviderDetail(details?.code, [apiKey]);
  const providerMessage = sanitizeProviderDetail(details?.message, [apiKey]);
  const codeSuffix = code ? ` (${code})` : '';
  const messageSuffix = providerMessage ? `: ${providerMessage}` : '';

  return new TwelveLabsError(
    `TwelveLabs returned ${response.status}${codeSuffix}${messageSuffix}`,
    {
      ...requestMetadata(response),
      status: response.status,
      code,
      providerMessage,
      retryable: shouldRetry(response.status),
    },
  );
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
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      response = await fetch(TWELVELABS_ENDPOINT, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(90_000),
      });

      if (response.ok || !shouldRetry(response.status) || attempt === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  } catch (error) {
    const timedOut = error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name);
    throw new TwelveLabsError(
      timedOut ? 'TwelveLabs request timed out.' : 'TwelveLabs request failed.',
      {
        code: timedOut ? 'request_timed_out' : 'request_failed',
        providerMessage: sanitizeProviderDetail(error instanceof Error ? error.message : null, [apiKey]),
        retryable: true,
      },
      { cause: error },
    );
  }

  if (!response?.ok) {
    throw await providerError(response, apiKey);
  }

  const metadata = requestMetadata(response);
  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new TwelveLabsError(
      'TwelveLabs returned invalid JSON.',
      { ...metadata, status: response.status, code: 'invalid_provider_json' },
      { cause: error },
    );
  }

  if (payload.finish_reason && payload.finish_reason !== 'stop') {
    throw new TwelveLabsError(`TwelveLabs response ended with ${payload.finish_reason}.`, {
      ...metadata,
      status: response.status,
      code: 'generation_incomplete',
      providerMessage: sanitizeProviderDetail(payload.error?.message, [apiKey]),
      finishReason: payload.finish_reason,
    });
  }

  let rawData;
  try {
    rawData = typeof payload.data === 'string' ? JSON.parse(payload.data) : payload.data;
  } catch (error) {
    throw new TwelveLabsError(
      'TwelveLabs returned invalid structured output.',
      { ...metadata, status: response.status, code: 'invalid_structured_output' },
      { cause: error },
    );
  }

  return {
    reaction: normalizeReaction(rawData),
    providerReceipt: {
      ...metadata,
      httpStatus: response.status,
      finishReason: payload.finish_reason || 'stop',
    },
  };
}
