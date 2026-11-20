'use client';

import { useEffect, useState } from 'react';
import { PLAN_ORDER, PER_MEMBER_PRICES, getPlan, quoteGroup, formatPrice, YEAR_PLAN_MONTHS_PAID, SMALL_GROUP_MAX_MEMBERS, type PlanTier, type BillingPeriod } from '@stawi/core';

/**
 * Where the price is per member (Kenya, owner 20/11/26) the size tiers mean
 * nothing, so the page shows one group plan and Enterprise. Display only.
 */
const PER_MEMBER_FEATURES = [
  'Any number of members',
  'Table banking, minutes and papers',
  'Money statement by day, week and month',
  'M-Pesa receipts and group messages',
  'Business matching and books',
];

type PaddleJs = {
  Environment: { set: (environment: string) => void };
  Initialize: (options: { token: string }) => void;
  Checkout: { open: (options: { items: { priceId: string; quantity: number }[]; customData: Record<string, string> }) => void };
};
type CardCheckout = { environment: 'sandbox' | 'production'; clientToken: string; priceId: string; customData: Record<string, string> };

let paddleReady: Promise<PaddleJs> | null = null;

/** Loads Paddle.js once. Paddle is the seller for card payments and handles the tax. */
function loadPaddle(card: CardCheckout): Promise<PaddleJs> {
  if (!paddleReady) {
    paddleReady = new Promise<PaddleJs>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      script.async = true;
      script.onload = () => {
        const paddle = (window as unknown as { Paddle?: PaddleJs }).Paddle;
        if (!paddle) return reject(new Error('The card checkout did not load.'));
        if (card.environment === 'sandbox') paddle.Environment.set('sandbox');
        paddle.Initialize({ token: card.clientToken });
        resolve(paddle);
      };
      script.onerror = () => {
        paddleReady = null;
        reject(new Error('The card checkout did not load.'));
      };
      document.head.appendChild(script);
    });
  }
  return paddleReady;
}


