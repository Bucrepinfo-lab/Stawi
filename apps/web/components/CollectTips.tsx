'use client';

import { useEffect, useState } from 'react';
import { COLLECT_TIPS, type ValueLang } from '@stawi/core';
import { storedLang, track } from './track';
import { Pic } from './Pictures';

/**
 * "A safer way to receive contributions" — a kind note for the treasurer about
 * Pochi la Biashara and a Till, with Safaricom's own pages as the source, and
 * a plain word that writing payments in by hand is fine meanwhile. Folded.
 */
const T = {
  title: { en: 'A safer way to receive contributions', sw: 'Njia salama zaidi ya kupokea michango' },
  sub: { en: 'Pochi la Biashara or a Till — and what to do until then.', sw: 'Pochi la Biashara au Till — na la kufanya hadi hapo.' },
  source: { en: 'Source', sw: 'Chanzo' },
} as const;

export function CollectTips() {
  const [lang, setLang] = useState<ValueLang>('en');
  useEffect(() => { setLang(storedLang()); }, []);
  return (
    <details className="tips s-card pillar-1" onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) track('open', 'collect-tips'); }}>
      <summary>
        <span className="vb-icon" aria-hidden>🏪</span>
        <span>
          <span className="tips-title">{T.title[lang]}</span>
          <span className="tips-sub">{T.sub[lang]}</span>
        </span>
        <span className="vb-chev" aria-hidden>▾</span>
      </summary>
      <div className="tips-body">
        {COLLECT_TIPS.map((t) => (
          <article key={t.id} className="tips-card">
            <h3><span aria-hidden><Pic icon={t.icon} size={26} /></span> {t.title[lang]}</h3>
            <p>{t.body[lang]}</p>
            {t.steps && <p className="tips-steps">{t.steps[lang]}</p>}
            {t.source && (
              <a href={t.source.url} target="_blank" rel="noopener noreferrer" onClick={() => track('source', `collect-${t.id}`)}>
                {T.source[lang]}: {t.source.label}
              </a>
            )}
          </article>
        ))}
      </div>
    </details>
  );
}
