/**
 * The name a member shows in their group (owner 26/11/26: the founder appeared
 * as "Group founder" with no way to change it). Plain words only, 2–60
 * characters, at least two letters; spaces tidied.
 */
export const DISPLAY_NAME_MAX = 60;
export const PLACEHOLDER_NAMES = ['Group founder'] as const;

export function cleanDisplayName(raw: string | null | undefined): { ok: true; name: string } | { ok: false; error: string } {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (name.length < 2) return { ok: false, error: 'Write your name (at least 2 letters).' };
  if (name.length > DISPLAY_NAME_MAX) return { ok: false, error: `Keep your name under ${DISPLAY_NAME_MAX} characters.` };
  if ((name.match(/\p{L}/gu) ?? []).length < 2) return { ok: false, error: 'Use letters for your name.' };
  if (/[<>{}\[\]\\/@#$%^*=|~`]|https?:|www\./i.test(name)) return { ok: false, error: 'Use only your name — no links or symbols.' };
  return { ok: true, name };
}

export function isPlaceholderName(name: string | null | undefined): boolean {
  return (PLACEHOLDER_NAMES as readonly string[]).includes(String(name ?? '').trim());
}

/** A name to start a new group with: the person's name from another group, else the placeholder. */
export function founderName(knownNames: (string | null | undefined)[]): string {
  const real = knownNames.map((n) => String(n ?? '').trim()).find((n) => n && !isPlaceholderName(n) && cleanDisplayName(n).ok);
  return real ?? PLACEHOLDER_NAMES[0];
}
