import Link from 'next/link';
import {
  assessCreditTier,
  tierAdjustedRatePct,
  tierAdjustedLimitCents,
  monthlyDepositInterestCents,
  formatMoney,
} from '@stawi/core';
import { getSaccoAccountsData } from '@/lib/data';

/**
 * Performance signals from Pillars 1–3 (live from DB when wired; demo seed
 * mirrors Umoja). Even BEFORE opting in, a party's record earns them a tier —
 * the activation card shows the merits already waiting for them.
 */
const PERFORMANCE = {
  monthsActive: 12,
  savingStreakMonths: 8,
  onTimeRepaymentRate: 1,
  loansCleared: 1,
  depositsCents: 12_800_000, // group pot ≈ entry deposits
  booksMonths: 4,
  hasDefaultHistory: false,
};

/**
 * Pillar 4 opt-in entry point (server component).
 *
 * SACCO+ is NEVER required: many groups join Stawi for transparent books,
 * conflict-free records and published reports (Pillars 1–3) while already
 * banking with another institution. This card makes that explicit — and keeps
 * a one-tap activation ready for the day they want better rates.
 */
export async function SaccoActivationCard({ compact = false }: { compact?: boolean }) {
  const accounts = await getSaccoAccountsData();
  const active = accounts.length > 0;
  const merit = assessCreditTier(PERFORMANCE);

  if (compact) {
    return (
      <p
        style={{
          margin: '18px 0 0',
          padding: '12px 16px',
          borderRadius: 12,
          border: '1px dashed var(--gold-deep)',
          background: 'rgba(224,163,46,.06)',
          fontSize: 13.5,
          color: 'var(--ink-2)',
        }}
      >
        {active ? (
          <>Your SACCO+ account is active — deposits earn 10% p.a. <Link href="/sacco" style={{ fontWeight: 800, color: 'var(--forest-deep)' }}>Open SACCO+ →</Link></>
        ) : (
          <>Banking elsewhere? No problem — your books, reports and transparency live here regardless. When you&apos;re ready, <Link href="/sacco" style={{ fontWeight: 800, color: 'var(--forest-deep)' }}>activate SACCO+</Link> for 10% on deposits and 1%/mo loans. Optional, one tap, no lock-in.</>
        )}
      </p>
    );
  }

  return (
    <section
      aria-label="SACCO+ savings and credit — optional"
      style={{
        marginTop: 22,
        borderRadius: 16,
        border: active ? '1px solid var(--line)' : '1.5px dashed var(--gold-deep)',
        background: active ? 'var(--paper)' : 'rgba(224,163,46,.07)',
        padding: 20,
      }}
    >
      <p style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 800, margin: 0 }}>
        Pillar 4 · optional
      </p>
      {active ? (
        <>
          <h3 style={{ margin: '6px 0 4px', fontSize: 17 }}>SACCO+ is active for your group ✓</h3>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', maxWidth: 620 }}>
            Deposits are earning 10% p.a., loan limits track your savings at 3×, and the
            Graduation Engine is watching your liquidity, capital and NPL ratios live.
          </p>
        </>
      ) : (
        <>
          <h3 style={{ margin: '6px 0 4px', fontSize: 17 }}>Savings &amp; credit, when you&apos;re ready</h3>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', maxWidth: 620 }}>
            Stawi works fully without it — keep your table banking, books and transparent
            reports here even if your group already saves or borrows with another
            institution. But your record has been earning quietly. If you activated today:
          </p>
          <ul style={{ margin: '10px 0 0', paddingLeft: 20, fontSize: 13.5, color: 'var(--ink-2)', maxWidth: 620 }}>
            <li style={{ marginBottom: 5 }}>
              You&apos;d enter at the <strong>{merit.tier.name}</strong> tier — earned by your
              {' '}{PERFORMANCE.savingStreakMonths}-month streak and {PERFORMANCE.booksMonths} months of clean books, not granted by a committee.
            </li>
            <li style={{ marginBottom: 5 }}>
              Development loans at <strong>{tierAdjustedRatePct(1.0, merit.tier.id)}%/month reducing</strong> — a limit of
              {' '}<strong>{formatMoney(tierAdjustedLimitCents(PERFORMANCE.depositsCents, merit.tier.id))}</strong> from day one.
            </li>
            <li style={{ marginBottom: 5 }}>
              Your current pot would earn <strong>{formatMoney(monthlyDepositInterestCents(PERFORMANCE.depositsCents))}/month</strong> in
              interest (10% p.a.) + 13% dividends on shares — automatically, from the first day.
            </li>
            <li style={{ marginBottom: 5 }}>
              Instant, guarantor-free micro-loans up to <strong>{formatMoney(merit.tier.benefits.instantCapCents)}</strong>, day or night.
            </li>
            <li>
              One-tap onboarding (KYC reused from Formalization), zero branches, zero
              hidden charges, no lock-in — leave anytime, records stay yours.
            </li>
          </ul>
        </>
      )}
      <Link
        href="/sacco"
        style={{
          display: 'inline-block',
          marginTop: 14,
          padding: '11px 20px',
          borderRadius: 11,
          background: active ? 'var(--forest-deep)' : 'var(--gold)',
          color: active ? '#fff' : 'var(--forest-deep)',
          fontWeight: 800,
          fontSize: 14,
          textDecoration: 'none',
        }}
      >
        {active ? 'Open SACCO+' : 'Activate SACCO+ — optional'}
      </Link>
    </section>
  );
}
