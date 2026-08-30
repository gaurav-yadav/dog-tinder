import assert from 'node:assert/strict';
import test from 'node:test';
import { reactionFixtures } from '../data/reactionFixtures.js';
import { analyzeReactionVideo, TwelveLabsError } from '../lib/twelveLabs.js';

const video = {
  async arrayBuffer() {
    return new TextEncoder().encode('clip').buffer;
  },
};

test('uses the documented synchronous inline-base64 analysis contract', async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(
      JSON.stringify({
        data: JSON.stringify(reactionFixtures.neutral.fallbackAnalysis),
        finish_reason: 'stop',
      }),
      {
        status: 200,
        headers: { 'x-api-version': 'v1.3', 'x-request-id': 'req_success' },
      },
    );
  };

  const result = await analyzeReactionVideo(video, 'test-api-key');
  const body = JSON.parse(request.options.body);

  assert.equal(request.url, 'https://api.twelvelabs.io/v1.3/analyze');
  assert.equal(request.options.headers['x-api-key'], 'test-api-key');
  assert.deepEqual(body.video, { type: 'base64_string', base64_string: 'Y2xpcA==' });
  assert.equal(body.model_name, 'pegasus1.5');
  assert.equal(typeof body.prompt_v2.input_text, 'string');
  assert.equal(body.response_format.type, 'json_schema');
  assert.equal(body.stream, false);
  assert.equal(result.providerReceipt.requestId, 'req_success');
  assert.equal(result.providerReceipt.apiVersion, 'v1.3');
});

test('propagates bounded provider errors and redacts secrets', async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const apiKey = 'secret-key-that-must-not-escape';
  globalThis.fetch = async () => new Response(
    JSON.stringify({
      code: 'video_file_broken',
      message: `Unable to process video file. Debug token: ${apiKey}`,
    }),
    {
      status: 400,
      headers: { 'x-api-version': 'v1.3', 'x-request-id': 'req_broken' },
    },
  );

  await assert.rejects(
    () => analyzeReactionVideo(video, apiKey),
    (error) => {
      assert.ok(error instanceof TwelveLabsError);
      assert.equal(error.status, 400);
      assert.equal(error.code, 'video_file_broken');
      assert.equal(error.requestId, 'req_broken');
      assert.equal(error.retryable, false);
      assert.match(error.providerMessage, /\[redacted\]/);
      assert.doesNotMatch(error.message, new RegExp(apiKey));
      return true;
    },
  );
});
