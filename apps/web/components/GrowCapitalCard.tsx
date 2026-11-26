'use client';

import { useEffect, useState } from 'react';
import { formatMoney, MIN_NOT_MAX, monthsLabel, monthsToTarget, monthsWithExtra } from '@stawi/core';
import { storedLang } from './track';

/**
 * "A minimum, not a maximum" (owner 26/11/26): a lit card under the group's
 * capital that encourages members who can to put in more than the agreed
 * minimum, and shows — with the group's own numbers — how much sooner the
 * group reaches the capital for its business. Nobody is pushed.
 */
const toCents = (v: string) => Math.round((parseFloat(v.replace(/,/g, '')) || 0) * 100);

export function GrowCapitalCard({ groupId, members, totalCents }: { groupId: string; members: number; totalCents: number }) {
  const [lang, setLang] = useState<'en' | 'sw'>('en');
  const [target, setTarget] = useState('');
  const [minimum, setMinimum] = useState('100');
  const [meetings, setMeetings] = useState('4');
  const [extraMembers, setExtraMembers] = useState(String(Math.max(1, Math.round(members / 3))));
  const [extra, setExtra] = useState('500');
  const key = `stawiGrow:${groupId}`;

  useEffect(() => {
    setLang(storedLang());
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? 'null') as Record<string, string> | null;
      if (saved) { setTarget(saved.target ?? ''); setMinimum(saved.minimum ?? '100'); setMeetings(saved.meetings ?? '4'); }
    } catch { /* nothing saved */ }
  }, [key]);
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify({ target, minimum, meetings })); } catch { /* private mode */ }
  }, [key, target, minimum, meetings]);

  const t = MIN_NOT_MAX[lang];
  const pace = { totalCents, targetCents: toCents(target), members: Math.max(1, members), minimumCents: toCents(minimum), meetingsPerMonth: Math.max(1, Number(meetings) || 1) };
  const ready = pace.targetCents > totalCents && pace.minimumCents > 0;
  const slow = ready ? monthsToTarget(pace) : null;
  const fast = ready ? monthsWithExtra(pace, Number(extraMembers) || 0, toCents(extra)) : null;

  return (
    <section className="gc" aria-labelledby="gc-title">
      <div className="gc-head">
        <span className="gc-ico" aria-hidden>
          <svg viewBox="0 0 32 32" width="34" height="34"><path d="M6 25h20" stroke="#16261f" strokeWidth="1.4" strokeLinecap="round" /><rect x="7" y="17" width="4" height="8" rx="1" fill="#2f855a" /><rect x="14" y="12" width="4" height="13" rx="1" fill="#1f4d3a" /><rect x="21" y="7" width="4" height="18" rx="1" fill="#e0a32e" /><path d="M8 13l6-5 4 3 7-6" fill="none" stroke="#c5613c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <div>
          <h2 id="gc-title">{t.title}</h2>
          <p>{t.lead}</p>
        </div>
      </div>
      <ul className="gc-points">{t.points.map((p) => <li key={p}>{p}</li>)}</ul>
      <a className="mr-btn gc-share" href={`https://wa.me/?text=${encodeURIComponent(`${t.title}\n\n${t.lead}\n\n${t.points.map((p) => `• ${p}`).join('\n')}`)}`} target="_blank" rel="noopener noreferrer">
        {lang === 'sw' ? 'Tuma kwa kikundi kwenye WhatsApp' : 'Send this to my group on WhatsApp'}
      </a>

      <details className="gc-calc">
        <summary>{lang === 'sw' ? 'Ona mtakavyofika kwa haraka' : 'See how much sooner you get there'}</summary>
        <div className="pp-grid">
          <label className="pp-field">{lang === 'sw' ? 'Mtaji wa biashara (KES)' : 'Capital the business needs (KES)'}<input className="mr-input mono" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="300,000" /></label>
          <label className="pp-field">{lang === 'sw' ? 'Kiwango cha chini kila mkutano (KES)' : 'Agreed minimum per meeting (KES)'}<input className="mr-input mono" inputMode="decimal" value={minimum} onChange={(e) => setMinimum(e.target.value)} /></label>
          <label className="pp-field">{lang === 'sw' ? 'Mikutano kwa mwezi' : 'Meetings a month'}<input className="mr-input mono" inputMode="numeric" value={meetings} onChange={(e) => setMeetings(e.target.value.replace(/\D/g, ''))} /></label>
          <label className="pp-field">{lang === 'sw' ? 'Wanachama wanaoweza kuongeza' : 'Members who can add more'}<input className="mr-input mono" inputMode="numeric" value={extraMembers} onChange={(e) => setExtraMembers(e.target.value.replace(/\D/g, ''))} /></label>
          <label className="pp-field">{lang === 'sw' ? 'Wanaongeza kila mkutano (KES)' : 'They add each meeting (KES)'}<input className="mr-input mono" inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} /></label>
        </div>
        {ready ? (
          <div className="gc-compare" role="status">
            <div className="slow"><span>{lang === 'sw' ? 'Kiwango cha chini tu' : 'Minimum only'}</span><strong>{monthsLabel(slow, lang)}</strong></div>
            <div className="fast"><span>{lang === 'sw' ? 'Wengine wakiongeza' : 'Some add more'}</span><strong>{monthsLabel(fast, lang)}</strong></div>
            <p className="mr-meta">{lang === 'sw' ? 'Mmeweka' : 'Saved so far'}: KES {formatMoney(totalCents)} · {members} {lang === 'sw' ? 'wanachama' : 'members'}. {lang === 'sw' ? 'Makadirio tu; hesabu halisi iko kwenye rekodi zenu.' : 'An estimate; your real figures are in your records.'}</p>
          </div>
        ) : (
          <p className="mr-meta">{lang === 'sw' ? 'Andika mtaji unaohitajika ili kuona.' : 'Type the capital your business needs to see the difference.'}</p>
        )}
      </details>
    </section>
  );
}
