/**
 * Joining codes (owner 20/11/26) — pure rules.
 *
 * No SMS is sent to sign anyone in. The first time a member uses Stawi on a
 * phone or browser (or after a forgotten / locked PIN), a group official
 * gives them a 6-digit joining code face to face or on WhatsApp. The member
 * types their phone number and the code once, then chooses a 4-digit PIN.
 *
 * A code is tied to one group and one phone number, works once, expires
 * after 48 hours and is burned after 5 wrong tries. Only a keyed hash of the
 * code is stored. Hashing and randomness are injected so this stays
 * runtime-free.
 */

export const JOIN_CODE_LENGTH = 6;
export const JOIN_CODE_TTL_MS = 48 * 60 * 60_000;
export const JOIN_CODE_MAX_TRIES = 5;

/** A new code from 6 random digits (`randomInt(10)` is injected). Never 000000. */
export function newJoinCode(randomInt: (max: number) => number): string {
  for (;;) {
    let code = '';
    for (let i = 0; i < JOIN_CODE_LENGTH; i++) code += String(randomInt(10));
    if (!/^0+$/.test(code)) return code;
  }
}

/** Keeps the digits a person typed ("482 913" → "482913"). */
export function cleanJoinCode(raw: unknown): string {
  return String(raw ?? '').replace(/\D/g, '').slice(0, JOIN_CODE_LENGTH);
}

export function isJoinCodeShape(code: string): boolean {
  return new RegExp(`^\\d{${JOIN_CODE_LENGTH}}$`).test(code);
}

/** What the server signs: the code only means something for that group and phone. */
export function joinCodeMaterial(groupId: string, key: string, code: string): string {
  return `stawi-join:${groupId}:${key}:${code}`;
}

export interface JoinCodeRow {
  groupId: string;
  phoneKey: string;
  codeHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  tries: number;
}

/** Can this row still be used at `now`? */
export function joinCodeOpen(row: Pick<JoinCodeRow, 'expiresAt' | 'usedAt' | 'tries'>, now: Date): boolean {
  return !row.usedAt && row.tries < JOIN_CODE_MAX_TRIES && row.expiresAt.getTime() > now.getTime();
}

function sameString(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export type JoinCodeCheck =
  | { ok: true; groupId: string }
  | { ok: false; reason: 'none' | 'wrong'; burned: boolean };

/**
 * Check a typed code against the open codes for this phone. `rows` are the
 * phone's codes (any group). Returns the matching group, or which row took the
 * wrong try (the caller adds 1 to its `tries`).
 */
export function checkJoinCode(
  rows: (JoinCodeRow & { id: string })[],
  typed: string,
  now: Date,
  hmac: (data: string) => string,
): JoinCodeCheck & { rowId?: string } {
  const code = cleanJoinCode(typed);
  const open = rows.filter((r) => joinCodeOpen(r, now)).sort((a, b) => b.expiresAt.getTime() - a.expiresAt.getTime());
  if (open.length === 0) return { ok: false, reason: 'none', burned: false };
  if (isJoinCodeShape(code)) {
    for (const r of open) {
      if (sameString(hmac(joinCodeMaterial(r.groupId, r.phoneKey, code)), r.codeHash)) return { ok: true, groupId: r.groupId, rowId: r.id };
    }
  }
  const newest = open[0]!;
  return { ok: false, reason: 'wrong', burned: newest.tries + 1 >= JOIN_CODE_MAX_TRIES, rowId: newest.id };
}

/** The message an official sends the member (WhatsApp or by hand). No link to tap. */
export function joinCodeMessage(input: { name: string; groupName: string; code: string; site: string; lang?: 'en' | 'sw' }): string {
  const first = input.name.trim().split(/\s+/)[0] || '';
  if (input.lang === 'sw') {
    return `Habari ${first}. Karibu ${input.groupName} kwenye Stawi. Fungua ${input.site}, andika nambari yako ya simu na nambari hii ya kujiunga: ${input.code}. Inafanya kazi mara moja ndani ya saa 48. Kisha utachagua PIN yako ya tarakimu 4. Usimpe mtu mwingine nambari hii.`;
  }
  return `Hello ${first}. Welcome to ${input.groupName} on Stawi. Open ${input.site}, enter your phone number and this joining code: ${input.code}. It works once within 48 hours. Then choose your own 4-digit PIN. Do not share this code with anyone else.`;
}

/**
 * Is the phone on this sign-in proven to belong to the person? A phone is
 * proven when they redeemed a joining code (or, before 20/11/26, an SMS code).
 * A founder who opened their own account with a PIN has an unproven phone:
 * they reach their own groups by account, never someone else's roster by phone.
 */
export function phoneIsProven(meta: { phone_proved?: unknown } | null | undefined, phoneConfirmedAt: string | null | undefined): boolean {
  if (meta && typeof meta.phone_proved === 'boolean') return meta.phone_proved;
  return !!phoneConfirmedAt;
}
