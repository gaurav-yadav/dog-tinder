import { reactionFixtures, safeFallbackReaction } from '@/data/reactionFixtures';
import { scoreReaction } from '@/lib/scoring';
import { analyzeReactionVideo } from '@/lib/twelveLabs';

const MAX_VIDEO_BYTES = 22 * 1024 * 1024;

function completedResponse(reaction, source, fallbackReason = null) {
  return Response.json({
    ...scoreReaction(reaction),
    source,
    fallbackReason,
  });
}

export async function POST(request) {
  let fixtureId = 'neutral';

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

    const reaction = await analyzeReactionVideo(video, apiKey);
    return completedResponse(reaction, 'twelvelabs');
  } catch (error) {
    const fixture = reactionFixtures[fixtureId];
    return completedResponse(
      fixture?.fallbackAnalysis || safeFallbackReaction,
      'fixture-fallback',
      error instanceof Error ? error.message.slice(0, 160) : 'Video analysis failed.',
    );
  }
}