type LocalGroup = { id: string; name: string; members: number; method: string; monthlyCents?: number; currency?: string; perMember?: boolean };
export function SubscribeGate() {
  const [country, setCountry] = useState('KE');
  const [selected, setSelected] = useState<PlanTier>('STARTER');
  const [period, setPeriod] = useState<BillingPeriod>('MONTH');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  // Owner standing order 19/11/26: the way most people in the group's country
  // pay leads (M-Pesa in Kenya, mobile money, bank transfer); the card comes later.
  const [localGroups, setLocalGroups] = useState<LocalGroup[]>([]);
  const [groupId, setGroupId] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/billing/local')
      .then((res) => (res.ok ? res.json() : { groups: [] }))
      .then((data: { groups?: LocalGroup[] }) => {
        if (cancelled) return;
        const groups = data.groups ?? [];
        setLocalGroups(groups);
        setGroupId((current) => current || groups[0]?.id || '');
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const localGroup = localGroups.find((g) => g.id === groupId) ?? localGroups[0];
  const localMethod = localGroup?.method ?? '';
  // The group's own price, from the server (per member where that applies).
  const localPrice = localGroup?.monthlyCents && localGroup.currency
    ? formatPrice(localGroup.monthlyCents * (period === 'YEAR' ? YEAR_PLAN_MONTHS_PAID : 1), localGroup.currency)
    : '';

  async function payLocally() {
    if (!accepted || !groupId) return;
    setBusy(true);
    setDone(null);
    try {
      const res = await fetch('/api/billing/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, tier: selected, period }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; url?: string; method?: string };
      if (data.ok && data.url) {
        window.location.href = data.url; // Paystack's page: bank transfer, USSD or EFT
        return;
      }
      setDone(
        data.ok
          ? `Check your phone: ${data.method ?? localMethod} is asking you to approve the payment. Your plan starts as soon as it goes through.`
          : data.error ?? 'The payment could not start. Try again in a minute.',
      );
    } catch {
      setDone('No connection. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const COUNTRIES = [
    ['KE', '🇰🇪 Kenya'], ['UG', '🇺🇬 Uganda'], ['TZ', '🇹🇿 Tanzania'], ['RW', '🇷🇼 Rwanda'],
    ['GH', '🇬🇭 Ghana'], ['NG', '🇳🇬 Nigeria'], ['ZA', '🇿🇦 South Africa'],
    ['US', '🇺🇸 United States'], ['GB', '🇬🇧 United Kingdom'], ['IN', '🇮🇳 India'],
    ['DE', '🇩🇪 Germany'], ['BR', '🇧🇷 Brazil'],
  ];

  // Display only: the server sets the amount at checkout.
  function quoteFor(tier: PlanTier) {
    return quoteGroup({ country, members: tier === 'FREE' ? SMALL_GROUP_MAX_MEMBERS : SMALL_GROUP_MAX_MEMBERS + 1, period });
  }

  const perMemberPrices = PER_MEMBER_PRICES[country];
  function perMemberLabel(cents: number): string {
    return `${formatPrice(period === 'YEAR' ? cents * YEAR_PLAN_MONTHS_PAID : cents, quoteFor('STARTER').currency)} a member${period === 'YEAR' ? '/yr' : '/mo'}`;
  }

  function priceLabel(tier: PlanTier): string {
    const p = getPlan(tier);
    if (p.billing === 'CUSTOM') return 'Custom';
    const q = quoteFor(tier);
    // Per member (Kenya, owner 20/11/26): the price follows the group's size.
    if (q.perMember && perMemberPrices) return perMemberLabel(perMemberPrices.full.perMemberCents);
    return `${formatPrice(q.amountCents, q.currency)}${period === 'YEAR' ? '/yr' : '/mo'}`;
  }

  const sample = quoteFor('STARTER');
  const shownTiers: PlanTier[] = sample.perMember ? ['STARTER', 'ENTERPRISE'] : PLAN_ORDER;
  useEffect(() => {
    if (!shownTiers.includes(selected)) setSelected('STARTER');
  }, [shownTiers, selected]);

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
      if (data.card) {
        const card = data.card as CardCheckout;
        const paddle = await loadPaddle(card);
        paddle.Checkout.open({ items: [{ priceId: card.priceId, quantity: 1 }], customData: card.customData });
        setDone(`${p.name}: complete the card payment in the Paddle window. Card payments are processed by Paddle, our online reseller, which handles any tax due.`);
        return;
      }
      if (data.url) {
        window.location.href = data.url; // hosted Stripe Checkout
        return;
      }
      setDone(
        data.note && sample.perMember
          ? `${p.name} selected. ${data.note}`
          : data.note
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
        {sample.perMember
          ? <>Priced by the size of the group: {formatPrice(perMemberPrices?.full.perMemberCents ?? 0, sample.currency)} a member a month, at least {formatPrice(perMemberPrices?.full.floorCents ?? 0, sample.currency)} and never more than {formatPrice(perMemberPrices?.full.ceilingCents ?? 0, sample.currency)} a group. A group that uses meetings and minutes only pays half. A year paid ahead costs {YEAR_PLAN_MONTHS_PAID} months. </>
          : <>Priced per group. Groups of {SMALL_GROUP_MAX_MEMBERS} members or fewer pay the small-group price. </>}
        Groups that join in our first 12 months keep this founding price for as long as they stay subscribed.
        {sample.approved ? '' : ' Prices for this country are indicative until confirmed.'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px,1fr))', gap: 14 }}>
        {shownTiers.map((tier) => {
          const p = getPlan(tier);
          const on = selected === tier;
          const oneGroupPlan = sample.perMember && tier === 'STARTER';
          const features = oneGroupPlan ? PER_MEMBER_FEATURES : p.features;
          return (
            <button key={tier} onClick={() => setSelected(tier)} style={{ textAlign: 'left', background: 'var(--paper)', border: `2px solid ${on ? 'var(--forest)' : 'var(--line)'}`, borderRadius: 'var(--radius)', padding: 18, cursor: 'pointer', fontFamily: 'inherit', boxShadow: on ? 'var(--shadow)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{oneGroupPlan ? 'Your group' : p.name}</span>
                {on && <span style={{ color: 'var(--forest)', fontWeight: 700 }}>✓</span>}
              </div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--forest-deep)', marginTop: 6 }}>{priceLabel(tier)}</div>
              {p.trialDays > 0 && p.billing === 'PER_GROUP' ? <div style={{ fontSize: 11.5, color: 'var(--gold-deep)', fontWeight: 700, marginTop: 2 }}>First month free</div> : <div style={{ height: 16 }} />}
              {oneGroupPlan && perMemberPrices && <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 4 }}>Meetings and minutes only: {perMemberLabel(perMemberPrices.meetingsOnly.perMemberCents)}</div>}
              <ul style={{ marginTop: 10, paddingLeft: 16, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                {features.map((f) => <li key={f}>{f}</li>)}
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

      {getPlan(selected).billing === 'PER_GROUP' && localGroups.length > 0 && (
        <div style={{ marginTop: 18, display: 'grid', gap: 10, maxWidth: 520 }}>
          {localGroups.length > 1 && (
            <label style={{ display: 'grid', gap: 6, fontSize: 14, color: 'var(--ink-2)' }}>
              Group to pay for
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--paper)', fontFamily: 'inherit', fontSize: 14 }}>
                {localGroups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.members} members)</option>)}
              </select>
            </label>
          )}
          <button onClick={() => void payLocally()} disabled={!accepted || busy || !groupId} style={{ padding: '14px 26px', borderRadius: 12, border: 'none', background: accepted && !busy ? 'var(--forest)' : 'var(--bone-2)', color: accepted && !busy ? 'var(--paper)' : 'var(--dim)', fontWeight: 700, fontSize: 15, cursor: accepted && !busy ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
            {busy ? 'Starting the payment…' : localPrice ? `Pay ${localPrice} by ${localMethod}` : `Pay by ${localMethod}`}
          </button>
          <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>You approve it yourself, on your own phone or your bank's page.{sample.perMember ? '' : ' Or pay by card below.'}</span>
        </div>
      )}

      {!(sample.perMember && localGroups.length > 0) && <button onClick={activate} disabled={!accepted || busy} style={{ marginTop: 18, padding: '14px 26px', borderRadius: 12, border: 'none', background: accepted && !busy ? 'var(--gold)' : 'var(--bone-2)', color: accepted && !busy ? 'var(--forest-deep)' : 'var(--dim)', fontWeight: 700, fontSize: 15, cursor: accepted && !busy ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
        {busy ? 'Opening secure checkout…' : getPlan(selected).billing !== 'PER_GROUP' ? 'Contact sales' : localGroups.length > 0 ? 'Pay by card' : 'Start free month'}
      </button>}

      {done && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(47,125,82,.08)', border: '1px solid var(--good)', color: 'var(--good)', fontWeight: 600, fontSize: 14 }}>
          ✓ {done}
        </div>
      )}
    </div>
  );
}
