'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BrainCircuit,
  Camera,
  Eye,
  Heart,
  LoaderCircle,
  PawPrint,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
} from 'lucide-react';
import { CandidateMedia } from '@/components/CandidateMedia';
import { DemoControls } from '@/components/DemoControls';
import { MatchVerdictPanel } from '@/components/MatchVerdictPanel';
import { PuppyDialog } from '@/components/PuppyDialog';
import { ReactionCamera } from '@/components/ReactionCamera';
import { ReactionComparison } from '@/components/ReactionComparison';
import { SignalBars } from '@/components/SignalBars';
import { dogs } from '@/data/dogs';
import { reactionFixtures, safeFallbackReaction } from '@/data/reactionFixtures';
import {
  DOG_REACTION_PROMPT,
  TWELVELABS_ENDPOINT,
  TWELVELABS_MODEL,
} from '@/lib/analysisConfig';
import { shuffleDogs, takeNextDog } from '@/lib/candidateQueue';
import { scoreReaction } from '@/lib/scoring';
import { capturePlayingVideoFrame, captureVideoSourceFrame } from '@/lib/videoFrames';

const analysisMessages = [
  'Reading tail telemetry…',
  'Checking attention span…',
  'Measuring zoomie intensity…',
  'Consulting the matchmaking department…',
];

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const debugSaveRecordings = process.env.NEXT_PUBLIC_DEBUG_SAVE_RECORDINGS === 'true';
const LIVE_REACTION_SECONDS = 10;
const MIN_ANALYSIS_REVEAL_MS = 5_000;
const SIGNAL_REVEAL_MS = 800;

function saveDebugRecording(recordingBlob) {
  if (!debugSaveRecordings || !recordingBlob?.size) return null;

  const completedAt = new Date();
  const timestamp = completedAt.toISOString().replace(/[:.]/g, '-');
  const extension = recordingBlob.type.includes('mp4') ? 'mp4' : 'webm';
  const filename = `pawfect-reaction-${timestamp}.${extension}`;
  const objectUrl = URL.createObjectURL(recordingBlob);
  const downloadLink = document.createElement('a');

  downloadLink.href = objectUrl;
  downloadLink.download = filename;
  downloadLink.hidden = true;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

  return {
    recordedToDisk: true,
    recordingFilename: filename,
    recordingLocation: 'Chrome Downloads (browser-managed)',
    recordingSavedAt: completedAt.toISOString(),
  };
}

function getRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  return [
    // A finalized MP4 is the most reliable direct upload for TwelveLabs. Current
    // Chrome exposes MP4 MediaRecorder support through isTypeSupported().
    'video/mp4',
    'video/mp4;codecs=avc1.42E01E',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ].find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

