import assert from 'node:assert/strict';
import test from 'node:test';
import { reactionFixtures } from '../data/reactionFixtures.js';
import { normalizeReaction, scoreReaction } from '../lib/scoring.js';

test('positive fixture produces MATCH', () => {
  assert.equal(scoreReaction(reactionFixtures['positive-01'].fallbackAnalysis).result, 'MATCH');
});

test('neutral and negative fixtures produce PASS', () => {
  assert.equal(scoreReaction(reactionFixtures.neutral.fallbackAnalysis).result, 'PASS');
  assert.equal(scoreReaction(reactionFixtures.negative.fallbackAnalysis).result, 'PASS');
});

test('low confidence gates an otherwise positive result', () => {
  const uncertain = { ...reactionFixtures['positive-01'].fallbackAnalysis, confidence: 0.4 };
  assert.equal(scoreReaction(uncertain).result, 'PASS');
});

test('normalization clamps finite values and rejects malformed values', () => {
  const reaction = normalizeReaction({
    ...reactionFixtures.neutral.fallbackAnalysis,
    tailWagging: 1.4,
    avoidance: -0.3,
  });
  assert.equal(reaction.tailWagging, 1);
  assert.equal(reaction.avoidance, 0);
  assert.throws(() => normalizeReaction({ ...reaction, excitement: 'high' }));
});

