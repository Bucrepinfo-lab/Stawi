import { countdownTone } from '@stawi/core';

/**
 * A small "N days left" badge. The number is worked out on the server
 * (daysLeft / trialDaysLeft in @stawi/core); the colour grows more urgent as
 * the days run out. Shows nothing when there is no date to count to.
 */
export function CountdownBadge({ days, label, endedLabel }: { days: number | null; label: string; endedLabel?: string }) {
  if (days === null) return null;
  const tone = countdownTone(days);
  if (tone === 'ended') return endedLabel ? <span className="count-badge ended">⏰ {endedLabel}</span> : null;
  return (
    <span className={`count-badge ${tone}`}>
      ⏰ <span className="n">{days}</span> {label}
    </span>
  );
}
