# Pawfect

> **Tinder for dogs, except the dog does the swiping.**

A candidate dog appears on screen. Your dog watches. Pawfect records one short reaction and asks video AI to read only what it can see: a wagging tail, locked-in attention, forward movement, playful posture, avoidance, disengagement, or stress.

Those visible signals become one wonderfully simple verdict:

```text
LOOK → RECORD → AI READS THE REACTION → MATCH / PASS
```

No profiles. No compatibility questionnaire. No human pretending to know what the dog wants. **The tail has spoken.**

## The demo moment

1. A looping candidate video fills the screen.
2. Press **Start Reaction** and point the camera at the deciding dog.
3. The candidate keeps playing while Pawfect captures a short reaction.
4. TwelveLabs reads the observable canine body language.
5. Pawfect turns those signals into playful evidence—**Wag Wag**, **Eyes Locked**, **Play Mode**, and **Zero Side-Eye**—then makes the final call.
6. A positive reaction becomes **It’s a Match**.
7. While the verdict is revealed, a second AI imagines the match’s impossible, adorable puppy portrait.

The entire idea should be clear in under a minute: **a dog watches another dog, AI understands the reaction, and the dog effectively swipes.**

## What the AI is judging

Pawfect never asks an AI to invent a dog’s feelings. It asks for observable body-language signals on a `0.0–1.0` scale:

- tail wagging, sustained attention, approaching, loose/playful posture, and excitement;
- avoidance, disengagement, and tense or stressed posture;
- confidence and a concise visual summary.

TwelveLabs handles perception. Pawfect owns the decision. Positive signals add to the reaction score; avoidance, disengagement, and stress subtract from it. Low-confidence or visually empty clips ask for another take instead of manufacturing a verdict. Strong stress or avoidance cannot become a match simply because another positive signal was high.

The puppy portrait is a playful post-match flourish, not a biological or breeding prediction.

## Built for a live hackathon demo

The live webcam path is the hero, but the show must survive venue Wi-Fi and camera surprises. The **Demo** drawer can use prerecorded reactions and clearly labeled local analysis fixtures. Candidate videos are shuffled continuously, never repeat back-to-back, and advance only when the presenter chooses **Next dog**.

For judge-facing transparency, the demo receipt can show whether TwelveLabs was actually called, the prompt sent, the provider response status, and whether a fallback was used.

## Run the show

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` in Chrome. Camera recording requires localhost or HTTPS.

Add server-side credentials to `.env.local`:

```text
TWELVELABS_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
```

Never prefix secret keys with `NEXT_PUBLIC_` and never commit `.env.local`.

## Demo media

The ten feed clips live in `public/dog-videos/` as `dog-01.mp4` through `dog-10.mp4`.

Optional prerecorded reactions live in `public/reactions/` as `positive-01.mp4`, `positive-02.mp4`, `neutral.mp4`, and `negative.mp4`. Their stored analysis fixtures keep the presentation moving if an external service is unavailable, while the UI identifies that result as a demo fallback rather than a live AI verdict.

To download each completed webcam clip into Chrome Downloads while debugging:

```text
NEXT_PUBLIC_DEBUG_SAVE_RECORDINGS=true
```

## Confidence check

```bash
npm test
npm run lint
npm run build
```

That is all the machinery the audience needs to believe the trick: **look, react, analyze, decide, next dog.**
