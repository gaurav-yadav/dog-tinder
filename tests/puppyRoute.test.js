import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from '../app/api/generate-puppy/route.js';

test('rejects cross-origin puppy generation requests', async () => {
  const request = new Request('http://localhost/api/generate-puppy', {
    method: 'POST',
    headers: { Origin: 'https://example.com' },
  });
  const response = await POST(request);
  assert.equal(response.status, 403);
});

test('rejects requests without two dog frames before calling OpenRouter', async (context) => {
  const originalKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = 'test-key';
  context.after(() => {
    if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalKey;
  });

  const response = await POST(new Request('http://localhost/api/generate-puppy', { method: 'POST' }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Two valid dog images are required.' });
});
