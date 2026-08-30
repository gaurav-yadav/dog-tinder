import { reactionFixtures, safeFallbackReaction } from '@/data/reactionFixtures';
import {
  DOG_REACTION_PROMPT,
  TWELVELABS_ENDPOINT,
  TWELVELABS_MODEL,
} from '@/lib/analysisConfig';
import { scoreReaction } from '@/lib/scoring';
import { analyzeReactionVideo } from '@/lib/twelveLabs';

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
      finishReason: receipt.finishReason || null,
      recordedToDisk: false,
      completedAt: new Date().toISOString(),
    },
  });
}

export async function POST(request) {
  let fixtureId = 'neutral';
  let attemptedTwelveLabs = false;

  try {
    const formData = await request.formData();
    fixtureId = String(formData.get('fixtureId') || 'neutral');
    const fixture = reactionFixtures[fixtureId];
    const video = formData.get('video');
    const apiKey = process.env.TWELVELABS_API_KEY;
    const forceFixtures = process.env.DEMO_FORCE_FIXTURES === 'true';
    const forceFallback = formData.get('forceFallback') === 'true';

    if (forceFixtures || forceFallback) {
      return completedResponse(
        fixture?.fallbackAnalysis || safeFallbackReaction,
        'fixture-fallback',
        'Demo fixtures are forced.',
      );
    }

    if (!video || typeof video.arrayBuffer !== 'function' || video.size === 0) {
      return completedResponse(
        fixture?.fallbackAnalysis || safeFallbackReaction,
        'fixture-fallback',
        'No reaction video was supplied.',
      );
    }

    if (video.size > MAX_VIDEO_BYTES) {
      return completedResponse(
        fixture?.fallbackAnalysis || safeFallbackReaction,
        'fixture-fallback',
        'Reaction video exceeded the demo upload limit.',
      );
    }

    if (!apiKey) {
      return completedResponse(
        fixture?.fallbackAnalysis || safeFallbackReaction,
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
    const fallbackReason = error instanceof Error ? error.message.slice(0, 160) : 'Video analysis failed.';
    console.warn('[Pawfect][TwelveLabs] using fallback', {
      attempted: attemptedTwelveLabs,
      reason: fallbackReason,
    });
    return completedResponse(
      fixture?.fallbackAnalysis || safeFallbackReaction,
      'fixture-fallback',
      fallbackReason,
      { attempted: attemptedTwelveLabs },
    );
  }
}
