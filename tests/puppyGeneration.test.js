import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PUPPY_MODEL,
  generatePuppyImage,
  OPENROUTER_IMAGE_ENDPOINT,
} from '../lib/puppyGeneration.js';

test('sends two image references through the OpenRouter image API', async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return Response.json({
      data: [{ b64_json: 'cHVwcHk=', media_type: 'image/png' }],
    });
  };

  const frame = new Blob(['dog-frame'], { type: 'image/jpeg' });
  const result = await generatePuppyImage(frame, frame, 'test-openrouter-key');
  const body = JSON.parse(request.options.body);

  assert.equal(request.url, OPENROUTER_IMAGE_ENDPOINT);
  assert.equal(request.options.headers.Authorization, 'Bearer test-openrouter-key');
  assert.equal(body.model, DEFAULT_PUPPY_MODEL);
  assert.equal(body.resolution, '2K');
  assert.equal(body.aspect_ratio, '1:1');
  assert.equal(body.input_references.length, 2);
  assert.match(body.input_references[0].image_url.url, /^data:image\/jpeg;base64,/);
  assert.equal(new TextDecoder().decode(result.bytes), 'puppy');
});

test('does not expose long provider tokens in errors', async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  const token = 'x'.repeat(80);
  globalThis.fetch = async () => Response.json(
    { error: { message: `Provider rejected ${token}` } },
    { status: 400 },
  );
  const frame = new Blob(['dog-frame'], { type: 'image/jpeg' });

  await assert.rejects(
    () => generatePuppyImage(frame, frame, 'test-openrouter-key'),
    (error) => {
      assert.doesNotMatch(error.message, new RegExp(token));
      assert.match(error.message, /\[redacted\]/);
      return true;
    },
  );
});
