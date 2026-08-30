# Pawfect: the story every agent should protect

Pawfect is **Tinder for dogs, except the dog does the swiping**.

The product is a live magic trick with a clear causal chain:

```text
A dog watches another dog
        ↓
we record the reaction
        ↓
AI reads visible body language
        ↓
the dog effectively swipes
```

Every product, copy, visual, and engineering decision should make that story easier to understand in a 60–90 second hackathon demo.

## The audience experience

The candidate dog video is the stimulus and should dominate the browsing screen. The webcam clip is the deciding dog’s response. Keep both visible together when explaining a verdict so the audience instantly understands cause and effect.

During analysis, playful language may build suspense. At the verdict, the audience must see both the decision and the observable evidence behind it. Prefer memorable signals such as **Wag Wag**, **Eyes Locked**, **Play Mode**, and **Zero Side-Eye** over a wall of percentages. The underlying AI summary can remain available for transparency.

A match should feel celebratory. The puppy portrait is the encore: an obviously imaginative, non-scientific picture of the fictional puppy the two dogs might create. It must never be described as a breeding recommendation or biological prediction.

## Product truth

TwelveLabs is the observer. Pawfect is the judge.

Ask the video model only about observable canine body language: tail movement, attention, approach, posture, activity, avoidance, turning away, disengagement, tension, and stress. Do not ask whether the dog “likes” another dog, infer complex emotions, make medical claims, or make breeding recommendations.

Normalize the observations, then score them locally. A match requires enough positive evidence and sufficient confidence. Stress and avoidance are safety gates. If no dog is visible, the evidence is empty, or confidence is too low, return **Retry** rather than inventing Match or Pass.

Fallbacks are essential for demo reliability, but they must be honest. Never display fixture output as a successful live TwelveLabs analysis. Preserve the provider receipt and label demo fallbacks clearly.

## The only loop that matters

```text
LOOK → RECORD → ANALYZE → MATCH / PASS → NEXT DOG
```

Protect this loop from feature creep. Do not add authentication, profiles, databases, chat, location logic, reciprocal matching, recommendations, or owner workflows unless the product brief explicitly changes.

The app state should remain explicit: browsing, recording, analyzing, match, pass, or retry. The next candidate advances only from an intentional presenter action. Shuffle the ten local candidates, loop after all are shown, and avoid immediate repeats.

## Demo reliability rules

- Chrome on localhost is the primary environment.
- Keep webcam and prerecorded reaction modes on the same analysis path.
- Preserve the optional recording download for debugging.
- External API failures must resolve into a truthful fallback or retry state, never a fake live success.
- Start puppy generation opportunistically after frames are available so it can finish while the verdict is being revealed.
- Keep API keys server-side, out of client bundles, logs, commits, fixtures, archives, and screenshots.
- Make judge-facing receipts useful: prompt, provider, request status, source, and fallback reason.

## Visual voice

Pawfect is dark, theatrical, playful, and legible from a few feet away. Candidate video is the product; UI chrome is supporting cast. Use the established coral, mint, yellow, cream, and deep-plum palette. Favor bold verdicts, oversized readable labels, tactile sticker-like evidence cards, and purposeful motion.

Copy should sound like a confident dog-loving presenter: short, funny, and specific. “The tail has spoken” belongs here. Dense dashboards, tiny diagnostic typography, faux-scientific certainty, and generic SaaS language do not.

## Working in this repository

Preserve the small JavaScript React application and its existing architecture. Before handing off a change, run:

```bash
npm test
npm run lint
npm run build
```

Keep the story more important than the stack. A technically impressive change that makes the audience work harder to understand **dog watches → AI reads → dog swipes** is the wrong change.
