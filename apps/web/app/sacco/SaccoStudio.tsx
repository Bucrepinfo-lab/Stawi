'use client';

import { useMemo, useState } from 'react';
import {
  ENTITY_ONBOARDING,
  LOAN_PRODUCTS,
  FAILURE_GAPS,
  STAGE_ORDER,
  STAGE_LABELS,
  amortizeReducingBalance,
  scoreEligibility,
  assessGraduation,
  monthlyDepositInterestCents,
  annualDividendCents,
  remittanceFeeCents,
  liquidityStatus,
  formatMoney,
  CREDIT_TIER_ORDER,
  CREDIT_TIERS,
  assessCreditTier,
  tierAdjustedRatePct,
  tierAdjustedLimitCents,
  type CreditTierInput,
  type SaccoEntityType,
  type LoanProductId,
  type GraduationInput,
} from '@stawi/core';
import type { WebSaccoAccount } from '@/lib/data';
import { openSaccoAccountAction, saccoTxnAction, applyLoanAction } from '../actions';

type Tab = 'join' | 'save' | 'borrow' | 'grow';

const TABS: { id: Tab; label: string }[] = [
  { id: 'join', label: 'Join' },
  { id: 'save', label: 'Save' },
  { id: 'borrow', label: 'Borrow' },
  { id: 'grow', label: 'Graduate' },
];

const card: React.CSSProperties = {
  background: 'var(--card, #fff)',
  border: '1px solid var(--line, #e6e0d4)',
  borderRadius: 16,
  padding: 20,
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--ink-2)',
  marginBottom: 6,
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--line, #e6e0d4)',
  fontSize: 15,
  fontFamily: 'inherit',
};

export function SaccoStudio({ accounts = [] }: { accounts?: WebSaccoAccount[] }) {
  const [tab, setTab] = useState<Tab>('join');
  const account = accounts[0];

  return (
    <div style={{ marginTop: 24 }}>
      <div role="tablist" aria-label="SACCO+ services" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              border: '1px solid var(--line, #e6e0d4)',
              background: tab === t.id ? 'var(--forest-deep, #1f4d3a)' : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--ink, #23201a)',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        {tab === 'join' && <JoinTab />}
        {tab === 'save' && <SaveTab account={account} />}
        {tab === 'borrow' && <BorrowTab account={account} />}
        {tab === 'grow' && <GrowTab account={account} />}
      </div>
    </div>
  );
}

/* ───────────────────────── Join ───────────────────────── */

