const FRAME_MAX_EDGE = 900;
const MEDIA_TIMEOUT_MS = 12_000;

function waitForMedia(target, eventName) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('The dog video took too long to prepare.'));
    }, MEDIA_TIMEOUT_MS);
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('The dog video could not be read.'));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      target.removeEventListener(eventName, onReady);
      target.removeEventListener('error', onError);
    };
    target.addEventListener(eventName, onReady, { once: true });
    target.addEventListener('error', onError, { once: true });
  });
}

function drawFrame(video) {
  if (!video?.videoWidth || !video?.videoHeight) {
    throw new Error('No visible dog frame was available.');
  }

  const scale = Math.min(1, FRAME_MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Chrome could not capture the dog frame.');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Chrome could not encode the dog frame.')),
      'image/jpeg',
      0.88,
    );
  });
}

export async function capturePlayingVideoFrame(video) {
  if (video?.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    await waitForMedia(video, 'loadeddata');
  }
  return drawFrame(video);
}

export async function captureVideoSourceFrame(source, seekRatio = 0.65) {
  const video = document.createElement('video');
  const objectUrl = source instanceof Blob ? URL.createObjectURL(source) : '';
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = objectUrl || source;

  try {
    video.load();
    await waitForMedia(video, 'loadedmetadata');
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const targetTime = Math.max(0, duration * seekRatio);
    if (targetTime > 0.05) {
      const sought = waitForMedia(video, 'seeked');
      video.currentTime = targetTime;
      await sought;
    } else if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await waitForMedia(video, 'loadeddata');
    }
    return await drawFrame(video);
  } finally {
    video.removeAttribute('src');
    video.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
