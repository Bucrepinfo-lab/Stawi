'use client';

import { useState } from 'react';
import { PLAN_ORDER, getPlan, quoteGroup, formatPrice, YEAR_PLAN_MONTHS_PAID, SMALL_GROUP_MAX_MEMBERS, type PlanTier, type BillingPeriod } from '@stawi/core';

export function SubscribeGate() {
  const [country, setCountry] = useState('KE');
  const [selected, setSelected] = useState<PlanTier>('STARTER');
  const [period, setPeriod] = useState<BillingPeriod>('MONTH');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const COUNTRIES = [
    ['KE', '🇰🇪 Kenya'], ['NG', '🇳🇬 Nigeria'], ['ZA', '🇿🇦 South Africa'],
    ['US', '🇺🇸 United States'], ['GB', '🇬🇧 United Kingdom'], ['IN', '🇮🇳 India'],
    ['DE', '🇩🇪 Germany'], ['BR', '🇧🇷 Brazil'],
  ];

  // Display only: the server sets the amount at checkout.
  function quoteFor(tier: PlanTier) {
    return quoteGroup({ country, members: tier === 'FREE' ? SMALL_GROUP_MAX_MEMBERS : SMALL_GROUP_MAX_MEMBERS + 1, period });
  }

  function priceLabel(tier: PlanTier): string {
    const p = getPlan(tier);
    if (p.billing === 'CUSTOM') return 'Custom';
    const q = quoteFor(tier);
    return `${formatPrice(q.amountCents, q.currency)}${period === 'YEAR' ? '/yr' : '/mo'}`;
  }

  const sample = quoteFor('STARTER');

  async function activate() {
    if (!accepted) return;
    const p = getPlan(selected);
    if (p.billing === 'CUSTOM') { setDone('Enterprise is invoiced — our team will be in touch.'); return; }

    setBusy(true);
    setDone(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selected, country, period }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // hosted Stripe Checkout
        return;
      }
      setDone(
        data.note
          ? `${p.name} selected. ${data.note} (Once a payment provider is connected, you'll be sent to secure checkout — first month free.)`
          : `${p.name} plan started — first month free.`,
      );
    } catch {
      setDone('Could not reach checkout. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 22 }}>
      <label style={{ display: 'inline-block', marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--dim)', display: 'block', marginBottom: 6 }}>Country / currency</span>
        <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--paper)', fontFamily: 'inherit', fontSize: 14 }}>
          {COUNTRIES.map(([c, label]) => <option key={c} value={c}>{label}</option>)}
        </select>
      </label>

      <div role="radiogroup" aria-label="Billing period" style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {(['MONTH', 'YEAR'] as const).map((p) => (
          <button key={p} type="button" role="radio" aria-checked={period === p} onClick={() => setPeriod(p)} style={{ padding: '8px 14px', borderRadius: 999, border: `2px solid ${period === p ? 'var(--forest)' : 'var(--line)'}`, background: 'var(--paper)', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: 'var(--ink)' }}>
            {p === 'MONTH' ? 'Pay monthly' : `Pay a year ahead (${YEAR_PLAN_MONTHS_PAID} months' price)`}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '0 0 14px', maxWidth: 640 }}>
        Priced per group. Groups of {SMALL_GROUP_MAX_MEMBERS} members or fewer pay the small-group price. Groups that join
        in our first 12 months keep this founding price for as long as they stay subscribed.
        {sample.approved ? '' : ' Prices for this country are indicative until confirmed.'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px,1fr))', gap: 14 }}>
        {PLAN_ORDER.map((tier) => {
          const p = getPlan(tier);
          const on = selected === tier;
          return (
            <button key={tier} onClick={() => setSelected(tier)} style={{ textAlign: 'left', background: 'var(--paper)', border: `2px solid ${on ? 'var(--forest)' : 'var(--line)'}`, borderRadius: 'var(--radius)', padding: 18, cursor: 'pointer', fontFamily: 'inherit', boxShadow: on ? 'var(--shadow)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{p.name}</span>
                {on && <span style={{ color: 'var(--forest)', fontWeight: 700 }}>✓</span>}
              </div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--forest-deep)', marginTop: 6 }}>{priceLabel(tier)}</div>
              {p.trialDays > 0 && p.billing === 'PER_GROUP' ? <div style={{ fontSize: 11.5, color: 'var(--gold-deep)', fontWeight: 700, marginTop: 2 }}>First month free</div> : <div style={{ height: 16 }} />}
              <ul style={{ marginTop: 10, paddingLeft: 16, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                {p.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </button>
          );
        })}
      </div>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 22, cursor: 'pointer' }}>
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18 }} />
        <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>
          I have read and agree to the{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--forest)', fontWeight: 600 }}>Subscription Terms &amp; Conditions</a>,
          including the Acceptable Use Policy and Privacy Policy.
        </span>
      </label>

      <button onClick={activate} disabled={!accepted || busy} style={{ marginTop: 18, padding: '14px 26px', borderRadius: 12, border: 'none', background: accepted && !busy ? 'var(--gold)' : 'var(--bone-2)', color: accepted && !busy ? 'var(--forest-deep)' : 'var(--dim)', fontWeight: 700, fontSize: 15, cursor: accepted && !busy ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
        {busy ? 'Opening secure checkout…' : getPlan(selected).billing === 'PER_GROUP' ? 'Start free month' : 'Contact sales'}
      </button>

      {done && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(47,125,82,.08)', border: '1px solid var(--good)', color: 'var(--good)', fontWeight: 600, fontSize: 14 }}>
          ✓ {done}
        </div>
      )}
    </div>
  );
}
