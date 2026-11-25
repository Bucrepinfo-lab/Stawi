'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { escalationLevelName, type ValueLang } from '@stawi/core';
import type { AttentionItem } from '@/lib/attention';
import { storedLang, track, trackOnce } from './track';

/**
 * "Needs attention" — the work that has stopped moving in this group, shown
 * only to the person who must act and to those it has been raised to. The
 * server decides the list; this only draws it.
 */

const T = {
  title: { en: 'Needs attention', sw: 'Yanahitaji kushughulikiwa' },
  sub: { en: 'Only you and the people above you can see this list.', sw: 'Ni wewe na walio juu yako tu wanaoona orodha hii.' },
  ok: { en: 'All in order', sw: 'Kila kitu kiko sawa' },
  okSub: { en: 'Nothing is waiting on you today.', sw: 'Hakuna kinachokusubiri leo.' },
  yours: { en: 'Yours to do', sw: 'Ni kazi yako' },
  who: { en: 'Waiting on', sw: 'Inamsubiri' },
  days: { en: 'days late', sw: 'siku za kuchelewa' },
  day: { en: 'day late', sw: 'siku ya kuchelewa' },
  due: { en: 'Due now', sw: 'Inatakiwa sasa' },
} as const;

export function AttentionCard({ groupId, items, isOfficial }: { groupId: string; items: AttentionItem[]; isOfficial: boolean }) {
  const [lang, setLang] = useState<ValueLang>('en');
  useEffect(() => { setLang(storedLang()); }, []);
  useEffect(() => { if (items.length > 0) trackOnce('view', 'attention'); }, [items.length]);

  if (items.length === 0) {
    if (!isOfficial) return null;
    return (
      <section className="att s-card plain no-print" style={{ '--pillar': 'var(--good)' } as CSSProperties} aria-label={T.ok[lang]}>
        <div className="att-ok">
          <span className="att-bell" aria-hidden>✅</span>
          <div>
            <p className="att-title">{T.ok[lang]}</p>
            <p className="att-sub">{T.okSub[lang]}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="att s-card no-print" aria-label={T.title[lang]} data-group={groupId}>
      <div className="att-head">
        <span className="att-bell" aria-hidden>🔔</span>
        <div>
          <h2 className="att-title">{T.title[lang]}</h2>
          <p className="att-sub">{T.sub[lang]}</p>
        </div>
        <span className="att-count" aria-hidden>{items.length}</span>
      </div>
      <ul className="att-list">
        {items.map((it) => (
          <li key={it.key} className={`att-item l${it.level}`}>
            <div className="att-meta">
              <span className="att-chip lvl">
                <span className="att-steps" aria-hidden>
                  {[1, 2, 3, 4].map((n) => <i key={n} className={n <= it.level ? 'on' : undefined} />)}
                </span>
                {it.mine ? T.yours[lang] : escalationLevelName(it.level, lang)}
              </span>
              <span className="att-chip">
                {it.daysOverdue > 0
                  ? <><span className="n">{it.daysOverdue}</span> {it.daysOverdue === 1 ? T.day[lang] : T.days[lang]}</>
                  : T.due[lang]}
              </span>
              {!it.mine && <span className="att-chip">{T.who[lang]}: {it.responsibleName}</span>}
            </div>
            <h3>{it.title[lang]}</h3>
            <p>{it.detail[lang]}</p>
            <a className="att-go" href={it.href} onClick={() => track('cta', `attention-${it.rule.replace(/_/g, '-')}`)}>{it.action[lang]}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
