/**
 * Search (owner 26/11/26): find a member, a payment, a meeting, a message or
 * a part of the app by typing a few letters, in English or Kiswahili. Pure:
 * matching and the list of the app's own places.
 */
export function normalise(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Every word typed appears somewhere in the text (any order). */
export function matches(text: string | null | undefined, q: string): boolean {
  const t = normalise(text ?? '');
  const words = normalise(q).split(' ').filter(Boolean);
  return words.length > 0 && words.every((w) => t.includes(w));
}

/** A number typed as an amount ("5000", "5,000", "KES 5000") in cents, or null. */
export function amountQuery(q: string): number | null {
  const m = /^\s*(?:kes|ksh|sh)?\s*([\d,]+(?:\.\d{1,2})?)\s*$/i.exec(q);
  if (!m) return null;
  const n = Number(m[1]!.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

export interface AppPlace { title: string; href: string; words: string }

/** The app's own places, so people who do not know the menus can find them by name. */
export const APP_PLACES: AppPlace[] = [
  { title: 'Home: group capital and contributions', href: '/dashboard', words: 'home dashboard nyumbani capital contribution mchango record treasurer' },
  { title: 'Switch chama / join another chama', href: '/profile#join', words: 'switch chama group kikundi join code joining another badilisha' },
  { title: 'My profile: name, photo, phone, PIN', href: '/profile', words: 'me mimi profile name jina photo picha phone simu number pin password settings mipangilio' },
  { title: 'My language / Lugha yangu', href: '/profile', words: 'language lugha kiswahili swahili english' },
  { title: 'My payment history (download)', href: '/profile', words: 'history historia payments statement download malipo record' },
  { title: 'Download all my records', href: '/api/me/records', words: 'download records data export excel csv rekodi' },
  { title: 'Money record: witnesses, confirmations, corrections', href: '/dashboard', words: 'money pesa witness shahidi correction marekebisho dispute wrong confirm' },
  { title: 'Messages', href: '/messages', words: 'messages ujumbe chat officials notice tangazo' },
  { title: 'Business ideas (Business Matching)', href: '/match', words: 'ideas mawazo business biashara match invest venture' },
  { title: 'Write the funding proposal for me', href: '/proposal', words: 'proposal pendekezo loan mkopo funding bank sacco fund budget' },
  { title: 'Write it for me (from a photo or by speaking)', href: '/write', words: 'write andika letter barua notice complaint request photo ocr speak dictate' },
  { title: 'Books (business records)', href: '/books', words: 'books hesabu sales mauzo expenses matumizi stock' },
  { title: 'Register the group (formalize)', href: '/formalize', words: 'register sajili formalize registration certificate papers' },
  { title: 'Turn on alerts', href: '/dashboard', words: 'alerts arifa notifications notification push' },
  { title: 'Sign-in and devices', href: '/account/security', words: 'sign in login devices simu sign out logout' },
  { title: 'Delete my account', href: '/account/delete', words: 'delete account futa' },
];

export function searchPlaces(q: string, limit = 5): AppPlace[] {
  return APP_PLACES.filter((p) => matches(`${p.title} ${p.words}`, q)).slice(0, limit);
}
