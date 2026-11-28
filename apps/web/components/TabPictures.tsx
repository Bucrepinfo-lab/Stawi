/**
 * Stawi's own drawn pictures for the main tabs (owner 24/11/26: our own
 * simple drawings, not emoji, with the words kept underneath). Emoji are drawn
 * differently by every phone maker and Android version (older phones show an
 * empty box) and are read differently by age and culture; these are the same
 * on every phone, work offline and use only the brand palette.
 *
 * Each picture sits on its own light tile with fixed colours, so it reads the
 * same in light and dark themes and inside the current-tab ring. Semi-abstract
 * and filled, in the hand-drawn spirit research found works best for people
 * who read little (Medhi et al., Microsoft Research India).
 */
export type TabPictureName = 'group' | 'business' | 'ideas' | 'books' | 'messages' | 'share' | 'me' | 'search';

export const INK = '#16261f';
export const FOREST = '#1f4d3a';
export const LEAF = '#2f855a';
export const GOLD = '#e0a32e';
export const GOLD_DEEP = '#b97e15';
export const CLAY = '#c5613c';
export const SKY = '#3c7d8c';
export const PAGE = '#fffdf8';
export const TILE = '#fbf3e2';

export const outline = { stroke: INK, strokeWidth: 1.1, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export function Group() {
  // Members seated around the group's pot (the chama kitty), a coin inside.
  return (
    <>
      <circle cx='16' cy='6.2' r='2.6' fill={GOLD} {...outline} />
      <path d='M11.8 13c0-2.7 1.9-4.3 4.2-4.3s4.2 1.6 4.2 4.3z' fill={GOLD} {...outline} />
      <circle cx='6.6' cy='13.6' r='2.5' fill={FOREST} {...outline} />
      <path d='M2.4 23.4c0-3.5 1.9-5.7 4.2-5.7s4.2 2.2 4.2 5.7z' fill={FOREST} {...outline} />
      <circle cx='25.4' cy='13.6' r='2.5' fill={SKY} {...outline} />
      <path d='M21.2 23.4c0-3.5 1.9-5.7 4.2-5.7s4.2 2.2 4.2 5.7z' fill={SKY} {...outline} />
      <path d='M11.2 23c0-2.6 2.1-4.1 4.8-4.1s4.8 1.5 4.8 4.1c0 2.7-2.1 4.5-4.8 4.5s-4.8-1.8-4.8-4.5z' fill={CLAY} {...outline} />
      <rect x='12.2' y='16.8' width='7.6' height='2.2' rx='1.1' fill={CLAY} {...outline} />
      <circle cx='16' cy='23.2' r='1.7' fill={GOLD} {...outline} />
    </>
  );
}

export function Business() {
  // A shop with its striped awning, an open door and a coin on the counter:
  // any business, from a duka to a salon (owner 28/11/26).
  return (
    <>
      <rect x='5.6' y='13.4' width='20.8' height='13.8' rx='1' fill={PAGE} {...outline} />
      <path d='M3.6 6.4h24.8l1.4 6.4c0 1.5-1.4 2.6-3.1 2.6s-3.1-1.1-3.1-2.6c0 1.5-1.4 2.6-3.1 2.6s-3.1-1.1-3.1-2.6c0 1.5-1.4 2.6-3.1 2.6s-3.1-1.1-3.1-2.6c0 1.5-1.4 2.6-3.1 2.6s-3.1-1.1-3.1-2.6z' fill={CLAY} {...outline} />
      <path d='M9.8 6.4l-.6 6.4M16 6.4v6.4M22.2 6.4l.6 6.4' stroke={PAGE} strokeWidth='1.3' strokeLinecap='round' />
      <rect x='8.4' y='18.2' width='6.2' height='9' fill={FOREST} {...outline} />
      <rect x='17' y='18.2' width='7' height='4.8' fill={SKY} {...outline} />
      <circle cx='20.5' cy='25' r='1.9' fill={GOLD} {...outline} />
    </>
  );
}

export function Ideas() {
  // A seedling growing out of a coin: a business that grows from savings.
  return (
    <>
      <ellipse cx='16' cy='24.4' rx='8' ry='3.2' fill={GOLD_DEEP} {...outline} />
      <ellipse cx='16' cy='23.2' rx='8' ry='3.2' fill={GOLD} {...outline} />
      <path d='M16 22.4V11.8' stroke={FOREST} strokeWidth='1.8' strokeLinecap='round' />
      <path d='M16 16.2c-5.2 0-7.4-3-7.4-6.6 4.4 0 7.4 2.4 7.4 6.6z' fill={LEAF} {...outline} />
      <path d='M16 13.4c0-5 3-7.6 7.6-7.6 0 4.4-2.6 7.6-7.6 7.6z' fill={FOREST} {...outline} />
    </>
  );
}

export function Books() {
  // An open exercise book with ruled lines, and a small stack of coins.
  return (
    <>
      <path d='M4 8.6c4.2-1.6 7.6-1.2 11.6 1.2v15.4c-4-2.2-7.4-2.6-11.6-1.2z' fill={PAGE} {...outline} />
      <path d='M27.6 8.6c-4.2-1.6-7.6-1.2-11.6 1.2v15.4c4-2.2 7.4-2.6 11.6-1.2z' fill={PAGE} {...outline} />
      <path d='M6.6 13c2.4-.6 4.4-.4 6.6.6M6.6 16.4c2.4-.6 4.4-.4 6.6.6M6.6 19.8c2.4-.6 4.4-.4 6.6.6' stroke={SKY} strokeWidth='1.2' strokeLinecap='round' />
      <path d='M18.6 13.6c2.2-1 4.2-1.2 6.6-.6M18.6 17c2.2-1 4.2-1.2 6.6-.6' stroke={SKY} strokeWidth='1.2' strokeLinecap='round' />
      <ellipse cx='23' cy='25.4' rx='4.2' ry='1.7' fill={GOLD_DEEP} {...outline} />
      <ellipse cx='23' cy='23.6' rx='4.2' ry='1.7' fill={GOLD} {...outline} />
      <ellipse cx='23' cy='21.8' rx='4.2' ry='1.7' fill={GOLD} {...outline} />
    </>
  );
}

export function Messages() {
  // A speech bubble, as people know it from WhatsApp, with three dots.
  return (
    <>
      <path d='M8.4 6.4h15.2a4.4 4.4 0 0 1 4.4 4.4v7.2a4.4 4.4 0 0 1-4.4 4.4h-9.4l-5.6 4.4v-4.4h-.2A4.4 4.4 0 0 1 4 18V10.8a4.4 4.4 0 0 1 4.4-4.4z' fill={FOREST} {...outline} />
      <circle cx='11' cy='14.4' r='1.7' fill={PAGE} />
      <circle cx='16' cy='14.4' r='1.7' fill={GOLD} />
      <circle cx='21' cy='14.4' r='1.7' fill={PAGE} />
    </>
  );
}

export function Share() {
  // A megaphone: tell others about Stawi.
  return (
    <>
      <path d='M9.4 19.6l1.6 6.2h3.4l-1.2-6.2z' fill={FOREST} {...outline} />
      <path d='M5 12.4h5.2L20.6 6.6v18.8l-10.4-5.8H5a1.4 1.4 0 0 1-1.4-1.4v-4.4A1.4 1.4 0 0 1 5 12.4z' fill={CLAY} {...outline} />
      <path d='M23.4 12.6a4.4 4.4 0 0 1 0 6.8' stroke={GOLD_DEEP} strokeWidth='1.8' strokeLinecap='round' fill='none' />
      <path d='M25.8 9.6a8.4 8.4 0 0 1 0 12.8' stroke={GOLD} strokeWidth='1.8' strokeLinecap='round' fill='none' />
    </>
  );
}

export function Me() {
  // One person with their own card: my name, my photo, my records (owner 26/11/26).
  return (
    <>
      <rect x='4.5' y='7' width='23' height='18' rx='3' fill={PAGE} {...outline} />
      <circle cx='12' cy='14' r='3.2' fill={GOLD} {...outline} />
      <path d='M6.8 22.6c0-3 2.3-4.7 5.2-4.7s5.2 1.7 5.2 4.7z' fill={FOREST} {...outline} />
      <path d='M19 13h5.4M19 16.4h5.4M19 19.8h3.6' stroke={SKY} strokeWidth='1.7' strokeLinecap='round' />
    </>
  );
}

export function Search() {
  // A magnifying glass over the group's book: find a name, a payment, a meeting.
  return (
    <>
      <path d='M6 6.5h11.5a2 2 0 0 1 2 2v17H8a2 2 0 0 1-2-2z' fill={PAGE} {...outline} />
      <path d='M9 11h7.5M9 14.2h5' stroke={SKY} strokeWidth='1.6' strokeLinecap='round' />
      <circle cx='19' cy='19' r='5' fill={GOLD} fillOpacity='0.35' stroke={FOREST} strokeWidth='2.2' />
      <path d='M22.6 22.6l4 4' stroke={FOREST} strokeWidth='2.6' strokeLinecap='round' />
    </>
  );
}

const DRAWINGS: Record<TabPictureName, () => JSX.Element> = { group: Group, business: Business, ideas: Ideas, books: Books, messages: Messages, share: Share, me: Me, search: Search };

export const TAB_PICTURE_NAMES = Object.keys(DRAWINGS) as TabPictureName[];

export function TabPicture({ name, size = 30 }: { name: TabPictureName; size?: number }) {
  const Drawing = DRAWINGS[name];
  return (
    <svg width={size} height={size} viewBox='0 0 32 32' aria-hidden='true' focusable='false' className='tab-pic'>
      <rect x='0.5' y='0.5' width='31' height='31' rx='10' fill={TILE} stroke='#e8dcc4' />
      <Drawing />
    </svg>
  );
}
