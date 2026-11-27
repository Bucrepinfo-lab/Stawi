'use client';

import { useEffect, useState } from 'react';
import { stepLabel, type MoneyCheck, type MoneyStatement, type MoneyStep, type ValueLang } from '@stawi/core';
import { storedLang, track } from './track';

/**
 * "Money statement" — the group's table money and the business books on one
 * calendar, by day, week or month, with the checks that show the record agrees
 * with itself (owner 20/11/26). Folded away until opened.
 */

interface MoneyInfo {
  groupName: string; businessName: string | null; currency: string;
  day: MoneyStatement; week: MoneyStatement; month: MoneyStatement;
  checks: MoneyCheck[]; hasGroup: boolean; hasBusiness: boolean;
}
type Side = 'together' | 'group' | 'business';

const T = {
  title: { en: 'Money statement', sw: 'Taarifa ya fedha' },
  day: { en: 'By day', sw: 'Kwa siku' },
  week: { en: 'By week', sw: 'Kwa wiki' },
  month: { en: 'By month', sw: 'Kwa mwezi' },
  together: { en: 'Together', sw: 'Pamoja' },
  group: { en: 'Group', sw: 'Kikundi' },
  business: { en: 'Business', sw: 'Biashara' },
  when: { en: 'When', sw: 'Lini' },
  in: { en: 'In', sw: 'Zilizoingia' },
  out: { en: 'Out', sw: 'Zilizotoka' },
  left: { en: 'Left', sw: 'Zilizobaki' },
  all: { en: 'All on record', sw: 'Zote zilizorekodiwa' },
  none: { en: 'No money is written yet.', sw: 'Bado hakuna pesa iliyoandikwa.' },
  checks: { en: 'Checked', sw: 'Imekaguliwa' },
  latest: { en: 'Latest month', sw: 'Mwezi wa karibuni' },
} as const;

const money = (cents: number) => (cents / 100).toLocaleString('en-KE');

export function MoneySummary({ groupId }: { groupId: string }) {
  const [lang, setLang] = useState<ValueLang>('en');
  const [info, setInfo] = useState<MoneyInfo | null>(null);
  const [step, setStep] = useState<MoneyStep>('month');
  const [side, setSide] = useState<Side>('together');

  useEffect(() => { setLang(storedLang()); }, []);
  useEffect(() => {
    let live = true;
    setInfo(null);
    fetch(`/api/groups/${encodeURIComponent(groupId)}/money`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MoneyInfo | null) => { if (live && d?.month) setInfo(d); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [groupId]);

  if (!info || (!info.hasGroup && !info.hasBusiness)) return null;
  const both = info.hasGroup && info.hasBusiness;
  const shown: Side = both ? side : info.hasBusiness ? 'business' : 'group';
  const st = info[step];
  const rows = st[shown];
  const total = st.totals[shown];
  const latest = info.month[shown][0];
  const allOk = info.checks.every((c) => c.ok);

  return (
    <details className="money s-card pillar-3" onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) track('open', 'money-statement'); }}>
      <summary>
        <span className="money-icon" aria-hidden>🧮</span>
        <span>
          <span className="money-title">{T.title[lang]}</span>
          {latest && (
            <span className="money-sub">
              {T.latest[lang]}: {T.in[lang]} <b className="mono">{money(latest.inCents)}</b> · {T.out[lang]} <b className="mono">{money(latest.outCents)}</b> · {T.left[lang]} <b className="mono">{money(latest.leftCents)}</b>
            </span>
          )}
        </span>
        <span className={`money-badge ${allOk ? 'ok' : 'bad'}`} aria-hidden>{allOk ? '✓' : '!'}</span>
      </summary>

      <div className="money-body">
        <div className="s-tabs" role="tablist" aria-label={T.title[lang]} style={{ marginTop: 0 }}>
          {(['day', 'week', 'month'] as MoneyStep[]).map((s) => (
            <button key={s} type="button" role="tab" aria-selected={step === s} className="s-tab" onClick={() => { setStep(s); track('sort', `money-${s}`); }}>{T[s][lang]}</button>
          ))}
        </div>
        {both && (
          <div className="money-sides" role="tablist" aria-label={T.title[lang]}>
            {(['together', 'group', 'business'] as Side[]).map((s) => (
              <button key={s} type="button" role="tab" aria-selected={shown === s} className="money-side" onClick={() => setSide(s)}>
                {s === 'business' && info.businessName ? info.businessName : T[s][lang]}
              </button>
            ))}
          </div>
        )}

        {rows.length === 0 ? <p className="money-none">{T.none[lang]}</p> : (
          <div className="money-scroll">
            <div className="doc-table-wrap"><table className="money-table">
              <thead><tr><th>{T.when[lang]}</th><th>{T.in[lang]}</th><th>{T.out[lang]}</th><th>{T.left[lang]}</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.start}>
                    <td>{stepLabel(r.start, step, lang)}</td>
                    <td className="n">{money(r.inCents)}</td>
                    <td className="n">{money(r.outCents)}</td>
                    <td className={`n ${r.leftCents < 0 ? 'neg' : ''}`}>{money(r.leftCents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td>{T.all[lang]} ({info.currency})</td><td className="n">{money(total.inCents)}</td><td className="n">{money(total.outCents)}</td><td className={`n ${total.leftCents < 0 ? 'neg' : ''}`}>{money(total.leftCents)}</td></tr>
              </tfoot>
            </table></div>
          </div>
        )}

        <ul className="money-checks" aria-label={T.checks[lang]}>
          {info.checks.map((c) => (
            <li key={c.id} className={c.ok ? 'ok' : 'bad'}><span aria-hidden>{c.ok ? '✓' : '!'}</span>{c.text[lang]}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}
