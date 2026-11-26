'use client';

/**
 * A clear, highlighted confirmation (owner 26/11/26): green "done" with what
 * happened, or red "not done" with why. Read out by screen readers, stays long
 * enough to read, and can be closed. Brand colours only.
 */
export type Feedback = { tone: 'success' | 'error' | 'info'; title: string; detail?: string };

export function FeedbackBanner({ feedback, onClose }: { feedback: Feedback | null; onClose: () => void }) {
  if (!feedback) return null;
  return (
    <div className={`fb-banner fb-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'} aria-live={feedback.tone === 'error' ? 'assertive' : 'polite'}>
      <span className="fb-mark" aria-hidden>{feedback.tone === 'success' ? '✓' : feedback.tone === 'error' ? '!' : 'i'}</span>
      <div className="fb-text">
        <strong>{feedback.title}</strong>
        {feedback.detail && <span>{feedback.detail}</span>}
      </div>
      <button type="button" className="fb-close" onClick={onClose} aria-label="Close">✕</button>
    </div>
  );
}
