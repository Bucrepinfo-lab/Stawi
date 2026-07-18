import Link from 'next/link';
import { detectMoments, fillMoment, type MomentSignals } from '@stawi/core';

/**
 * Retention & mobilization strip — surfaces the top active "moments" for this
 * party (the Graduate-tab pattern, platform-wide). The same catalog feeds CRM
 * emails/SMS/posters (see docs/CRM-CONTENT-GUIDE.md), so what a member sees
 * in-app and in their inbox is one voice. Signals come from live data when
 * the DB is wired; seed demo shows a representative set.
 */
const DEMO_SIGNALS: MomentSignals = {
  savingStreakMonths: 6,
  sharePct: 34.4,
  sharePctPrev: 33.1,
  nextPayoutDays: 9,
  memberCount: 46,
  memberTarget: 50,
  newVenturesUnlocked: 2,
  shortlistPendingVotes: 3,
  booksStreakMonths: 4,
  taxDueDays: null,
  deadStockCount: 1,
  interestEarnedMonthCents: 106_700,
  tierReadinessPct: 80,
  nextTierName: 'Harvest',
  nextTierRatePct: 0.9,
  institutionReadinessDeltaPct: 6,
  trialDaysLeft: null,
};

export function MomentsStrip({
  signals = DEMO_SIGNALS,
  vars = { name: 'Amina', group: 'Umoja Chama' },
}: {
  signals?: MomentSignals;
  vars?: { name?: string; group?: string };
}) {
  const moments = detectMoments(signals, 3);
  if (moments.length === 0) return null;

  return (
    <section aria-label="Your moments" style={{ marginTop: 20 }}>
      <p style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 800, margin: '0 0 8px' }}>
        Happening for you right now
      </p>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        {moments.map((m) => {
          const value = m.value(signals);
          return (
            <div
              key={m.id}
              style={{
                border: '1px solid var(--line)',
                borderLeft: '4px solid var(--gold)',
                borderRadius: 12,
                padding: '12px 14px',
                background: 'var(--paper)',
              }}
            >
              <strong style={{ fontSize: 14 }}>{fillMoment(m.copy.hook, { ...vars, value })}</strong>
              <p style={{ margin: '4px 0 8px', fontSize: 12.5, color: 'var(--ink-2)' }}>
                {fillMoment(m.copy.message, { ...vars, value, tier: signals.nextTierName ?? undefined })}
              </p>
              <Link href={m.copy.ctaHref} style={{ fontSize: 13, fontWeight: 800, color: 'var(--forest-deep)' }}>
                {m.copy.ctaLabel} →
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
