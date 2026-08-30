import { reactionFixtures, safeFallbackReaction } from '@/data/reactionFixtures';
import {
  DOG_REACTION_PROMPT,
  TWELVELABS_ENDPOINT,
  TWELVELABS_MODEL,
} from '@/lib/analysisConfig';
import { scoreReaction } from '@/lib/scoring';
import { analyzeReactionVideo, TwelveLabsError } from '@/lib/twelveLabs';

const MAX_VIDEO_BYTES = 22 * 1024 * 1024;

function completedResponse(reaction, source, fallbackReason = null, receipt = {}) {
  return Response.json({
    ...scoreReaction(reaction),
    source,
    fallbackReason,
    analysisReceipt: {
      provider: 'TwelveLabs',
      attempted: Boolean(receipt.attempted),
      succeeded: source === 'twelvelabs',
      model: TWELVELABS_MODEL,
      endpoint: TWELVELABS_ENDPOINT,
      prompt: DOG_REACTION_PROMPT,
      requestId: receipt.requestId || null,
      apiVersion: receipt.apiVersion || null,
      httpStatus: receipt.httpStatus ?? null,
      providerErrorCode: receipt.providerErrorCode || null,
      providerErrorMessage: receipt.providerErrorMessage || null,
      retryable: typeof receipt.retryable === 'boolean' ? receipt.retryable : null,
      finishReason: receipt.finishReason || null,
      recordedToDisk: false,
      completedAt: new Date().toISOString(),
    },
  });
}

export async function POST(request) {
  let fixtureId = 'neutral';
  let inputMode = 'webcam';
  let attemptedTwelveLabs = false;

  try {
    const formData = await request.formData();
    fixtureId = String(formData.get('fixtureId') || 'neutral');
    inputMode = String(formData.get('inputMode') || 'webcam');
    const fixture = reactionFixtures[fixtureId];
    const fallbackReaction = inputMode === 'fixture'
      ? fixture?.fallbackAnalysis || safeFallbackReaction
      : safeFallbackReaction;
    const video = formData.get('video');
    const apiKey = process.env.TWELVELABS_API_KEY;
    const forceFixtures = process.env.DEMO_FORCE_FIXTURES === 'true';
    const forceFallback = formData.get('forceFallback') === 'true';

    if (forceFixtures || forceFallback) {
      return completedResponse(
        fallbackReaction,
        'fixture-fallback',
        'Demo fixtures are forced.',
      );
    }

    if (!video || typeof video.arrayBuffer !== 'function' || video.size === 0) {
      return completedResponse(
        fallbackReaction,
        'fixture-fallback',
        'No reaction video was supplied.',
      );
    }

    if (video.size > MAX_VIDEO_BYTES) {
      return completedResponse(
        fallbackReaction,
        'fixture-fallback',
        'Reaction video exceeded the demo upload limit.',
      );
    }

    if (!apiKey) {
      return completedResponse(
        fallbackReaction,
        'fixture-fallback',
        'TwelveLabs API key is not configured.',
      );
    }

    attemptedTwelveLabs = true;
    const { reaction, providerReceipt } = await analyzeReactionVideo(video, apiKey);
    console.info('[Pawfect][TwelveLabs] analysis completed', {
      requestId: providerReceipt.requestId,
      finishReason: providerReceipt.finishReason,
    });
    return completedResponse(reaction, 'twelvelabs', null, {
      attempted: true,
      ...providerReceipt,
    });
  } catch (error) {
    const fixture = reactionFixtures[fixtureId];
    const fallbackReaction = inputMode === 'fixture'
      ? fixture?.fallbackAnalysis || safeFallbackReaction
      : safeFallbackReaction;
    const fallbackReason = error instanceof Error ? error.message.slice(0, 160) : 'Video analysis failed.';
    const providerReceipt = error instanceof TwelveLabsError
      ? {
          attempted: attemptedTwelveLabs,
          requestId: error.requestId,
          apiVersion: error.apiVersion,
          httpStatus: error.status,
          providerErrorCode: error.code,
          providerErrorMessage: error.providerMessage,
          retryable: error.retryable,
          finishReason: error.finishReason,
        }
      : { attempted: attemptedTwelveLabs };
    console.warn('[Pawfect][TwelveLabs] using fallback', {
      ...providerReceipt,
      reason: fallbackReason,
    });
    return completedResponse(
      fallbackReaction,
      'fixture-fallback',
      fallbackReason,
      providerReceipt,
    );
  }
}
