import {
  Dog,
  Eye,
  Gamepad2,
  Heart,
  MessageCircleMore,
  ShieldCheck,
} from 'lucide-react';

function barkTranslation(reaction) {
  if (reaction.tailWagging >= 0.7 && reaction.playfulBodyLanguage >= 0.7) {
    return 'Okay human, I want to meet this one.';
  }
  if (reaction.approaching >= 0.65) return 'Can we go say hello now?';
  if (reaction.sustainedAttention >= 0.7) return 'This one has my full attention.';
  return 'The vibes are looking very promising.';
}

function signalTone(value, strongAt = 0.6) {
  return value >= strongAt ? 'loud' : value >= 0.3 ? 'clear' : 'quiet';
}

export function MatchVerdictPanel({ analysis, showSource }) {
  const reaction = analysis.reaction;
  const stickers = [
    {
      key: 'wag',
      Icon: Dog,
      tone: signalTone(reaction.tailWagging),
      title: reaction.tailWagging >= 0.6 ? 'WAG WAG!' : 'TAIL AT REST',
      detail: reaction.tailWagging >= 0.6 ? 'Tail signal detected' : 'A quieter kind of yes',
    },
    {
      key: 'focus',
      Icon: Eye,
      tone: signalTone(reaction.sustainedAttention),
      title: reaction.sustainedAttention >= 0.6 ? 'EYES LOCKED' : 'CURIOUS GLANCE',
      detail: reaction.sustainedAttention >= 0.6 ? 'Could not look away' : 'Interest is brewing',
    },
    {
      key: 'play',
      Icon: Gamepad2,
      tone: signalTone(reaction.playfulBodyLanguage),
      title: reaction.playfulBodyLanguage >= 0.6 ? 'PLAY MODE' : 'SOFT VIBES',
      detail: reaction.playfulBodyLanguage >= 0.6 ? 'Loose and ready' : 'Calm positive posture',
    },
    {
      key: 'calm',
      Icon: ShieldCheck,
      tone: reaction.stressSignals <= 0.2 ? 'loud' : 'clear',
      title: reaction.stressSignals <= 0.2 ? 'ZERO SIDE-EYE' : 'STILL COMFY',
      detail: reaction.stressSignals <= 0.2 ? 'No stress spotted' : 'Stress stayed low',
    },
  ];

  return (
    <section className="active-state chemistry-panel" aria-label="Match reaction explained">
      <div className="chemistry-heading">
        <div className="eyebrow"><Heart size={15} fill="currentColor" /> Canine chemistry</div>
        <span className="confidence-read">
          {reaction.confidence >= 0.8 ? 'High-confidence read' : 'Visible reaction read'}
        </span>
      </div>

      <div className="chemistry-verdict">
        <span className="chemistry-heart"><Heart fill="currentColor" /></span>
        <div><small>Chemistry</small><strong>OFF THE LEASH</strong></div>
      </div>

      <div className="vibe-meter" aria-label="Canine chemistry landed at off the leash">
        <div className="vibe-track"><span /><i /></div>
        <div className="vibe-zones"><span>Not today</span><span>Curious</span><b>Off the leash</b></div>
      </div>

      <div className="signal-stickers">
        {stickers.map(({ key, Icon, tone, title, detail }, index) => (
          <article className={`signal-sticker sticker-${tone}`} style={{ '--sticker-delay': `${index * 90}ms` }} key={key}>
            <span><Icon /></span>
            <div><strong>{title}</strong><small>{detail}</small></div>
          </article>
        ))}
      </div>

      <div className="bark-translator">
        <MessageCircleMore />
        <div>
          <span>Bark translator</span>
          <blockquote>“{barkTranslation(reaction)}”</blockquote>
        </div>
      </div>

      <details className="ai-evidence">
        <summary>What the AI saw</summary>
        <p>{reaction.summary}</p>
      </details>

      {showSource && (
        <small className={`analysis-source ${analysis.source !== 'twelvelabs' ? 'fallback-source' : ''}`}>
          {analysis.source === 'twelvelabs' ? 'Source: TwelveLabs' : 'Demo fallback · not a live AI verdict'}
        </small>
      )}
    </section>
  );
}
