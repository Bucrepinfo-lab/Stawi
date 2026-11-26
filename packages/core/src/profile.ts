import { pinProblem } from './pin-policy';
import { toE164 } from './phone';
import { formatMoney } from './capital';

/**
 * "My profile" (owner 26/11/26): one place where a member fixes what is theirs
 * — name, photo, phone number, PIN — and keeps their own records. Pure rules.
 */

/** Why a phone change cannot go ahead, or null. Returns the new number in E.164 when fine. */
export function phoneChange(current: string | null | undefined, typed: string): { ok: true; phone: string } | { ok: false; error: string } {
  const next = toE164(typed ?? '');
  if (!next) return { ok: false, error: 'Enter the new phone number, e.g. 0712 345 678.' };
  if (current && toE164(current) === next) return { ok: false, error: 'That is already your number.' };
  return { ok: true, phone: next };
}

export function pinChangeProblem(current: string, next: string, repeat: string): string | null {
  if (!/^\d{4}$/.test(current.trim())) return 'Enter your current 4-digit PIN.';
  const p = pinProblem(next);
  if (p) return p;
  if (next.trim() !== repeat.trim()) return 'The two new PINs do not match.';
  if (next.trim() === current.trim()) return 'Choose a PIN different from your current one.';
  return null;
}

/** Photos are shrunk on the phone before upload; the server refuses anything bigger. */
export const PROFILE_PHOTO_MAX_BYTES = 200 * 1024;

export function photoProblem(dataUrl: string): string | null {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl ?? '');
  if (!m) return 'Choose a photo (JPEG, PNG or WebP).';
  const bytes = Math.floor((m[2]!.length * 3) / 4);
  if (bytes > PROFILE_PHOTO_MAX_BYTES) return 'That photo is too large. Try another one.';
  return null;
}

export interface RecordRow {
  group: string;
  date: string; // dd/mm/yy
  amountCents: number;
  way: string;
  ref: string | null;
}

const quote = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const text = (v: string) => quote(/^[=+\-@]/.test(v) ? `'${v}` : v);

/** Everything a member can take away: who they are, their groups and every payment. */
export function myRecordsCsv(input: { name: string; phone: string | null; groups: { name: string; role: string }[]; rows: RecordRow[]; printed: string }): string {
  const total = input.rows.reduce((s, r) => s + r.amountCents, 0);
  const lines: string[][] = [
    ['Stawi — my records'],
    ['Name', text(input.name)],
    ['Phone', text(input.phone ?? '')],
    ['Printed', input.printed],
    [],
    ['My groups'],
    ['Group', 'Role'],
    ...input.groups.map((g) => [text(g.name), text(g.role)]),
    [],
    ['My contributions'],
    ['Group', 'Date', 'Amount (KES)', 'Way', 'Reference'],
    ...input.rows.map((r) => [text(r.group), r.date, quote(formatMoney(r.amountCents)), text(r.way), text(r.ref ?? '')]),
    [],
    ['Total', '', quote(formatMoney(total))],
  ];
  return lines.map((l) => l.join(',')).join('\r\n') + '\r\n';
}
