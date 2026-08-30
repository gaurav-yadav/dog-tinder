import assert from 'node:assert/strict';
import test from 'node:test';
import { reactionFixtures, safeFallbackReaction } from '../data/reactionFixtures.js';
import { normalizeReaction, scoreReaction } from '../lib/scoring.js';

test('positive fixture produces MATCH', () => {
  assert.equal(scoreReaction(reactionFixtures['positive-01'].fallbackAnalysis).result, 'MATCH');
});

test('unverified webcam fallback cannot produce MATCH while the positive demo fixture can', () => {
  assert.notEqual(scoreReaction(safeFallbackReaction).result, 'MATCH');
  assert.equal(scoreReaction(safeFallbackReaction).result, 'RETRY');
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

test('strong stress signals prevent an excited reaction from matching', () => {
  const tense = {
    ...reactionFixtures['positive-01'].fallbackAnalysis,
    playfulBodyLanguage: 0.1,
    stressSignals: 0.85,
    summary: 'The dog moves forward with a stiff posture, bared teeth, and a hard stare.',
  };
  assert.equal(scoreReaction(tense).result, 'PASS');
});

test('missing observable dog reaction requests another recording', () => {
  const noDog = {
    ...reactionFixtures.neutral.fallbackAnalysis,
    tailWagging: 0,
    approaching: 0,
    sustainedAttention: 0,
    playfulBodyLanguage: 0,
    excitement: 0,
    avoidance: 0,
    disengagement: 0,
    stressSignals: 0,
    confidence: 0,
    summary: 'No dog is visible in the reaction clip.',
  };
  assert.equal(scoreReaction(noDog).result, 'RETRY');
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
