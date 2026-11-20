'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PILLAR_NAMES, PILLAR_PROMISE, valueLang, valuePropsFor, type ValueLang, type ValuePillar, type ValueProp } from '@stawi/core';
import { storedLang, track, trackOnce } from './track';

/**
 * "The problem · the proof · what Stawi does" banners (owner 20/11/26).
 * Every fact links to its source; planned tools say "Coming soon".
 * Collapsed by default so pages stay light; the first banner starts open.
 */

const WORDS: Record<ValueLang, { kicker: string; proof: string; source: string; fix: string; live: string; soon: string }> = {
  en: { kicker: 'Problems we solve', proof: 'The proof', source: 'Source', fix: 'What Stawi does', live: 'Ready now', soon: 'Coming soon' },
  sw: { kicker: 'Matatizo tunayotatua', proof: 'Ushahidi', source: 'Chanzo', fix: 'Stawi hufanya nini', live: 'Iko tayari', soon: 'Inakuja karibuni' },
};

function Banner({ prop, lang, startOpen }: { prop: ValueProp; lang: ValueLang; startOpen: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const w = WORDS[lang];

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        trackOnce('view', prop.id);
        io.disconnect();
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [prop.id]);

  return (
    <details
      ref={ref}
      className={`vb-card pillar-${prop.pillar}`}
      open={startOpen}
      onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) trackOnce('open', prop.id); }}
    >
      <summary>
        <span className="vb-icon" aria-hidden>{prop.icon}</span>
        <span className="vb-pain">{prop.pain[lang]}</span>
        <span className="vb-chev" aria-hidden>⌄</span>
      </summary>
      <div className="vb-body">
        <div className="vb-fact">
          <span className="vb-label">{w.proof}</span>
          {prop.fact[lang]}{' '}
          <a href={prop.source.url} target="_blank" rel="noopener noreferrer" onClick={() => track('source', prop.id)}>
            {w.source}: {prop.source.label}
          </a>
        </div>
        <div>
          <span className="vb-label">{w.fix}</span>
          <p className="vb-solution">{prop.solution[lang]}</p>
        </div>
        <div className="vb-row">
          {prop.status === 'live' ? (
            <>
              <Link href={prop.href} className="vb-cta" onClick={() => track('cta', prop.id)}>{prop.cta[lang]}</Link>
              <span className="vb-live">✓ {w.live}</span>
            </>
          ) : (
            <span className="vb-soon">⏳ {w.soon}</span>
          )}
        </div>
      </div>
    </details>
  );
}

export function ValueBanners({
  pillars,
  saccoPlus = false,
  lang: langProp,
  limit,
  showHeading = true,
  startCollapsed = false,
}: {
  pillars: ValuePillar[];
  saccoPlus?: boolean;
  /** Pass the page's language; otherwise the one saved on the home page is used. */
  lang?: string;
  /** Show at most this many banners per pillar. */
  limit?: number;
  showHeading?: boolean;
  /** On working screens keep every banner closed so the tool stays in view. */
  startCollapsed?: boolean;
}) {
  const shown = pillars.filter((p) => p !== 4 || saccoPlus);
  const [active, setActive] = useState<ValuePillar>(shown[0] ?? 1);
  const [saved, setSaved] = useState<ValueLang>('en');
  useEffect(() => { setSaved(storedLang()); }, []);
  const lang = langProp ? valueLang(langProp) : saved;
  if (!shown.length) return null;
  const pillar = shown.includes(active) ? active : shown[0]!;
  const props = valuePropsFor(pillar, { saccoPlus }).slice(0, limit ?? 99);
  const w = WORDS[lang];

  return (
    <section className={`vb-wrap pillar-${pillar}`} aria-label={w.kicker}>
      {showHeading && (
        <div className="vb-head">
          <div>
            <p className="vb-kicker">{w.kicker}</p>
            <h2 className="vb-promise">{PILLAR_PROMISE[pillar][lang]}</h2>
          </div>
        </div>
      )}
      {shown.length > 1 && (
        <div className="vb-tabs" role="tablist" aria-label={w.kicker}>
          {shown.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={p === pillar}
              className={`vb-tab pillar-${p}`}
              onClick={() => { setActive(p); track('tab', `value-pillar-${p}`); }}
            >
              {PILLAR_NAMES[p][lang]}
            </button>
          ))}
        </div>
      )}
      <div className="vb-list" role={shown.length > 1 ? 'tabpanel' : undefined}>
        {props.map((prop, i) => (
          <Banner key={prop.id} prop={prop} lang={lang} startOpen={i === 0 && !startCollapsed} />
        ))}
      </div>
    </section>
  );
}
