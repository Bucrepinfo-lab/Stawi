import { Picture, type PictureName } from '@/components/Pictures';

/**
 * Big, friendly tap cards in place of underlined text links (owner 28/11/26):
 * a drawn picture, a plain title, one helper line and an arrow. The whole card
 * is the button; it lifts on hover and presses down on touch.
 */
export interface TapCard {
  href: string;
  pic: PictureName;
  title: string;
  help: string;
  /** Gold accent for the one card that matters most right now. */
  hot?: boolean;
  download?: boolean;
}

export function TapCards({ cards, label }: { cards: TapCard[]; label?: string }) {
  if (cards.length === 0) return null;
  return (
    <nav className="tapcards" aria-label={label ?? 'More'}>
      {cards.map((c) => (
        <a key={c.href} href={c.href} className={`tapcard${c.hot ? ' hot' : ''}`} {...(c.download ? { download: true } : {})}>
          <span className="tapcard-pic" aria-hidden><Picture name={c.pic} size={34} /></span>
          <span className="tapcard-text">
            <strong>{c.title}</strong>
            <span>{c.help}</span>
          </span>
          <svg className="tapcard-go" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      ))}
    </nav>
  );
}
