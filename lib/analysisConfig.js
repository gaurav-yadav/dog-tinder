export const TWELVELABS_MODEL = 'pegasus1.5';
export const TWELVELABS_ENDPOINT = 'https://api.twelvelabs.io/v1.3/analyze';

export const DOG_REACTION_PROMPT = `Find and analyze the primary dog visible anywhere in this video. The dog may appear directly in the camera frame or inside a video playing on a phone, tablet, monitor, or television. A dog shown on another screen is still the subject and must be analyzed.

Ignore everything that is not the dog: hands holding a device, people, the phone or screen frame, app controls, captions, reflections, room background, camera movement, and display glare. Focus only on the dog's visible body language within the displayed dog video.

The recording may begin with setup frames where only the back of a phone or the room is visible. Ignore those setup moments. Locate the portion where the dog appears, mentally crop to the screen containing the dog, and compare the dog's position and posture across multiple later frames. Do not judge the entire clip from its first frame.

Score each requested signal from 0.0 (absent) to 1.0 (very strong): tail wagging, movement toward the stimulus or camera, sustained visual attention, playful or loose body posture, excitement or activity, avoidance, disengagement or turning away, and tense or stressed body posture.

Do not report that no dog is visible merely because the dog appears on another screen. If a dog is visible but partially cropped, score the behaviors that can still be observed and lower confidence only as needed. Use zero scores and very low confidence only when no dog appears anywhere or no canine behavior can be observed at all.

Calibrate motion signals from the dog itself, not movement of the handheld phone. Side-to-side tail motion counts as tail wagging. Walking or leaning forward within the displayed video counts as approaching. Repeated orientation toward the in-screen camera or focal point counts as sustained attention. A loose gait, relaxed face, open mouth, play bow, or bouncy movement counts as playful body language. Visible walking, bouncing, or rapid movement must produce a nonzero excitement/activity score.

Do not interpret every open mouth or forward movement as playful. Distinguish a relaxed open mouth from visible warning or tension signals such as bared teeth, curled lips, a wrinkled muzzle, hard staring, stiff posture, lunging, snapping, or repeated forceful barking motion. When those warning signals are visible, lower playful body language and raise tense or stressed body posture substantially. Excitement by itself is not positive when the posture is tense or threatening.

Describe visible canine behavior only. Do not infer complex human emotions. Do not make medical claims or breeding recommendations. Return only the requested schema fields.`;

const score = { type: 'number' };

export const DOG_REACTION_SCHEMA = {
  type: 'object',
  properties: {
    tailWagging: score,
    approaching: score,
    sustainedAttention: score,
    playfulBodyLanguage: score,
    excitement: score,
    avoidance: score,
    disengagement: score,
    stressSignals: score,
    confidence: score,
    summary: { type: 'string' },
  },
  required: [
    'tailWagging',
    'approaching',
    'sustainedAttention',
    'playfulBodyLanguage',
    'excitement',
    'avoidance',
    'disengagement',
    'stressSignals',
    'confidence',
    'summary',
  ],
};
