# Pawfect

Tinder for dogs, where AI watches your dog’s reaction and lets the dog swipe.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` in Chrome. Camera recording requires localhost or HTTPS.

Add your TwelveLabs key to `.env.local`:

```text
TWELVELABS_API_KEY=your_key_here
```

## Candidate videos

Drop the ten feed clips into `public/dog-videos/` with these exact names:

```text
dog-01.mp4
dog-02.mp4
dog-03.mp4
dog-04.mp4
dog-05.mp4
dog-06.mp4
dog-07.mp4
dog-08.mp4
dog-09.mp4
dog-10.mp4
```

Until a clip exists, its candidate automatically uses a polished photo placeholder.

Optional prerecorded reaction clips belong in `public/reactions/` as `positive-01.mp4`, `positive-02.mp4`, `neutral.mp4`, and `negative.mp4`. Their stored analysis fixtures keep the demo working even when the files, camera, or TwelveLabs are unavailable.

Use the **Demo** control to switch between prerecorded and webcam reactions or force the fallback path.

To keep a local copy of every completed webcam reaction while debugging, set:

```text
NEXT_PUBLIC_DEBUG_SAVE_RECORDINGS=true
```

Chrome will download each clip before analysis with a timestamped `pawfect-reaction-*.webm` filename. The demo analysis receipt shows the exact filename and reports the location as Chrome Downloads; browsers do not expose the absolute Downloads folder path to the page.

## Checks

```bash
npm test
npm run lint
npm run build
```
