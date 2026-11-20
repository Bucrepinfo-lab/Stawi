'use client';

import { useEffect, useState } from 'react';
import { houseRoomName, type HouseCheck, type HousePurposeId, type ValueLang } from '@stawi/core';
import { storedLang, track, trackOnce } from './track';

/**
 * "Your papers, ready" — one house, four rooms (owner 20/11/26). Pick what the
 * papers are for; the card shows which ones the group already holds (and from
 * which section) and what is still missing. Nothing is asked for twice.
 */

interface HouseInfo { groupId: string; groupName: string; checks: HouseCheck[]; canOpenPack: boolean }

const T = {
  title: { en: 'Your papers, ready', sw: 'Karatasi zenu, tayari' },
  sub: { en: 'Written once, used in every section. Choose what you need them for.', sw: 'Zinaandikwa mara moja, zinatumika kila sehemu. Chagua mnazihitaji kwa nini.' },
  ready: { en: 'ready', sw: 'tayari' },
  of: { en: 'of', sw: 'kati ya' },
  from: { en: 'From', sw: 'Kutoka' },
  must: { en: 'Needed', sw: 'Inahitajika' },
  helps: { en: 'Helps', sw: 'Inasaidia' },
  more: { en: 'more needed', sw: 'zaidi zinahitajika' },
  fix: { en: 'Complete it', sw: 'Ikamilishe' },
  open: { en: 'Open the papers', sw: 'Fungua karatasi' },
  allSet: { en: 'Everything needed is here. Nothing more to bring.', sw: 'Kila kinachohitajika kipo. Hakuna cha kuleta tena.' },
  officials: { en: 'An official of the group can open and print the papers.', sw: 'Kiongozi wa kikundi anaweza kufungua na kuchapisha karatasi.' },
} as const;

export function DocumentHouse({ groupId, focus }: { groupId: string; focus?: HousePurposeId }) {
  const [lang, setLang] = useState<ValueLang>('en');
  const [info, setInfo] = useState<HouseInfo | null>(null);
  const [picked, setPicked] = useState<HousePurposeId | undefined>(focus);

  useEffect(() => { setLang(storedLang()); }, []);
  useEffect(() => {
    let live = true;
    setInfo(null);
    fetch(`/api/groups/${encodeURIComponent(groupId)}/papers`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: HouseInfo | null) => { if (live && d?.checks?.length) { setInfo(d); trackOnce('view', 'papers'); } })
      .catch(() => undefined);
    return () => { live = false; };
  }, [groupId]);

  if (!info) return null;
  const check = info.checks.find((c) => c.purpose.id === picked) ?? info.checks[0]!;
  const placeHref = (place: string) => (place === 'books' ? `/books?group=${encodeURIComponent(groupId)}` : `/groups/${encodeURIComponent(groupId)}?tab=${place}`);

  return (
    <section className={`house s-card pillar-${check.purpose.pillar}`} aria-label={T.title[lang]}>
      <div className="house-head">
        <span className="house-icon" aria-hidden>🗂️</span>
        <div>
          <h2 className="house-title">{T.title[lang]}</h2>
          <p className="house-sub">{info.groupName} · {T.sub[lang]}</p>
        </div>
      </div>

      <div className="house-purposes" role="tablist" aria-label={T.title[lang]}>
        {info.checks.map((c) => (
          <button key={c.purpose.id} type="button" role="tab" aria-selected={c.purpose.id === check.purpose.id} className="house-purpose"
            onClick={() => { setPicked(c.purpose.id); track('sort', `papers-${c.purpose.id.replace(/_/g, '-')}`); }}>
            <span aria-hidden>{c.purpose.icon}</span>
            <span>{c.purpose.name[lang]}</span>
            {c.complete && <span className="tick" aria-hidden>✓</span>}
          </button>
        ))}
      </div>

      <div className="house-meter" role="img" aria-label={`${check.mustReady} ${T.of[lang]} ${check.mustTotal} ${T.ready[lang]}`}>
        <div className="bar"><i style={{ width: `${check.pct}%` }} /></div>
        <b className="mono">{check.mustReady} {T.of[lang]} {check.mustTotal}</b> <span>{T.ready[lang]}</span>
      </div>

      <ul className="house-list">
        {check.lines.map((l) => (
          <li key={l.doc.id} className={`house-line ${l.ok ? 'ok' : l.kind === 'must' ? 'no' : 'opt'}`}>
            <span className="mark" aria-hidden>{l.ok ? '✓' : l.kind === 'must' ? '!' : '+'}</span>
            <div>
              <p className="name">{l.doc.name[lang]}</p>
              <p className="have">
                {l.doc.have[lang]}
                {!l.ok && l.shortBy > 0 && <> — <b>{l.shortBy} {T.more[lang]}</b></>}
              </p>
              {!l.ok && <p className="how">{l.doc.fix[lang]}</p>}
              <div className="tags">
                <span className={`tag room-${l.doc.room}`}>{T.from[lang]}: {houseRoomName(l.doc.room, lang)}</span>
                <span className="tag">{l.kind === 'must' ? T.must[lang] : T.helps[lang]}</span>
                {!l.ok && <a className="tag go" href={placeHref(l.doc.place)} onClick={() => track('cta', `papers-fix-${l.doc.id.replace(/_/g, '-')}`)}>{T.fix[lang]} →</a>}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {check.complete && <p className="house-done">{T.allSet[lang]}</p>}
      {info.canOpenPack
        ? <a className="house-go" href={`/groups/${encodeURIComponent(groupId)}/papers?for=${check.purpose.id}`} onClick={() => track('cta', 'papers-open')}>{T.open[lang]}</a>
        : <p className="house-note">{T.officials[lang]}</p>}
    </section>
  );
}
