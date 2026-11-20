'use client';

import { useEffect, useState } from 'react';
import type { ValueLang } from '@stawi/core';
import { storedLang, track } from './track';

/**
 * "Pay my contribution" — a member pays from their own phone (owner 20/11/26).
 * Tap an amount, tap Pay, approve on the phone. Shown only where the group's
 * country has its way to pay switched on; otherwise nothing is drawn.
 */

interface PayInfo { canPay: boolean; options: { way: string; label: string; currency: string }[]; quickCents: number[]; phoneHint: string | null }

const T = {
  title: { en: 'Pay my contribution', sw: 'Lipa mchango wangu' },
  sub: { en: 'Choose an amount. A request comes to your phone. You approve it with your own PIN.', sw: 'Chagua kiasi. Ombi litakuja kwenye simu yako. Unalithibitisha kwa PIN yako mwenyewe.' },
  other: { en: 'Another amount', sw: 'Kiasi kingine' },
  phone: { en: 'Pay from another number (optional)', sw: 'Lipa kwa namba nyingine (si lazima)' },
  to: { en: 'The request goes to your phone', sw: 'Ombi litaenda kwenye simu yako' },
  pay: { en: 'Pay with', sw: 'Lipa kwa' },
  sending: { en: 'Sending…', sw: 'Inatuma…' },
  sent: { en: 'Check your phone now and enter your PIN. Your contribution shows here once it is paid.', sw: 'Angalia simu yako sasa na uweke PIN. Mchango wako utaonekana hapa ukishalipwa.' },
  fail: { en: 'The request could not be sent. Please try again.', sw: 'Ombi halikutumwa. Tafadhali jaribu tena.' },
} as const;

export function PayContribution({ groupId }: { groupId: string }) {
  const [lang, setLang] = useState<ValueLang>('en');
  const [info, setInfo] = useState<PayInfo | null>(null);
  const [cents, setCents] = useState<number>(0);
  const [custom, setCustom] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { setLang(storedLang()); }, []);
  useEffect(() => {
    let live = true;
    setInfo(null);
    setNote(null);
    fetch(`/api/contributions/pay?groupId=${encodeURIComponent(groupId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: PayInfo | null) => { if (live) setInfo(d); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [groupId]);

  const option = info?.options[0];
  if (!info?.canPay || !option) return null;

  const amountCents = custom ? Math.round(Number(custom) * 100) : cents;
  const valid = Number.isInteger(amountCents) && amountCents > 0;

  async function pay() {
    if (!valid || busy) return;
    setBusy(true);
    setNote(null);
    track('cta', 'pay-contribution');
    try {
      const res = await fetch('/api/contributions/pay', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ groupId, amountCents, phone: phone.trim() || undefined }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; errorSw?: string; message?: string };
      setNote(data.ok ? { ok: true, text: data.message ?? T.sent[lang] } : { ok: false, text: (lang === 'sw' && data.errorSw) || data.error || T.fail[lang] });
    } catch {
      setNote({ ok: false, text: T.fail[lang] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pay s-card" aria-label={T.title[lang]}>
      <div className="pay-head">
        <span className="pay-icon" aria-hidden>📲</span>
        <div>
          <h2 className="pay-title">{T.title[lang]}</h2>
          <p className="pay-sub">{T.sub[lang]}</p>
        </div>
      </div>
      <div className="pay-amounts" role="group" aria-label={T.title[lang]}>
        {info.quickCents.map((c) => (
          <button key={c} type="button" className="pay-amt" aria-pressed={!custom && cents === c} onClick={() => { setCents(c); setCustom(''); }}>
            <span className="cur">{option.currency}</span> {(c / 100).toLocaleString('en-KE')}
          </button>
        ))}
      </div>
      <label className="pay-field">
        <span>{T.other[lang]} ({option.currency})</span>
        <input inputMode="numeric" pattern="[0-9]*" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="0" />
      </label>
      <details className="pay-more">
        <summary>{T.phone[lang]}</summary>
        <label className="pay-field">
          <input inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+ ]/g, '').slice(0, 16))} placeholder="07…" />
        </label>
      </details>
      {!phone && info.phoneHint && <p className="pay-hint">{T.to[lang]} <b className="mono">{info.phoneHint}</b></p>}
      <button type="button" className="pay-go" disabled={!valid || busy} onClick={pay}>
        {busy ? T.sending[lang] : <>{T.pay[lang]} {option.label}{valid ? ` · ${option.currency} ${(amountCents / 100).toLocaleString('en-KE')}` : ''}</>}
      </button>
      {note && <p className={`pay-note ${note.ok ? 'ok' : 'bad'}`} role="status">{note.text}</p>}
    </section>
  );
}
