'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fixWebmDuration } from '@fix-webm-duration/fix';
import {
  BrainCircuit,
  Camera,
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
import { ReactionCamera } from '@/components/ReactionCamera';
import { ReactionComparison } from '@/components/ReactionComparison';
import { SignalBars } from '@/components/SignalBars';
import { dogs } from '@/data/dogs';
import { reactionFixtures } from '@/data/reactionFixtures';
import {
  DOG_REACTION_PROMPT,
  TWELVELABS_ENDPOINT,
  TWELVELABS_MODEL,
} from '@/lib/analysisConfig';
import { shuffleDogs, takeNextDog } from '@/lib/candidateQueue';
import { scoreReaction } from '@/lib/scoring';

const analysisMessages = [
  'Reading tail telemetry…',
  'Checking attention span…',
  'Measuring zoomie intensity…',
  'Consulting the matchmaking department…',
];

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const debugSaveRecordings = process.env.NEXT_PUBLIC_DEBUG_SAVE_RECORDINGS === 'true';

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
  const [countdown, setCountdown] = useState(12);
  const [analysisMessage, setAnalysisMessage] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [reactionPreviewUrl, setReactionPreviewUrl] = useState('');
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');

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

  const advanceCandidate = useCallback(() => {
    clearReactionPreview();
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
  }, [clearReactionPreview]);

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
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (reactionPreviewUrlRef.current) URL.revokeObjectURL(reactionPreviewUrlRef.current);
  }, [clearRecordingTimers]);

  const analyzeReaction = useCallback(async (recordedBlob = null, recordingDownload = null) => {
    setError('');
    setAnalysis(null);
    setAnalysisMessage(0);
    setPhase('ANALYZING');

    const startedAt = Date.now();
    let payload;

    try {
      const formData = new FormData();
      formData.append('fixtureId', fixtureId);
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
        showReactionPreview(uploadBlob);
        const extension = uploadBlob.type.includes('mp4') ? 'mp4' : 'webm';
        formData.append('video', uploadBlob, `reaction.${extension}`);
      }

      const abortController = new AbortController();
      analysisAbortRef.current = abortController;
      const timeout = setTimeout(() => abortController.abort(), 70_000);
      const response = await fetch('/api/analyze-reaction', {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      });
      clearTimeout(timeout);
      analysisAbortRef.current = null;
      if (!response.ok) throw new Error('The reaction service did not respond.');
      payload = await response.json();
      if (!payload?.reaction || !['MATCH', 'PASS'].includes(payload.result)) {
        throw new Error('The reaction service returned an invalid result.');
      }
    } catch (requestError) {
      const localReaction = reactionFixtures[fixtureId]?.fallbackAnalysis || reactionFixtures.neutral.fallbackAnalysis;
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

    const remainingDemoTime = Math.max(0, 2600 - (Date.now() - startedAt));
    await delay(remainingDemoTime);
    setLastAnalysis(payload);
    setAnalysis(payload);
    await delay(800);
    setPhase(payload.result);
  }, [fixtureId, forceFallback, showReactionPreview]);

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
        // Keep a 12-second Chrome clip under the local/API upload ceiling.
        videoBitsPerSecond: 450_000,
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

        // Chrome MediaRecorder WebMs omit duration metadata. TwelveLabs reads those
        // otherwise-valid clips as 0 seconds, so patch the metadata before saving/uploading.
        const reactionBlob = rawReactionBlob.type.includes('webm')
          ? await fixWebmDuration(rawReactionBlob, recordedDuration)
          : rawReactionBlob;
        const recordingDownload = saveDebugRecording(reactionBlob);
        await analyzeReaction(reactionBlob, recordingDownload);
      };

      setCountdown(12);
      setPhase('RECORDING');
      recordingStartedAt = performance.now();
      recorder.start(250);

      recordingIntervalRef.current = setInterval(() => {
        const secondsLeft = Math.max(0, 12 - Math.floor((performance.now() - recordingStartedAt) / 1000));
        setCountdown(secondsLeft);
      }, 250);

      recordingTimeoutRef.current = setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, 12_000);
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

  const result = phase === 'MATCH' || phase === 'PASS' ? phase : null;
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

        <aside className="control-panel">
          {phase === 'BROWSING' && (
            <>
              <div className="eyebrow"><span>{String(candidateNumber).padStart(2, '0')}</span> Your dog decides</div>
              <div className="panel-heading">
                <h2>Let the tail<br />do the swiping.</h2>
                <p>Show your dog {currentDog.name}&apos;s clip. We record one short reaction and AI reads the visible body language.</p>
              </div>
              <div className="signal-preview" aria-label="Signals we will measure">
                <p>Watching for</p>
                <div><span>Tail telemetry</span><b>WAGS</b></div>
                <div><span>Visual attention</span><b>FOCUS</b></div>
                <div><span>Body posture</span><b>VIBES</b></div>
              </div>
            </>
          )}

          {phase === 'RECORDING' && (
            <div className="active-state recording-state" aria-live="polite">
              <div className="eyebrow recording-eyebrow"><span className="pulse-dot" /> Reaction recording</div>
              <div className="countdown-number">{countdown}<small>sec</small></div>
              <h2>Eyes on {currentDog.name}.</h2>
              <p>Watching for wags, wiggles, approaches, and walk-aways.</p>
              <div className="record-progress"><span style={{ width: `${((inputMode === 'webcam' ? 12 - countdown : 3 - countdown) / (inputMode === 'webcam' ? 12 : 3)) * 100}%` }} /></div>
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

          {(phase === 'MATCH' || phase === 'PASS') && analysis && (
            <div className="active-state result-state">
              <div className="eyebrow">
                {phase === 'MATCH' ? <Heart size={15} fill="currentColor" /> : <ShieldCheck size={15} />}
                Decision explained
              </div>
              <div className={`panel-verdict ${phase === 'MATCH' ? 'positive' : 'negative'}`}>
                <span>{phase === 'MATCH' ? 'MATCH' : 'PASS'}</span>
                <b>{analysis.score > 0 ? '+' : ''}{analysis.score.toFixed(2)}</b>
              </div>
              <SignalBars reaction={analysis.reaction} compact />
              <p className="reaction-summary">“{analysis.reaction.summary}”</p>
              {demoOpen && <small className="analysis-source">Source: {analysis.source}</small>}
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
                  <small>{inputMode === 'webcam' ? '12 second camera check' : `${reactionFixtures[fixtureId].label} · quick demo`}</small>
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
            {(phase === 'MATCH' || phase === 'PASS') && (
              <button className="start-button incoming-button" type="button" onClick={advanceCandidate}>
                <Sparkles size={20} /> Next dog
              </button>
            )}
            <p className="privacy-note"><ShieldCheck size={11} /> Camera stays on only for one short reaction clip.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
