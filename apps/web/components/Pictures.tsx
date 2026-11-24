import type { ReactElement } from 'react';
import { Books, CLAY, FOREST, GOLD, GOLD_DEEP, Group, INK, Ideas, LEAF, Messages, PAGE, SKY, Share, TILE, outline } from './TabPictures';

/**
 * Stawi's picture library (standing rule 19, owner 24/11/26): our own simple
 * drawings wherever a picture stands beside words: tabs, module cards, value
 * banners, share buttons, document lists. Same hand as the main-tab pictures:
 * filled shapes, one ink outline, brand colours, on a light tile.
 *
 * The shared data in @stawi/core still names each picture by its old emoji (the
 * phone app reads the same data), so `pictureFor` maps that emoji to a drawing.
 * An emoji with no drawing yet is shown as it was, so nothing ever goes blank.
 */
const line = { stroke: INK, strokeWidth: 1.1, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

const DRAWINGS = {
  group: Group,
  ideas: Ideas,
  books: Books,
  messages: Messages,
  share: Share,
  // A sheet of paper with a pencil writing on it: minutes, notes.
  note: () => (
    <>
      <path d='M7 4.6h13.4l4.6 4.6v18.2H7z' fill={PAGE} {...outline} />
      <path d='M20.4 4.6v4.6H25' {...line} />
      <path d='M10.4 13h8M10.4 16.8h6M10.4 20.6h4' stroke={SKY} strokeWidth='1.3' strokeLinecap='round' />
      <path d='M17.2 24.8l1-3.6 8-8 2.6 2.6-8 8z' fill={GOLD} {...outline} />
      <path d='M17.2 24.8l1-3.6 2.6 2.6z' fill={INK} />
    </>
  ),
  // A pad with ticked points: the agenda.
  agenda: () => (
    <>
      <rect x='6.4' y='6' width='19.2' height='21.4' rx='2.6' fill={PAGE} {...outline} />
      <rect x='11.6' y='3.8' width='8.8' height='4.4' rx='1.6' fill={CLAY} {...outline} />
      <path d='M9.6 13.2l1.4 1.4 2.4-2.6M9.6 18.4l1.4 1.4 2.4-2.6M9.6 23.6l1.4 1.4 2.4-2.6' stroke={LEAF} strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' fill='none' />
      <path d='M16 13.6h6.4M16 18.8h6.4M16 24h4.4' stroke={SKY} strokeWidth='1.3' strokeLinecap='round' />
    </>
  ),
  // A name badge on a cord: the officials.
  badge: () => (
    <>
      <path d='M12 3.6l4 5.4 4-5.4' {...line} stroke={CLAY} strokeWidth='1.8' />
      <rect x='6' y='8.4' width='20' height='19.4' rx='3' fill={PAGE} {...outline} />
      <circle cx='16' cy='15' r='3' fill={FOREST} {...outline} />
      <path d='M10.6 24.4c0-3 2.4-4.6 5.4-4.6s5.4 1.6 5.4 4.6z' fill={FOREST} {...outline} />
    </>
  ),
  // A tied money bag with a coin mark.
  moneybag: () => (
    <>
      <path d='M12.2 9.6L10 5.2c2-1.2 4-1.2 6-.2 2-1 4-1 6 .2l-2.2 4.4z' fill={GOLD_DEEP} {...outline} />
      <path d='M11.6 10.4h8.8c4 3.2 6.4 7 6.4 10.8 0 4-3.6 6.4-10.8 6.4S5.2 25.2 5.2 21.2c0-3.8 2.4-7.6 6.4-10.8z' fill={GOLD} {...outline} />
      <rect x='11' y='9' width='10' height='2.4' rx='1.2' fill={CLAY} {...outline} />
      <circle cx='16' cy='19.6' r='3.6' fill={PAGE} {...outline} />
      <path d='M16 17.6v4M14.6 19.6h2.8' stroke={GOLD_DEEP} strokeWidth='1.3' strokeLinecap='round' />
    </>
  ),
  // Two hands clasped: saving and lending to each other.
  handshake: () => (
    <>
      <path d='M2.6 11.4l5-1.8 2 9.6-5 1.8z' fill={FOREST} {...outline} />
      <path d='M29.4 11.4l-5-1.8-2 9.6 5 1.8z' fill={SKY} {...outline} />
      <path d='M9.2 11.6l4.6-1.4 3 1.2 3.4-1.2 2.8 1.2-.8 7.4-5.6 5.2c-1 .8-2.2.8-3 0l-5.2-4.8z' fill={GOLD} {...outline} />
      <path d='M13.4 14.6l3.4-2.4 5 4.6M12.4 19l2.2 2M15 17.4l2.4 2.2M17.8 15.8l2.4 2.2' {...line} />
    </>
  ),
  // A bank: roof, pillars, a coin on the roof.
  bank: () => (
    <>
      <path d='M3.8 12.4L16 4.8l12.2 7.6z' fill={SKY} {...outline} />
      <circle cx='16' cy='9.6' r='1.7' fill={GOLD} {...outline} />
      <rect x='6.4' y='13.6' width='3.4' height='9.4' fill={PAGE} {...outline} />
      <rect x='14.3' y='13.6' width='3.4' height='9.4' fill={PAGE} {...outline} />
      <rect x='22.2' y='13.6' width='3.4' height='9.4' fill={PAGE} {...outline} />
      <rect x='3.8' y='23.6' width='24.4' height='3.6' rx='1' fill={SKY} {...outline} />
    </>
  ),
  // An open eye: everyone can see the money.
  eye: () => (
    <>
      <path d='M3.4 16c3.4-5.4 7.6-8 12.6-8s9.2 2.6 12.6 8c-3.4 5.4-7.6 8-12.6 8s-9.2-2.6-12.6-8z' fill={PAGE} {...outline} />
      <circle cx='16' cy='16' r='5' fill={SKY} {...outline} />
      <circle cx='16' cy='16' r='2.2' fill={INK} />
      <circle cx='17.6' cy='14.4' r='1' fill={PAGE} />
    </>
  ),
  // A government office: pillars and a flag. Registered, official.
  office: () => (
    <>
      <path d='M16 2.8v5' {...line} />
      <path d='M16 2.8h5.2l-1.4 1.7 1.4 1.7H16z' fill={CLAY} {...outline} />
      <path d='M4.4 13.4L16 7.4l11.6 6z' fill={FOREST} {...outline} />
      <rect x='6.6' y='14.6' width='3' height='8.6' fill={PAGE} {...outline} />
      <rect x='12' y='14.6' width='3' height='8.6' fill={PAGE} {...outline} />
      <rect x='17' y='14.6' width='3' height='8.6' fill={PAGE} {...outline} />
      <rect x='22.4' y='14.6' width='3' height='8.6' fill={PAGE} {...outline} />
      <rect x='4' y='23.8' width='24' height='3.4' rx='1' fill={FOREST} {...outline} />
    </>
  ),
  // A certificate with a round seal and ribbon.
  certificate: () => (
    <>
      <rect x='4.4' y='5.4' width='23.2' height='17' rx='2' fill={PAGE} {...outline} />
      <path d='M8.4 10.4h10M8.4 14h7' stroke={SKY} strokeWidth='1.3' strokeLinecap='round' />
      <path d='M19.4 21.6l-1.2 6.4 3.4-2 3.4 2-1.2-6.4z' fill={CLAY} {...outline} />
      <circle cx='21.6' cy='18.2' r='4' fill={GOLD} {...outline} />
      <circle cx='21.6' cy='18.2' r='1.6' fill={GOLD_DEEP} />
    </>
  ),
  // A microphone: say it in your own words.
  mic: () => (
    <>
      <rect x='11.6' y='3.6' width='8.8' height='14.4' rx='4.4' fill={CLAY} {...outline} />
      <path d='M12.4 9h3M12.4 12.2h3' stroke={INK} strokeWidth='1' strokeLinecap='round' />
      <path d='M7.6 14.6c0 4.8 3.6 8 8.4 8s8.4-3.2 8.4-8' {...line} strokeWidth='1.6' />
      <path d='M16 22.6v4.2M11.6 27.4h8.8' {...line} strokeWidth='1.6' />
    </>
  ),
  // A compass: which way to go.
  compass: () => (
    <>
      <circle cx='16' cy='16' r='11.4' fill={PAGE} {...outline} />
      <circle cx='16' cy='16' r='8.6' fill='none' stroke={SKY} strokeWidth='1' />
      <path d='M20.8 11.2l-3 6.6-6.6 3 3-6.6z' fill={CLAY} {...outline} />
      <path d='M20.8 11.2l-6.6 3 3.6 3.6z' fill={GOLD} {...outline} />
      <circle cx='16' cy='16' r='1.2' fill={INK} />
    </>
  ),
  // An hourglass: time is running.
  hourglass: () => (
    <>
      <path d='M9 5.6h14v3.2c0 3-2.6 5-4.6 7.2 2 2.2 4.6 4.2 4.6 7.2v3.2H9v-3.2c0-3 2.6-5 4.6-7.2C11.6 13.8 9 11.8 9 8.8z' fill={PAGE} {...outline} />
      <path d='M11.4 9.6h9.2c-.6 2-2.8 3.4-4.6 5.2-1.8-1.8-4-3.2-4.6-5.2z' fill={GOLD} />
      <path d='M11.2 25.4c.8-2.6 2.8-3.8 4.8-3.8s4 1.2 4.8 3.8z' fill={GOLD} />
      <path d='M16 15.6v5.2' stroke={GOLD_DEEP} strokeWidth='1.1' strokeLinecap='round' />
      <rect x='7.4' y='3.8' width='17.2' height='2.8' rx='1.2' fill={CLAY} {...outline} />
      <rect x='7.4' y='25.4' width='17.2' height='2.8' rx='1.2' fill={CLAY} {...outline} />
    </>
  ),
  // A woven market basket (kikapu) with goods: buying and selling.
  basket: () => (
    <>
      <path d='M9.6 13.6c0-5.4 2.8-8.4 6.4-8.4s6.4 3 6.4 8.4' {...line} strokeWidth='1.8' stroke={GOLD_DEEP} />
      <circle cx='12' cy='12.4' r='2.6' fill={CLAY} {...outline} />
      <circle cx='20.2' cy='12.4' r='2.6' fill={LEAF} {...outline} />
      <circle cx='16' cy='11.2' r='2.6' fill={GOLD} {...outline} />
      <path d='M4.4 13.6h23.2l-2.6 12.2c-.2 1-1 1.6-2 1.6H9c-1 0-1.8-.6-2-1.6z' fill={GOLD} {...outline} />
      <path d='M6 18.2h20M7 22.6h18M11.4 14v13M16 14v13.4M20.6 14v13' stroke={GOLD_DEEP} strokeWidth='1' strokeLinecap='round' />
    </>
  ),
  // A packed box: the stock.
  box: () => (
    <>
      <path d='M4.6 10.4L16 5.2l11.4 5.2v12.4L16 28 4.6 22.8z' fill={GOLD} {...outline} />
      <path d='M4.6 10.4L16 15.6l11.4-5.2M16 15.6V28' {...line} />
      <path d='M10.2 7.8l11.4 5.2v4.2' {...line} stroke={CLAY} strokeWidth='1.8' />
    </>
  ),
  // A till receipt with a torn edge.
  receipt: () => (
    <>
      <path d='M7.4 4.4h17.2v23.2l-2.9-2-2.9 2-2.8-2-2.9 2-2.8-2-2.9 2z' fill={PAGE} {...outline} />
      <path d='M10.8 9.6h10.4M10.8 13.4h10.4M10.8 17.2h5.6' stroke={SKY} strokeWidth='1.3' strokeLinecap='round' />
      <path d='M17.6 21h4' stroke={CLAY} strokeWidth='1.8' strokeLinecap='round' />
    </>
  ),
  // A small purse with a clasp: money for the person (Pochi).
  purse: () => (
    <>
      <path d='M10 11.6c0-3.8 2.4-6 6-6s6 2.2 6 6' {...line} strokeWidth='1.6' />
      <path d='M6.8 11.2h18.4c1.6 3.4 2.4 6.6 2.4 9.6 0 4.2-3.2 6.4-11.6 6.4S4.4 25 4.4 20.8c0-3 .8-6.2 2.4-9.6z' fill={CLAY} {...outline} />
      <path d='M6 13.8h20' {...line} />
      <circle cx='16' cy='13.8' r='2.2' fill={GOLD} {...outline} />
    </>
  ),
  // A closed padlock: kept safe.
  lock: () => (
    <>
      <path d='M10.4 14v-3.6c0-3.6 2.4-6 5.6-6s5.6 2.4 5.6 6V14' {...line} strokeWidth='2' />
      <rect x='6.4' y='13.6' width='19.2' height='14' rx='3' fill={GOLD} {...outline} />
      <circle cx='16' cy='19.4' r='2.2' fill={INK} />
      <path d='M16 20.4v3.4' stroke={INK} strokeWidth='1.8' strokeLinecap='round' />
    </>
  ),
  // Balanced scales: fair to every member.
  scales: () => (
    <>
      <path d='M16 5.6v20M9.6 27h12.8M6.4 9.2h19.2' {...line} strokeWidth='1.6' />
      <circle cx='16' cy='5.6' r='1.8' fill={GOLD} {...outline} />
      <path d='M6.4 9.2l-3.4 8M6.4 9.2l3.4 8M25.6 9.2l-3.4 8M25.6 9.2l3.4 8' {...line} />
      <path d='M2.4 17.2h8c0 2.4-1.8 4-4 4s-4-1.6-4-4z' fill={SKY} {...outline} />
      <path d='M21.6 17.2h8c0 2.4-1.8 4-4 4s-4-1.6-4-4z' fill={SKY} {...outline} />
    </>
  ),
  // A folder with papers in it.
  folder: () => (
    <>
      <path d='M8.4 7.4h13.2v8H8.4z' fill={PAGE} {...outline} />
      <path d='M3.6 9.6c0-1 .8-1.8 1.8-1.8h6l2.4 3h12.8c1 0 1.8.8 1.8 1.8v12c0 1-.8 1.8-1.8 1.8H5.4c-1 0-1.8-.8-1.8-1.8z' fill={GOLD} {...outline} />
      <path d='M3.6 14.4h24.8' {...line} />
    </>
  ),
  // An envelope: a text message.
  envelope: () => (
    <>
      <rect x='3.8' y='7.4' width='24.4' height='17.2' rx='2.4' fill={PAGE} {...outline} />
      <path d='M4.4 8.8L16 17.6l11.6-8.8' {...line} stroke={SKY} strokeWidth='1.6' />
    </>
  ),
  // Two chain links: copy the link.
  link: () => (
    <>
      <path d='M13.8 18.2a4.6 4.6 0 0 0 6.5 0l4.2-4.2a4.6 4.6 0 0 0-6.5-6.5l-1.6 1.6' {...line} stroke={SKY} strokeWidth='2.6' />
      <path d='M18.2 13.8a4.6 4.6 0 0 0-6.5 0l-4.2 4.2a4.6 4.6 0 0 0 6.5 6.5l1.6-1.6' {...line} stroke={FOREST} strokeWidth='2.6' />
    </>
  ),
  // A clipboard: the group's charter and rules.
  clipboard: () => (
    <>
      <rect x='6.4' y='6' width='19.2' height='21.6' rx='2.6' fill={GOLD} {...outline} />
      <rect x='8.8' y='9' width='14.4' height='16.2' rx='1' fill={PAGE} {...outline} />
      <rect x='11.6' y='3.8' width='8.8' height='4.4' rx='1.6' fill={FOREST} {...outline} />
      <path d='M11.4 13.4h9.2M11.4 17h9.2M11.4 20.6h5.6' stroke={SKY} strokeWidth='1.3' strokeLinecap='round' />
    </>
  ),
  // A plain page with a folded corner: a document.
  page: () => (
    <>
      <path d='M7.4 4.4h12.2l5 5v18.2H7.4z' fill={PAGE} {...outline} />
      <path d='M19.6 4.4v5h5' {...line} />
      <path d='M10.8 14h10.4M10.8 17.8h10.4M10.8 21.6h6.4' stroke={SKY} strokeWidth='1.3' strokeLinecap='round' />
    </>
  ),
  // Bars of different heights: the month-end figures.
  chart: () => (
    <>
      <path d='M4.8 5v22.2h22.8' {...line} strokeWidth='1.6' />
      <rect x='8.4' y='17' width='4.4' height='8' rx='1' fill={SKY} {...outline} />
      <rect x='14.8' y='11.6' width='4.4' height='13.4' rx='1' fill={FOREST} {...outline} />
      <rect x='21.2' y='7' width='4.4' height='18' rx='1' fill={GOLD} {...outline} />
    </>
  ),
  // A line climbing with an arrow: growing, funding.
  growth: () => (
    <>
      <path d='M4.8 5v22.2h22.8' {...line} strokeWidth='1.6' />
      <path d='M8 22.4l5.6-6 4 3.4 7.6-9' {...line} stroke={LEAF} strokeWidth='2.4' />
      <path d='M20.4 9.6l5.6-.4-.4 5.6z' fill={LEAF} {...outline} />
      <circle cx='13.6' cy='16.4' r='1.5' fill={GOLD} {...outline} />
    </>
  ),
  // A banknote: cash at the meeting.
  cash: () => (
    <>
      <rect x='3.6' y='8.4' width='24.8' height='15.2' rx='2' fill={LEAF} {...outline} />
      <rect x='6.2' y='11' width='19.6' height='10' rx='1' fill='none' stroke={PAGE} strokeWidth='1' />
      <circle cx='16' cy='16' r='3.4' fill={PAGE} {...outline} />
      <circle cx='8.8' cy='16' r='1' fill={PAGE} />
      <circle cx='23.2' cy='16' r='1' fill={PAGE} />
    </>
  ),
  // A kiosk with an awning: the Till.
  shop: () => (
    <>
      <rect x='6' y='13.6' width='20' height='13.6' rx='1' fill={PAGE} {...outline} />
      <path d='M4 7.2h24l1.2 6c0 1.4-1.2 2.4-2.8 2.4s-2.8-1-2.8-2.4c0 1.4-1.2 2.4-2.8 2.4S18 14.6 18 13.2c0 1.4-1.2 2.4-2.8 2.4s-2.8-1-2.8-2.4c0 1.4-1.2 2.4-2.8 2.4s-2.8-1-2.8-2.4c0 1.4-.6 2.4-2 2.4S2.8 14.6 2.8 13.2z' fill={CLAY} {...outline} />
      <rect x='9' y='18.4' width='6' height='8.8' fill={SKY} {...outline} />
      <rect x='17.4' y='18.4' width='6' height='4.6' fill={GOLD} {...outline} />
    </>
  ),
  // A phone with a coin on the screen: M-Pesa to a phone.
  phone: () => (
    <>
      <rect x='9' y='3.2' width='14' height='25.6' rx='3' fill={INK} {...outline} />
      <rect x='10.8' y='6.2' width='10.4' height='17.4' rx='1' fill={PAGE} />
      <circle cx='16' cy='14.6' r='3.6' fill={LEAF} {...outline} />
      <path d='M14.4 14.8l1.2 1.2 2.2-2.4' stroke={PAGE} strokeWidth='1.3' strokeLinecap='round' strokeLinejoin='round' fill='none' />
      <circle cx='16' cy='26.2' r='.9' fill={PAGE} />
    </>
  ),
  // A pencil writing a line: written by hand for now.
  pencil: () => (
    <>
      <path d='M6 26l1.6-6L21.2 6.4l4.4 4.4L12 24.4z' fill={GOLD} {...outline} />
      <path d='M6 26l1.6-6 4.4 4.4z' fill={PAGE} {...outline} />
      <path d='M6 26l.7-2.6 1.9 1.9z' fill={INK} />
      <path d='M21.2 6.4l1.6-1.6c.8-.8 2-.8 2.8 0l1.6 1.6c.8.8.8 2 0 2.8l-1.6 1.6z' fill={CLAY} {...outline} />
      <path d='M15 27h11' stroke={SKY} strokeWidth='1.6' strokeLinecap='round' />
    </>
  )
} satisfies Record<string, () => ReactElement>;

export type PictureName = keyof typeof DRAWINGS;
export const PICTURE_NAMES = Object.keys(DRAWINGS) as PictureName[];

/** The emoji the shared data uses → our drawing. Variation selectors are ignored. */
const FOR_EMOJI: Record<string, PictureName> = {
  '👥': 'group', '💡': 'ideas', '📒': 'books', '💬': 'messages', '📣': 'share',
  '📝': 'note', '🗒': 'agenda', '🪪': 'badge', '💰': 'moneybag', '🤝': 'handshake', '🏦': 'bank',
  '👀': 'eye', '🏛': 'office', '📜': 'certificate', '🎙': 'mic', '🧭': 'compass', '⏳': 'hourglass',
  '🛒': 'basket', '📦': 'box', '🧾': 'receipt', '👛': 'purse', '🔒': 'lock', '⚖': 'scales', '📁': 'folder',
  '✉': 'envelope', '🔗': 'link', '📋': 'clipboard', '📄': 'page', '📊': 'chart', '📈': 'growth',
  '💵': 'cash', '🏪': 'shop', '📱': 'phone', '✍': 'pencil'
};

/** Pure: the drawing for an emoji from the shared data, or null when none is drawn yet. */
export function pictureFor(icon: string): PictureName | null {
  return FOR_EMOJI[icon.replace(/️/g, '')] ?? null;
}

export function Picture({ name, size = 30 }: { name: PictureName; size?: number }) {
  const Drawing = DRAWINGS[name];
  return (
    <svg width={size} height={size} viewBox='0 0 32 32' aria-hidden='true' focusable='false' className='stawi-pic'>
      <rect x='0.5' y='0.5' width='31' height='31' rx='10' fill={TILE} stroke='#e8dcc4' />
      <Drawing />
    </svg>
  );
}

/** A picture named by the shared data's emoji; falls back to the emoji itself if not drawn yet. */
export function Pic({ icon, size = 30 }: { icon: string; size?: number }) {
  const name = pictureFor(icon);
  return name ? <Picture name={name} size={size} /> : <>{icon}</>;
}