export default function Home() {
  const [phase, setPhase] = useState('BROWSING');
  const [currentDog, setCurrentDog] = useState(dogs[0]);
  const [candidateNumber, setCandidateNumber] = useState(1);
  const [inputMode, setInputMode] = useState('webcam');
  const [fixtureId, setFixtureId] = useState('positive-01');
  const [forceFallback, setForceFallback] = useState(false);
  const [demoEnabled, setDemoEnabled] = useState(process.env.NEXT_PUBLIC_DEMO_MODE === 'true');
  const [demoOpen, setDemoOpen] = useState(false);
  const [countdown, setCountdown] = useState(LIVE_REACTION_SECONDS);
  const [analysisMessage, setAnalysisMessage] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [reactionPreviewUrl, setReactionPreviewUrl] = useState('');
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [puppy, setPuppy] = useState({ status: 'idle', imageUrl: '', error: '', elapsedMs: null });
  const [puppyOpen, setPuppyOpen] = useState(false);

  const queueRef = useRef([]);
  const currentDogRef = useRef(dogs[0]);
  const candidateVideoRef = useRef(null);
  const mainActionRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const cancelledRef = useRef(false);
  const recordingIntervalRef = useRef(null);
  const recordingTimeoutRef = useRef(null);
  const analysisAbortRef = useRef(null);
  const reactionPreviewUrlRef = useRef('');
  const puppyImageUrlRef = useRef('');
  const puppyAbortRef = useRef(null);
  const puppyJobRef = useRef(0);
  const puppyFramesRef = useRef(null);

  const clearRecordingTimers = useCallback(() => {
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
    recordingIntervalRef.current = null;
    recordingTimeoutRef.current = null;
  }, []);

  const releaseCamera = useCallback((targetStream = streamRef.current) => {
    targetStream?.getTracks().forEach((track) => track.stop());
    if (targetStream === streamRef.current) streamRef.current = null;
    setStream(null);
  }, []);

  const clearReactionPreview = useCallback(() => {
    if (reactionPreviewUrlRef.current) URL.revokeObjectURL(reactionPreviewUrlRef.current);
    reactionPreviewUrlRef.current = '';
    setReactionPreviewUrl('');
  }, []);

  const showReactionPreview = useCallback((blob) => {
    if (!blob?.size) return;
    if (reactionPreviewUrlRef.current) URL.revokeObjectURL(reactionPreviewUrlRef.current);
    const previewUrl = URL.createObjectURL(blob);
    reactionPreviewUrlRef.current = previewUrl;
    setReactionPreviewUrl(previewUrl);
  }, []);

  const clearPuppy = useCallback(() => {
    puppyJobRef.current += 1;
    puppyAbortRef.current?.abort();
    puppyAbortRef.current = null;
    puppyFramesRef.current = null;
    if (puppyImageUrlRef.current) URL.revokeObjectURL(puppyImageUrlRef.current);
    puppyImageUrlRef.current = '';
    setPuppy({ status: 'idle', imageUrl: '', error: '', elapsedMs: null });
    setPuppyOpen(false);
  }, []);

  const requestPuppyImage = useCallback(async (frames, jobId) => {
    const abortController = new AbortController();
    puppyAbortRef.current?.abort();
    puppyAbortRef.current = abortController;
    const startedAt = performance.now();
    setPuppy({ status: 'generating', imageUrl: '', error: '', elapsedMs: null });

    try {
      const formData = new FormData();
      formData.append('candidateFrame', frames.candidateFrame, 'candidate.jpg');
      formData.append('reactionFrame', frames.reactionFrame, 'reaction.jpg');
      const response = await fetch('/api/generate-puppy', {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Puppy generation failed.');
      }
      const imageBlob = await response.blob();
      if (!imageBlob.size || !imageBlob.type.startsWith('image/')) {
        throw new Error('The puppy generator returned an invalid image.');
      }
      if (puppyJobRef.current !== jobId) return;
      if (puppyImageUrlRef.current) URL.revokeObjectURL(puppyImageUrlRef.current);
      const imageUrl = URL.createObjectURL(imageBlob);
      puppyImageUrlRef.current = imageUrl;
      puppyAbortRef.current = null;
      setPuppy({
        status: 'ready',
        imageUrl,
        error: '',
        elapsedMs: Math.round(performance.now() - startedAt),
      });
    } catch (generationError) {
      if (generationError instanceof DOMException && generationError.name === 'AbortError') return;
      if (puppyJobRef.current !== jobId) return;
      puppyAbortRef.current = null;
      setPuppy({
        status: 'error',
        imageUrl: '',
        error: generationError instanceof Error ? generationError.message : 'Puppy generation failed.',
        elapsedMs: Math.round(performance.now() - startedAt),
      });
    }
  }, []);

  const startPuppyGeneration = useCallback(async (reactionBlob) => {
    const jobId = puppyJobRef.current + 1;
    puppyJobRef.current = jobId;
    setPuppy({ status: 'generating', imageUrl: '', error: '', elapsedMs: null });

    try {
      const currentDogId = currentDogRef.current.id;
      const fallbackDog = dogs.find((dog) => dog.id !== currentDogId) || dogs[0];
      const [candidateFrame, reactionFrame] = await Promise.all([
        capturePlayingVideoFrame(candidateVideoRef.current),
        reactionBlob?.size
          ? captureVideoSourceFrame(reactionBlob)
          : captureVideoSourceFrame(fallbackDog.videoUrl),
      ]);
      if (puppyJobRef.current !== jobId) return;
      const frames = { candidateFrame, reactionFrame };
      puppyFramesRef.current = frames;
      await requestPuppyImage(frames, jobId);
    } catch (captureError) {
      if (puppyJobRef.current !== jobId) return;
      setPuppy({
        status: 'error',
        imageUrl: '',
        error: captureError instanceof Error ? captureError.message : 'Dog snapshots could not be captured.',
        elapsedMs: null,
      });
    }
  }, [requestPuppyImage]);

  const retryPuppyGeneration = useCallback(() => {
    const frames = puppyFramesRef.current;
    if (!frames) {
      setPuppy({ status: 'error', imageUrl: '', error: 'Both dog clips are needed.', elapsedMs: null });
      return;
    }
    const jobId = puppyJobRef.current + 1;
    puppyJobRef.current = jobId;
    void requestPuppyImage(frames, jobId);
  }, [requestPuppyImage]);

  const advanceCandidate = useCallback(() => {
    clearReactionPreview();
    clearPuppy();
    const previousId = currentDogRef.current.id;
    const next = takeNextDog(queueRef.current, dogs, previousId);
    queueRef.current = next.queue;
    currentDogRef.current = next.dog;
    setCurrentDog(next.dog);
    setCandidateNumber((value) => (value >= dogs.length ? 1 : value + 1));
    setAnalysis(null);
    setError('');
    setPhase('BROWSING');
    setTimeout(() => mainActionRef.current?.focus(), 50);
  }, [clearPuppy, clearReactionPreview]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const firstQueue = shuffleDogs(dogs);
      const firstDog = firstQueue.shift();
      queueRef.current = firstQueue;
      currentDogRef.current = firstDog;
      setCurrentDog(firstDog);

      const search = new URLSearchParams(window.location.search);
      if (search.get('demo') === 'true') setDemoEnabled(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== 'ANALYZING' || analysis) return undefined;
    const interval = setInterval(() => {
      setAnalysisMessage((index) => (index + 1) % analysisMessages.length);
    }, 850);
    return () => clearInterval(interval);
  }, [phase, analysis]);

  useEffect(() => () => {
    clearRecordingTimers();
    analysisAbortRef.current?.abort();
    puppyAbortRef.current?.abort();
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (reactionPreviewUrlRef.current) URL.revokeObjectURL(reactionPreviewUrlRef.current);
    if (puppyImageUrlRef.current) URL.revokeObjectURL(puppyImageUrlRef.current);
  }, [clearRecordingTimers]);

  const analyzeReaction = useCallback(async (recordedBlob = null, recordingDownload = null) => {
    setError('');
    setAnalysis(null);
    setAnalysisMessage(0);
    setPhase('ANALYZING');

    const startedAt = Date.now();
    let payload;
    let puppyReactionBlob = recordedBlob;

    try {
      const formData = new FormData();
      formData.append('fixtureId', fixtureId);
      formData.append('inputMode', inputMode);
      formData.append('forceFallback', String(forceFallback));

      let uploadBlob = recordedBlob;
      if (!uploadBlob && reactionFixtures[fixtureId]) {
        try {
          const fixtureResponse = await fetch(reactionFixtures[fixtureId].videoUrl, { cache: 'no-store' });
          if (fixtureResponse.ok) {
            const fixtureBlob = await fixtureResponse.blob();
            if (fixtureBlob.size > 0) uploadBlob = fixtureBlob;
          }
        } catch {
          // The fixture JSON remains a guaranteed demo fallback when the clip is absent.
        }
      }

      if (uploadBlob) {
        puppyReactionBlob = uploadBlob;
        showReactionPreview(uploadBlob);
        const extension = uploadBlob.type.includes('mp4') ? 'mp4' : 'webm';
        formData.append('video', uploadBlob, `reaction.${extension}`);
      }

      // Start the visual payoff as soon as both clips exist. OpenRouter then runs
      // in parallel with TwelveLabs, hiding most of its ~30s latency behind analysis.
      void startPuppyGeneration(puppyReactionBlob);

      const abortController = new AbortController();
      analysisAbortRef.current = abortController;
      // TwelveLabs can take close to a minute under load; leave enough headroom
      // for its server-side timeout and response transfer.
      const timeout = setTimeout(() => abortController.abort(), 100_000);
      const response = await fetch('/api/analyze-reaction', {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      });
      clearTimeout(timeout);
      analysisAbortRef.current = null;
      if (!response.ok) throw new Error('The reaction service did not respond.');
      payload = await response.json();
      if (!payload?.reaction || !['MATCH', 'PASS', 'RETRY'].includes(payload.result)) {
        throw new Error('The reaction service returned an invalid result.');
      }
    } catch (requestError) {
      const localReaction = inputMode === 'fixture'
        ? reactionFixtures[fixtureId]?.fallbackAnalysis || safeFallbackReaction
        : safeFallbackReaction;
      payload = {
        ...scoreReaction(localReaction),
        source: 'client-fallback',
        fallbackReason: requestError instanceof Error ? requestError.message : 'Analysis failed.',
        analysisReceipt: {
          provider: 'TwelveLabs',
          attempted: true,
          succeeded: false,
          model: TWELVELABS_MODEL,
          endpoint: TWELVELABS_ENDPOINT,
          prompt: DOG_REACTION_PROMPT,
          requestId: null,
          finishReason: null,
          recordedToDisk: false,
          completedAt: new Date().toISOString(),
        },
      };
    }

    payload = {
      ...payload,
      analysisReceipt: {
        ...payload.analysisReceipt,
        recordedToDisk: Boolean(recordingDownload),
        recordingFilename: recordingDownload?.recordingFilename || null,
        recordingLocation: recordingDownload?.recordingLocation || null,
        recordingSavedAt: recordingDownload?.recordingSavedAt || null,
      },
    };

    if (payload.result !== 'MATCH') clearPuppy();

    const remainingDemoTime = Math.max(
      0,
      MIN_ANALYSIS_REVEAL_MS - SIGNAL_REVEAL_MS - (Date.now() - startedAt),
    );
    await delay(remainingDemoTime);
    setLastAnalysis(payload);
    setAnalysis(payload);
    await delay(SIGNAL_REVEAL_MS);
    setPhase(payload.result);
  }, [clearPuppy, fixtureId, forceFallback, inputMode, showReactionPreview, startPuppyGeneration]);

  const stopRecording = useCallback((cancel = false) => {
    cancelledRef.current = cancel;
    clearRecordingTimers();

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
      return;
    }

    if (cancel) {
      releaseCamera();
      setPhase('BROWSING');
    }
  }, [clearRecordingTimers, releaseCamera]);

  const startWebcamRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Chrome could not start video recording here. Use the demo reaction instead.');
      setInputMode('fixture');
      return;
    }

    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = cameraStream;
      setStream(cameraStream);
      chunksRef.current = [];
      cancelledRef.current = false;

      const mimeType = getRecorderMimeType();
      let recordingStartedAt = 0;
      const recorder = new MediaRecorder(cameraStream, {
        ...(mimeType ? { mimeType } : {}),
        // Keep a 10-second Chrome clip under the local/API upload ceiling.
        videoBitsPerSecond: 450_000,
        // Give downstream analyzers seekable frames throughout the clip instead
        // of a single opening keyframe that only shows phone-positioning setup.
        videoKeyFrameIntervalDuration: 1_000,
      });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        clearRecordingTimers();
        const rawReactionBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        const recordedDuration = Math.max(0, performance.now() - recordingStartedAt);
        chunksRef.current = [];
        recorderRef.current = null;
        releaseCamera(cameraStream);

        if (cancelledRef.current) {
          setPhase('BROWSING');
          return;
        }

        if (!rawReactionBlob.size) {
          setError('The camera clip was empty. Try again or use the demo reaction.');
          setPhase('BROWSING');
          return;
        }

        if (recordedDuration < 4_000) {
          setError('Record for at least 4 seconds so TwelveLabs can analyze the clip.');
          setPhase('BROWSING');
          return;
        }

        // Do not mutate the container after Chrome finalizes it. The old WebM
        // duration patch corrupted multi-keyframe recordings and caused
        // TwelveLabs to return video_file_broken.
        const recordingDownload = saveDebugRecording(rawReactionBlob);
        await analyzeReaction(rawReactionBlob, recordingDownload);
      };

      recorder.onerror = () => {
        clearRecordingTimers();
        releaseCamera(cameraStream);
        chunksRef.current = [];
        recorderRef.current = null;
        setError('Chrome could not finish this recording. Try again or use the demo reaction.');
        setPhase('BROWSING');
      };

      setCountdown(LIVE_REACTION_SECONDS);
      setPhase('RECORDING');
      recordingStartedAt = performance.now();
      // Let Chrome emit one complete, finalized file when stop() is called.
      // Timesliced MP4/WebM fragments are not valid standalone upload files.
      recorder.start();

      recordingIntervalRef.current = setInterval(() => {
        const secondsLeft = Math.max(
          0,
          LIVE_REACTION_SECONDS - Math.floor((performance.now() - recordingStartedAt) / 1000),
        );
        setCountdown(secondsLeft);
      }, 250);

      recordingTimeoutRef.current = setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, LIVE_REACTION_SECONDS * 1_000);
    } catch {
      releaseCamera();
      setInputMode('fixture');
      setError('Camera access was unavailable. Demo reaction mode is ready instead.');
      setPhase('BROWSING');
    }
  }, [analyzeReaction, clearRecordingTimers, releaseCamera]);

  const startFixtureRecording = useCallback(() => {
    setCountdown(3);
    setPhase('RECORDING');
    let remaining = 3;
    recordingIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(Math.max(0, remaining));
    }, 1000);
    recordingTimeoutRef.current = setTimeout(() => {
      clearRecordingTimers();
      void analyzeReaction();
    }, 3000);
  }, [analyzeReaction, clearRecordingTimers]);

  const startReaction = useCallback(() => {
    if (phase !== 'BROWSING') return;
    setError('');
    clearReactionPreview();
    candidateVideoRef.current?.play().catch(() => {});
    if (inputMode === 'webcam') void startWebcamRecording();
    else startFixtureRecording();
  }, [clearReactionPreview, inputMode, phase, startFixtureRecording, startWebcamRecording]);

  const retryReaction = useCallback(() => {
    clearReactionPreview();
    clearPuppy();
    setAnalysis(null);
    setError('');
    setPhase('BROWSING');
    setTimeout(() => mainActionRef.current?.focus(), 50);
  }, [clearPuppy, clearReactionPreview]);

  const finishEarly = useCallback(() => {
    if (inputMode === 'webcam') stopRecording(false);
    else {
      clearRecordingTimers();
      void analyzeReaction();
    }
  }, [analyzeReaction, clearRecordingTimers, inputMode, stopRecording]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && phase === 'RECORDING') stopRecording(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, stopRecording]);

  const result = ['MATCH', 'PASS', 'RETRY'].includes(phase) ? phase : null;
  const busy = phase !== 'BROWSING';

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main-stage" aria-label="Pawfect home">
          <span className="brand-mark"><PawPrint size={20} /></span>
          <span>PAWFECT</span>
        </a>
        <div className="candidate-count" aria-label={`Candidate ${candidateNumber} of ${dogs.length}`}>
          {dogs.map((dog, index) => (
            <span className={index + 1 === candidateNumber ? 'active' : ''} key={dog.id} />
          ))}
        </div>
        {demoEnabled ? (
          <button
            className={`demo-pill ${demoOpen ? 'active' : ''}`}
            type="button"
            aria-expanded={demoOpen}
            onClick={() => setDemoOpen((value) => !value)}
          >
            <Settings2 size={15} /> Demo
          </button>
        ) : <span />}
      </header>

      <DemoControls
        open={demoEnabled && demoOpen}
        inputMode={inputMode}
        fixtureId={fixtureId}
        forceFallback={forceFallback}
        lastAnalysis={lastAnalysis}
        disabled={busy}
        onInputMode={setInputMode}
        onFixture={setFixtureId}
        onForceFallback={setForceFallback}
      />

      <PuppyDialog
        open={puppyOpen}
        puppy={puppy}
        onClose={() => setPuppyOpen(false)}
        onRetry={retryPuppyGeneration}
      />

      <section className="demo-grid" id="main-stage">
        <article
          className={`candidate-card phase-${phase.toLowerCase()} ${result ? `result-${result.toLowerCase()}` : ''}`}
          style={{ '--dog-accent': currentDog.accent }}
        >
          {result ? (
            <ReactionComparison
              dog={currentDog}
              reactionUrl={reactionPreviewUrl}
              result={result}
            />
          ) : (
            <>
              <CandidateMedia
                key={currentDog.id}
                dog={currentDog}
                phase={phase}
                videoRef={candidateVideoRef}
                candidateNumber={candidateNumber}
              />
              <ReactionCamera stream={stream} phase={phase} countdown={countdown} inputMode={inputMode} />
            </>
          )}
        </article>

        <aside className={`control-panel control-${phase.toLowerCase()}`}>
          {phase === 'BROWSING' && (
            <>
              <div className="browse-brand" aria-label="Pawfect — canine chemistry powered by AI">
                <span className="browse-brand-mark"><PawPrint /></span>
                <span><strong>PAWFECT</strong><small>Canine chemistry · read by AI</small></span>
              </div>
              <div className="eyebrow browse-eyebrow"><span>{String(candidateNumber).padStart(2, '0')}</span> Your dog decides <Heart size={14} fill="currentColor" /></div>
              <div className="panel-heading">
                <h2>Let the tail<br />do the swiping.</h2>
                <p>Show your dog {currentDog.name}&apos;s clip. We capture one short reaction, then AI reads the visible dog body language.</p>
              </div>
              <div className="signal-preview" aria-label="Signals we will measure">
                <p><Sparkles size={15} /> AI is watching for</p>
                <div className="signal-preview-list">
                  <div className="signal-preview-card">
                    <span className="signal-preview-icon"><PawPrint /></span>
                    <span><strong>Tail telemetry</strong><small>Every wag tells a story</small></span>
                    <b>WAGS</b>
                  </div>
                  <div className="signal-preview-card">
                    <span className="signal-preview-icon"><Eye /></span>
                    <span><strong>Visual attention</strong><small>Eyes locked on the candidate</small></span>
                    <b>FOCUS</b>
                  </div>
                  <div className="signal-preview-card">
                    <span className="signal-preview-icon"><Sparkles /></span>
                    <span><strong>Body posture</strong><small>Loose, playful, or not today</small></span>
                    <b>VIBES</b>
                  </div>
                </div>
              </div>
            </>
          )}

          {phase === 'RECORDING' && (
            <div className="active-state recording-state" aria-live="polite">
              <div className="eyebrow recording-eyebrow"><span className="pulse-dot" /> Reaction recording</div>
              <div className="countdown-number">{countdown}<small>sec</small></div>
              <h2>Eyes on {currentDog.name}.</h2>
              <p>Keep the reacting dog—or the phone playing it—large and centered. Watching for wags, wiggles, approaches, and walk-aways.</p>
              <div className="record-progress"><span style={{ width: `${((inputMode === 'webcam' ? LIVE_REACTION_SECONDS - countdown : 3 - countdown) / (inputMode === 'webcam' ? LIVE_REACTION_SECONDS : 3)) * 100}%` }} /></div>
            </div>
          )}

          {phase === 'ANALYZING' && (
            <div className="active-state analysis-state">
              <div className="eyebrow"><BrainCircuit size={15} /> TwelveLabs vision</div>
              {!analysis ? (
                <output className="analysis-loader" aria-live="polite">
                  <LoaderCircle size={42} />
                  <h2>Decoding the<br />canine verdict.</h2>
                  <p>{analysisMessages[analysisMessage]}</p>
                </output>
              ) : (
                <>
                  <h2 className="signals-heading">Visible signals</h2>
                  <SignalBars reaction={analysis.reaction} />
                  <p className="reaction-summary">“{analysis.reaction.summary}”</p>
                </>
              )}
            </div>
          )}

          {phase === 'MATCH' && analysis && (
            <MatchVerdictPanel
              analysis={analysis}
              showSource={demoOpen || analysis.source !== 'twelvelabs'}
            />
          )}

          {['PASS', 'RETRY'].includes(phase) && analysis && (
            <div className="active-state result-state">
              <div className="eyebrow">
                {phase === 'RETRY' ? <Camera size={15} /> : <ShieldCheck size={15} />}
                {phase === 'RETRY' ? 'Capture check' : 'Decision explained'}
              </div>
              <div className={`panel-verdict ${phase === 'RETRY' ? 'retry' : 'negative'}`}>
                <span>{phase === 'RETRY' ? 'NO DOG' : 'PASS'}</span>
                <b>{phase === 'RETRY' ? 'NOT SCORED' : `${analysis.score > 0 ? '+' : ''}${analysis.score.toFixed(2)}`}</b>
              </div>
              {phase === 'RETRY' ? (
                <div className="capture-warning">
                  <Camera size={22} />
                  <div>
                    <strong>No usable reaction was captured.</strong>
                    <p>{analysis.reaction.summary}</p>
                  </div>
                </div>
              ) : (
                <>
                  <SignalBars reaction={analysis.reaction} compact />
                  <p className="reaction-summary">“{analysis.reaction.summary}”</p>
                </>
              )}
              {(demoOpen || analysis.source !== 'twelvelabs') && (
                <small className={`analysis-source ${analysis.source !== 'twelvelabs' ? 'fallback-source' : ''}`}>
                  {analysis.source === 'twelvelabs' ? 'Source: TwelveLabs' : 'Demo fallback · not a live AI verdict'}
                </small>
              )}
            </div>
          )}

          {error && (
            <div className="error-message" role="alert">
              <Camera size={18} />
              <span>{error}</span>
              <button type="button" onClick={() => { setInputMode('fixture'); setError(''); }}>Use demo reaction</button>
            </div>
          )}

          <div className="action-area">
            {phase === 'BROWSING' && (
              <button ref={mainActionRef} className="start-button" type="button" onClick={startReaction}>
                <span className="button-icon"><PawPrint size={23} /></span>
                <span>
                  <b>Start reaction</b>
                  <small>{inputMode === 'webcam' ? '10 second camera check' : `${reactionFixtures[fixtureId].label} · quick demo`}</small>
                </span>
                <Heart className="button-heart" size={21} fill="currentColor" />
              </button>
            )}
            {phase === 'RECORDING' && (
              <div className="record-actions">
                <button className="finish-button" type="button" onClick={finishEarly}><Square size={16} fill="currentColor" /> Finish & analyze</button>
                <button className="cancel-button" type="button" onClick={() => stopRecording(true)}>Cancel</button>
              </div>
            )}
            {phase === 'ANALYZING' && (
              <button className="start-button analyzing-button" type="button" disabled>
                <LoaderCircle className="spin" size={22} /> AI is watching the reaction
              </button>
            )}
            {phase === 'MATCH' && (
              <div className="match-actions">
                <button className="start-button puppy-button" type="button" onClick={() => setPuppyOpen(true)}>
                  <span className="button-icon"><PawPrint size={23} /></span>
                  <span>
                    <b>{puppy.status === 'ready' ? 'The puppy has arrived' : puppy.status === 'error' ? 'Reopen the puppy portal' : 'Open the puppy portal'}</b>
                    <small>
                      {puppy.status === 'ready'
                        ? `Ready to hatch${puppy.elapsedMs ? ` · ${(puppy.elapsedMs / 1000).toFixed(1)}s` : ''}`
                        : puppy.status === 'error'
                          ? 'The portal needs another try'
                          : 'Combining ears, markings & floof'}
                    </small>
                  </span>
                  {puppy.status === 'generating' ? <LoaderCircle className="spin" size={21} /> : <Heart size={21} fill="currentColor" />}
                </button>
                <button className="next-dog-secondary" type="button" onClick={advanceCandidate}>
                  <Sparkles size={17} /> Next dog
                </button>
              </div>
            )}
            {phase === 'PASS' && (
              <button className="start-button incoming-button" type="button" onClick={advanceCandidate}>
                <Sparkles size={20} /> Next dog
              </button>
            )}
            {phase === 'RETRY' && (
              <button className="start-button retry-button" type="button" onClick={retryReaction}>
                <Camera size={20} /> Record this dog again
              </button>
            )}
            <p className="privacy-note"><ShieldCheck size={11} /> Camera stays on only for one short reaction clip.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
