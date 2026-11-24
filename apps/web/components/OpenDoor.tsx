import { welcomeNotes, type ValueLang } from '@stawi/core';
import { Pic } from './Pictures';

/**
 * "Use only what you need" — a warm, honest welcome for people who want one
 * part of Stawi: meetings only, keeping their own bank, or the books for a
 * business with no group (owner 20/11/26). Every line is true of the product.
 */
const T = {
  kicker: { en: 'An open door', sw: 'Mlango uko wazi' },
  title: { en: 'Use only what you need', sw: 'Tumia unachohitaji tu' },
  sub: { en: 'Stawi is one house with separate rooms. Open the ones that help you and leave the rest closed.', sw: 'Stawi ni nyumba moja yenye vyumba tofauti. Fungua vinavyokusaidia na vingine viache vimefungwa.' },
} as const;

export function OpenDoor({ lang = 'en', savingsCredit = false, heading = true }: { lang?: ValueLang; savingsCredit?: boolean; heading?: boolean }) {
  const notes = welcomeNotes({ savingsCredit });
  return (
    <section className="door" aria-label={T.title[lang]}>
      {heading && (
        <div className="door-head">
          <p className="vb-kicker">{T.kicker[lang]}</p>
          <h2 className="vb-promise">{T.title[lang]}</h2>
          <p className="door-sub">{T.sub[lang]}</p>
        </div>
      )}
      <div className="door-list">
        {notes.map((n) => (
          <article key={n.id} className={`door-card s-card pillar-${n.pillar}`}>
            <span className="door-icon" aria-hidden><Pic icon={n.icon} size={34} /></span>
            <h3>{n.title[lang]}</h3>
            <p>{n.body[lang]}</p>
            <a className="door-go" href={`/groups/new?start=${n.start}`}>{n.cta[lang]}</a>
          </article>
        ))}
      </div>
    </section>
  );
}
