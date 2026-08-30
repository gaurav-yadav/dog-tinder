import { generatePuppyImage } from '../../../lib/puppyGeneration.js';

const MAX_FRAME_BYTES = 5 * 1024 * 1024;

function validFrame(value) {
  return value &&
    typeof value.arrayBuffer === 'function' &&
    value.size > 0 &&
    value.size <= MAX_FRAME_BYTES &&
    ['image/jpeg', 'image/png'].includes(value.type);
}

export async function POST(request) {
  const startedAt = Date.now();
  try {
    const requestOrigin = request.headers.get('origin');
    if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
      return Response.json({ error: 'Cross-origin puppy generation is not allowed.' }, { status: 403 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'Add OPENROUTER_API_KEY to .env.local to generate puppy portraits.' },
        { status: 503 },
      );
    }

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json({ error: 'Two valid dog images are required.' }, { status: 400 });
    }
    const candidateFrame = formData.get('candidateFrame');
    const reactionFrame = formData.get('reactionFrame');
    if (!validFrame(candidateFrame) || !validFrame(reactionFrame)) {
      return Response.json({ error: 'Two valid dog images are required.' }, { status: 400 });
    }

    const generated = await generatePuppyImage(candidateFrame, reactionFrame, apiKey, {
      model: process.env.OPENROUTER_IMAGE_MODEL,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    });

    return new Response(generated.bytes, {
      status: 200,
      headers: {
        'Content-Type': generated.mediaType,
        'Cache-Control': 'no-store',
        'X-Puppy-Model': generated.model,
        'X-Puppy-Generation-Ms': String(Date.now() - startedAt),
        'Server-Timing': `openrouter;dur=${Date.now() - startedAt}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Puppy generation failed.';
    console.warn('[Pawfect][OpenRouter] puppy generation failed', { reason: message });
    return Response.json(
      { error: 'The puppy portrait got lost chasing a tennis ball. Please try again.' },
      { status: 502 },
    );
  }
}
