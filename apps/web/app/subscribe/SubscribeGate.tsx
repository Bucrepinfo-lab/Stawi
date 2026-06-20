'use client';

import { useState } from 'react';
import { PLAN_ORDER, getPlan, formatCurrencyFor, type PlanTier } from '@stawi/core';

export function SubscribeGate() {
  const [country, setCountry] = useState('KE');
  const [selected, setSelected] = useState<PlanTier>('STARTER');
  const [accepted, setAccepted] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const COUNTRIES = [
    ['KE', '🇰🇪 Kenya'], ['NG', '🇳🇬 Nigeria'], ['ZA', '🇿🇦 South Africa'],
    ['US', '🇺🇸 United States'], ['GB', '🇬🇧 United Kingdom'], ['IN', '🇮🇳 India'],
    ['DE', '🇩🇪 Germany'], ['BR', '🇧🇷 Brazil'],
  ];

  function priceLabel(tier: PlanTier): string {
    const p = getPlan(tier);
    if (p.monthlyUsdCents == null) return 'Custom';
    if (p.monthlyUsdCents === 0) return 'Free';
    // Approx local display: treat USD cents as the amount, formatted in local currency symbol.
    return `${formatCurrencyFor(p.monthlyUsdCents, country)}/mo`;
  }

  function activate() {
    if (!accepted) return;
    const p = getPlan(selected);
    setDone(p.monthlyUsdCents && p.monthlyUsdCents > 0
      ? `${p.name} plan started — first month free. You won't be charged until next month.`
      : `${p.name} plan activated.`);
  }

  return (
    <div style={{ marginTop: 22 }}>
      <label style={{ display: 'inline-block', marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--dim)', display: 'block', marginBottom: 6 }}>Country / currency</span>
        <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--paper)', fontFamily: 'inherit', fontSize: 14 }}>
          {COUNTRIES.map(([c, label]) => <option key={c} value={c}>{label}</option>)}
        </select>
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px,1fr))', gap: 14 }}>
        {PLAN_ORDER.map((tier) => {
          const p = getPlan(tier);
          const on = selected === tier;
          return (
            <button
              key={tier}
              onClick={() => setSelected(tier)}
              style={{ textAlign: 'left', background: 'var(--paper)', border: `2px solid ${on ? 'var(--forest)' : 'var(--line)'}`, borderRadius: 'var(--radius)', padding: 18, cursor: 'pointer', fontFamily: 'inherit', boxShadow: on ? 'var(--shadow)' : 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{p.name}</span>
                {on && <span style={{ color: 'var(--forest)', fontWeight: 700 }}>✓</span>}
              </div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--forest-deep)', marginTop: 6 }}>{priceLabel(tier)}</div>
              {p.trialDays > 0 && p.monthlyUsdCents ? <div style={{ fontSize: 11.5, color: 'var(--gold-deep)', fontWeight: 700, marginTop: 2 }}>First month free</div> : <div style={{ height: 16 }} />}
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

      <button
        onClick={activate}
        disabled={!accepted}
        style={{ marginTop: 18, padding: '14px 26px', borderRadius: 12, border: 'none', background: accepted ? 'var(--gold)' : 'var(--bone-2)', color: accepted ? 'var(--forest-deep)' : 'var(--dim)', fontWeight: 700, fontSize: 15, cursor: accepted ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
      >
        {getPlan(selected).monthlyUsdCents ? 'Start free month' : 'Activate plan'}
      </button>

      {done && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(47,125,82,.08)', border: '1px solid var(--good)', color: 'var(--good)', fontWeight: 600, fontSize: 14 }}>
          ✓ {done}
        </div>
      )}
    </div>
  );
}