function JoinTab() {
  const [entity, setEntity] = useState<SaccoEntityType>('REGISTERED_GROUP');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const info = ENTITY_ONBOARDING[entity];

  async function open() {
    setBusy(true);
    setStatus(null);
    const r = await openSaccoAccountAction({
      entityType: entity,
      displayName: `${info.label} — SACCO+`,
    });
    setBusy(false);
    setStatus(
      !r.ok
        ? `Could not open: ${r.error}`
        : r.persisted
          ? 'Account opened and saved — deposits start earning immediately.'
          : 'Account opened (demo mode — connect a database to persist).',
    );
  }

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div style={card}>
        <span style={label}>Who is joining?</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(Object.keys(ENTITY_ONBOARDING) as SaccoEntityType[]).map((t) => (
            <button
              key={t}
              onClick={() => setEntity(t)}
              aria-pressed={entity === t}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                border: entity === t ? '2px solid var(--forest-deep, #1f4d3a)' : '1px solid var(--line, #e6e0d4)',
                background: entity === t ? 'var(--sand, #f6f1e6)' : 'transparent',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {ENTITY_ONBOARDING[t].label}
            </button>
          ))}
        </div>
        {info.fastTrack && (
          <p style={{ marginTop: 12, color: 'var(--forest-deep, #1f4d3a)', fontWeight: 700 }}>
            ⚡ Fast-tracked — your group&apos;s KYC is reused from the Formalization wizard. One tap to open.
          </p>
        )}
        <h3 style={{ marginTop: 16, fontSize: 15 }}>What the system needs</h3>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: 'var(--ink-2)' }}>
          {info.requiredDocs.map((d) => (
            <li key={d} style={{ marginBottom: 4 }}>{d}</li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
          <Stat label="Minimum opening deposit" value={formatMoney(info.minOpeningDepositCents)} />
          <Stat label="Minimum share capital" value={formatMoney(info.minShareCapitalCents)} />
        </div>
        <button
          onClick={open}
          disabled={busy}
          style={{
            marginTop: 18,
            padding: '12px 22px',
            borderRadius: 12,
            border: 'none',
            background: 'var(--gold, #d9a441)',
            color: 'var(--forest-deep, #1f4d3a)',
            fontWeight: 800,
            fontSize: 15,
            cursor: 'pointer',
            fontFamily: 'inherit',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Opening…' : 'Open my SACCO+ account'}
        </button>
        {status && (
          <p role="status" style={{ marginTop: 10, fontWeight: 700, color: 'var(--forest-deep, #1f4d3a)' }}>
            {status}
          </p>
        )}
        <p style={{ fontSize: 12, color: 'var(--faint, #8b8375)', marginTop: 10 }}>
          By opening an account you accept the SACCO+ terms, aligned to your country&apos;s
          cooperative and financial regulator. First month of the platform is free.
        </p>
      </div>
    </section>
  );
}

/* ───────────────────────── Save ───────────────────────── */

function SaveTab({ account }: { account?: WebSaccoAccount }) {
  const [balance, setBalance] = useState(account?.balanceCents ?? 250_000_00); // cents
  const [note, setNote] = useState<string | null>(null);

  async function quickDeposit() {
    const amount = 100_000; // KES 1,000
    setBalance((b) => b + amount);
    if (!account) { setNote('Deposit simulated (demo mode).'); return; }
    const r = await saccoTxnAction({ accountId: account.id, type: 'DEPOSIT', amountCents: amount });
    setNote(
      !r.ok ? `Failed: ${r.error}` : r.persisted ? 'Deposit posted to your account ✓' : 'Deposit simulated (demo mode).',
    );
  }
  const [shares, setShares] = useState(50_000_00);
  const [remit, setRemit] = useState(10_000_00);

  const monthlyInterest = monthlyDepositInterestCents(balance);
  const dividend = annualDividendCents(shares);
  const fee = remittanceFeeCents(remit);

  return (
    <section style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Deposits earn while they sit</h3>
        <label style={label} htmlFor="bal">Savings balance</label>
        <input id="bal" type="number" style={input} value={balance / 100}
          onChange={(e) => setBalance(Math.max(0, Math.round(Number(e.target.value) * 100)))} />
        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          <Stat label="Interest on deposits" value="10% per year" />
          <Stat label="You earn monthly" value={formatMoney(monthlyInterest)} highlight />
        </div>
        <button
          onClick={quickDeposit}
          style={{ marginTop: 12, padding: '10px 16px', borderRadius: 10, border: 'none', background: 'var(--gold, #d9a441)', color: 'var(--forest-deep, #1f4d3a)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Deposit 1,000 now
        </button>
        {note && <p role="status" style={{ fontSize: 13, fontWeight: 700, marginTop: 8, color: 'var(--forest-deep, #1f4d3a)' }}>{note}</p>}
      </div>
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Share capital pays dividends</h3>
        <label style={label} htmlFor="sh">Share capital held</label>
        <input id="sh" type="number" style={input} value={shares / 100}
          onChange={(e) => setShares(Math.max(0, Math.round(Number(e.target.value) * 100)))} />
        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          <Stat label="Dividend rate" value="13% per year" />
          <Stat label="Annual dividend" value={formatMoney(dividend)} highlight />
        </div>
      </div>
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Send money for less</h3>
        <label style={label} htmlFor="rm">Amount to send</label>
        <input id="rm" type="number" style={input} value={remit / 100}
          onChange={(e) => setRemit(Math.max(0, Math.round(Number(e.target.value) * 100)))} />
        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          <Stat label="Flat digital fee" value={formatMoney(fee)} highlight />
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
            No branches or paper to pay for — the savings become your savings.
            Deposits and withdrawals ride M-Pesa, bank, or card rails instantly,
            with receipts and real-time member dashboards.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Borrow ───────────────────────── */

function BorrowTab({ account }: { account?: WebSaccoAccount }) {
  const [productId, setProductId] = useState<LoanProductId>('DEVELOPMENT');
  const [deposits, setDeposits] = useState(account?.balanceCents ?? 100_000_00);
  const [appStatus, setAppStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState(150_000_00);
  const [months, setMonths] = useState(12);
  const [streak, setStreak] = useState(8);
  const [tenure, setTenure] = useState(12);

  const product = LOAN_PRODUCTS[productId];
  const result = useMemo(
    () =>
      scoreEligibility(product, amount, {
        monthsActive: tenure,
        depositsCents: deposits,
        savingStreakMonths: streak,
        onTimeRepaymentRate: 1,
        existingLoanBalanceCents: 0,
        guarantorCoverageCents: Math.max(0, amount - deposits),
        hasDefaultHistory: false,
      }),
    [product, amount, deposits, streak, tenure],
  );
  const schedule = useMemo(
    () => amortizeReducingBalance(amount, result.monthlyRatePct, Math.min(months, product.maxTermMonths)),
    [amount, result.monthlyRatePct, months, product.maxTermMonths],
  );

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(Object.keys(LOAN_PRODUCTS) as LoanProductId[]).map((id) => (
          <button
            key={id}
            onClick={() => setProductId(id)}
            aria-pressed={productId === id}
            style={{
              flex: '1 1 220px',
              textAlign: 'left',
              padding: 14,
              borderRadius: 14,
              border: productId === id ? '2px solid var(--forest-deep, #1f4d3a)' : '1px solid var(--line, #e6e0d4)',
              background: productId === id ? 'var(--sand, #f6f1e6)' : 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <strong>{LOAN_PRODUCTS[id].name}</strong>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-2)' }}>{LOAN_PRODUCTS[id].blurb}</p>
            <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 700 }}>
              {LOAN_PRODUCTS[id].baseMonthlyRatePct}%/month reducing · up to {LOAN_PRODUCTS[id].depositMultiplier}× deposits
            </p>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Your numbers</h3>
          <label style={label} htmlFor="dep">My deposits</label>
          <input id="dep" type="number" style={input} value={deposits / 100}
            onChange={(e) => setDeposits(Math.max(0, Math.round(Number(e.target.value) * 100)))} />
          <label style={{ ...label, marginTop: 12 }} htmlFor="amt">Loan I want</label>
          <input id="amt" type="number" style={input} value={amount / 100}
            onChange={(e) => setAmount(Math.max(0, Math.round(Number(e.target.value) * 100)))} />
          <label style={{ ...label, marginTop: 12 }} htmlFor="mo">Repay over (months, max {product.maxTermMonths})</label>
          <input id="mo" type="number" style={input} value={months}
            onChange={(e) => setMonths(Math.max(1, Math.min(product.maxTermMonths, Number(e.target.value) || 1)))} />
          <label style={{ ...label, marginTop: 12 }} htmlFor="st">Saving streak (months)</label>
          <input id="st" type="number" style={input} value={streak}
            onChange={(e) => setStreak(Math.max(0, Number(e.target.value) || 0))} />
          <label style={{ ...label, marginTop: 12 }} htmlFor="tn">Months as a member</label>
          <input id="tn" type="number" style={input} value={tenure}
            onChange={(e) => setTenure(Math.max(0, Number(e.target.value) || 0))} />
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>System decision — in seconds</h3>
          <div
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: 999,
              fontWeight: 800,
              background: result.qualified ? 'var(--forest-deep, #1f4d3a)' : '#a33',
              color: '#fff',
            }}
          >
            {result.qualified ? `Qualified — Tier ${result.tier}` : 'Not yet qualified'}
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
            <Stat label="Score" value={`${result.score}/100`} />
            <Stat label="Your rate" value={`${result.monthlyRatePct}%/month`} />
            <Stat label="Your limit" value={formatMoney(result.maxLoanCents)} />
          </div>
          {schedule.rows.length > 0 && result.qualified && (
            <div style={{ display: 'flex', gap: 24, marginTop: 10, flexWrap: 'wrap' }}>
              <Stat label="Monthly instalment" value={formatMoney(schedule.monthlyPaymentCents)} highlight />
              <Stat label="Total interest" value={formatMoney(schedule.totalInterestCents)} />
            </div>
          )}
          {result.qualified && (
            <button
              onClick={async () => {
                setSubmitting(true);
                setAppStatus(null);
                const r = await applyLoanAction({
                  accountId: account?.id ?? 'demo',
                  product: productId,
                  principalCents: amount,
                  termMonths: Math.min(months, product.maxTermMonths),
                  monthsActive: tenure,
                  savingStreakMonths: streak,
                });
                setSubmitting(false);
                setAppStatus(
                  !r.ok
                    ? `Failed: ${r.error}`
                    : r.persisted
                      ? `Application ${r.qualified ? 'APPROVED' : 'declined'} — Tier ${r.tier} at ${r.monthlyRatePct}%/mo (saved with full score snapshot).`
                      : 'Application scored (demo mode — connect a database to persist).',
                );
              }}
              disabled={submitting}
              style={{ marginTop: 14, padding: '11px 18px', borderRadius: 10, border: 'none', background: 'var(--forest-deep, #1f4d3a)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? 'Submitting…' : 'Submit loan application'}
            </button>
          )}
          {appStatus && <p role="status" style={{ fontSize: 13, fontWeight: 700, marginTop: 8, color: 'var(--forest-deep, #1f4d3a)' }}>{appStatus}</p>}
          <h4 style={{ marginBottom: 6, marginTop: 16 }}>How the score was built</h4>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--ink-2)' }}>
            {result.reasons.map((r) => (
              <li key={r} style={{ marginBottom: 4 }}>{r}</li>
            ))}
          </ul>
        </div>
      </div>

      {result.qualified && schedule.rows.length > 0 && (
        <div style={{ ...card, overflowX: 'auto' }}>
          <h3 style={{ marginTop: 0 }}>Reducing-balance schedule (first 6 months)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'right', color: 'var(--ink-2)' }}>
                <th style={{ textAlign: 'left', padding: 6 }}>Month</th>
                <th style={{ padding: 6 }}>Payment</th>
                <th style={{ padding: 6 }}>Interest</th>
                <th style={{ padding: 6 }}>Principal</th>
                <th style={{ padding: 6 }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {schedule.rows.slice(0, 6).map((r) => (
                <tr key={r.month} style={{ textAlign: 'right', borderTop: '1px solid var(--line, #e6e0d4)' }}>
                  <td style={{ textAlign: 'left', padding: 6 }}>{r.month}</td>
                  <td style={{ padding: 6 }}>{formatMoney(r.paymentCents)}</td>
                  <td style={{ padding: 6 }}>{formatMoney(r.interestCents)}</td>
                  <td style={{ padding: 6 }}>{formatMoney(r.principalCents)}</td>
                  <td style={{ padding: 6 }}>{formatMoney(r.balanceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ───────────────────────── Grow (graduation ladder) ───────────────────── */

const DEMO_INSTITUTION: GraduationInput = {
  memberCount: 180,
  coreCapitalCents: 4_500_000_00,
  totalAssetsCents: 38_000_000_00,
  liquidAssetsCents: 5_200_000_00,
  totalDepositsCents: 29_000_000_00,
  nonPerformingLoanCents: 700_000_00,
  grossLoanCents: 21_000_000_00,
  auditedFinancialYears: 1,
  consecutiveProfitYears: 1,
  governance: {
    electedBoard: true,
    dualApprovalEnabled: true,
    auditTrailEnabled: true,
    annualAuditDone: false,
  },
  registeredWithRegulator: true,
};

const DEMO_PARTY: CreditTierInput = {
  monthsActive: 12,
  savingStreakMonths: 8,
  onTimeRepaymentRate: 0.96,
  loansCleared: 1,
  depositsCents: 100_000_00,
  booksMonths: 4,
  hasDefaultHistory: false,
};

function GrowTab({ account }: { account?: WebSaccoAccount }) {
  const party = useMemo(
    () => assessCreditTier({ ...DEMO_PARTY, depositsCents: account?.balanceCents ?? DEMO_PARTY.depositsCents }),
    [account],
  );
  const deposits = account?.balanceCents ?? DEMO_PARTY.depositsCents;
  const a = assessGraduation(DEMO_INSTITUTION);
  const liq = liquidityStatus(DEMO_INSTITUTION.liquidAssetsCents, DEMO_INSTITUTION.totalDepositsCents);
  const currentIdx = STAGE_ORDER.indexOf(a.currentStage);
  const partyIdx = CREDIT_TIER_ORDER.indexOf(party.tier.id);

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Your credit graduation — earned by wholistic performance</h3>
        <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--ink-2)', maxWidth: 640 }}>
          Every party on the credit trail — member, group or business — graduates through
          tiers the system awards from saving discipline, repayment behaviour, tenure and
          the books you keep in Pillar 3. Each tier unlocks bigger multipliers, cheaper
          rates and larger instant caps. No committee decides; your record does.
        </p>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {CREDIT_TIER_ORDER.map((id, i) => {
            const t = CREDIT_TIERS[id];
            const state = i < partyIdx ? 'past' : i === partyIdx ? 'now' : 'ahead';
            return (
              <div
                key={id}
                aria-current={state === 'now' ? 'step' : undefined}
                style={{
                  borderRadius: 12,
                  padding: 12,
                  border: state === 'now' ? '2px solid var(--forest-deep, #1f4d3a)' : '1px solid var(--line, #e6e0d4)',
                  background: state === 'now' ? 'var(--sand, #f6f1e6)' : state === 'past' ? 'rgba(47,125,82,.07)' : 'transparent',
                  opacity: state === 'ahead' ? 0.85 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong style={{ fontSize: 14 }}>{t.name}</strong>
                  <span style={{ fontSize: 11, fontWeight: 800, color: state === 'past' ? 'var(--forest-deep, #1f4d3a)' : state === 'now' ? 'var(--gold-deep, #b97e15)' : 'var(--faint, #8b8375)' }}>
                    {state === 'past' ? 'EARNED ✓' : state === 'now' ? 'YOU ARE HERE' : 'AHEAD'}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: '4px 0 8px' }}>{t.tagline}</p>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--ink-2)' }}>
                  <li>{t.benefits.depositMultiplier}× deposits · up to {t.benefits.maxTermMonths} mo</li>
                  <li>Dev-loan rate {tierAdjustedRatePct(1.0, id)}%/mo · instant cap {formatMoney(t.benefits.instantCapCents)}</li>
                  {t.benefits.perks.slice(0, 2).map((perk) => <li key={perk}>{perk}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
          <Stat label="Your tier" value={party.tier.name} highlight />
          <Stat label="Your limit at this tier" value={formatMoney(tierAdjustedLimitCents(deposits, party.tier.id))} />
          <Stat label="Your dev-loan rate" value={`${tierAdjustedRatePct(1.0, party.tier.id)}%/mo`} />
          {party.nextTier && <Stat label={`Readiness for ${party.nextTier.name}`} value={`${party.readinessPct}%`} highlight />}
        </div>
        {party.nextTier && (
          <>
            <h4 style={{ margin: '16px 0 6px' }}>To graduate to {party.nextTier.name}</h4>
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
              {party.checks.map((c) => (
                <li key={c.label} style={{ padding: '7px 0', borderBottom: '1px solid var(--line, #e6e0d4)', display: 'flex', gap: 10, fontSize: 13.5 }}>
                  <span aria-hidden style={{ fontWeight: 800, color: c.met ? 'var(--forest-deep, #1f4d3a)' : '#a33' }}>{c.met ? '✓' : '✗'}</span>
                  <span><strong>{c.label}</strong><span style={{ color: 'var(--ink-2)' }}> — {c.detail}</span></span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Your institution's ladder</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {STAGE_ORDER.map((s, i) => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  background: i < currentIdx ? 'var(--sand, #f6f1e6)' : i === currentIdx ? 'var(--forest-deep, #1f4d3a)' : 'transparent',
                  color: i === currentIdx ? '#fff' : 'var(--ink-2)',
                  border: '1px solid var(--line, #e6e0d4)',
                }}
              >
                {STAGE_LABELS[s]}
              </span>
              {i < STAGE_ORDER.length - 1 && <span aria-hidden>→</span>}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
          <Stat label="Capital adequacy" value={`${a.ratios.capitalAdequacyPct}%`} />
          <Stat label="Liquidity (floor 15%)" value={`${a.ratios.liquidityPct}%`} highlight={liq.healthy} />
          <Stat label="NPL ratio" value={`${a.ratios.nplPct}%`} />
          <Stat label={`Readiness for ${a.nextStage ? STAGE_LABELS[a.nextStage] : 'the top'}`} value={`${a.readinessPct}%`} highlight />
        </div>
      </div>

      {a.nextStage && (
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>What&apos;s between you and {STAGE_LABELS[a.nextStage]}</h3>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {a.checks.map((c) => (
              <li key={c.label} style={{ padding: '8px 0', borderBottom: '1px solid var(--line, #e6e0d4)', display: 'flex', gap: 10 }}>
                <span aria-hidden style={{ fontWeight: 800, color: c.met ? 'var(--forest-deep, #1f4d3a)' : '#a33' }}>
                  {c.met ? '✓' : '✗'}
                </span>
                <span>
                  <strong>{c.label}</strong>
                  <span style={{ color: 'var(--ink-2)' }}> — {c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Why others failed — and how Stawi closes each gap</h3>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {FAILURE_GAPS.map((g) => (
            <div key={g.id} style={{ border: '1px solid var(--line, #e6e0d4)', borderRadius: 12, padding: 14 }}>
              <strong>{g.gap}</strong>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '6px 0' }}>{g.why}</p>
              <p style={{ fontSize: 13, margin: 0 }}>
                <span style={{ fontWeight: 800, color: 'var(--forest-deep, #1f4d3a)' }}>Stawi: </span>
                {g.stawiSolution}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Shared ───────────────────────── */

function Stat({ label: l, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--faint, #8b8375)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>{l}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: highlight ? 'var(--forest-deep, #1f4d3a)' : 'var(--ink, #23201a)' }}>{value}</div>
    </div>
  );
}
