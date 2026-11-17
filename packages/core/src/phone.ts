/**
 * Phone normalization to E.164 — PURE. The phone is Stawi's login identity AND its
 * M-Pesa identity: the SMS OTP and the STK push target the SAME E.164 number, and
 * a group's roster is keyed by it. Defaults to Kenya (+254).
 */
export interface NormalizePhoneOptions {
  defaultCountryCode?: string;
}

function cleanPhone(input: string): string {
  return input.trim().replace(/[\s()\-.]/g, '');
}

const E164_DIGITS = /^[1-9]\d{7,14}$/;

function e164OrNull(digits: string): string | null {
  return E164_DIGITS.test(digits) ? `+${digits}` : null;
}

export function toE164(input: string, options: NormalizePhoneOptions = {}): string | null {
  const cc = options.defaultCountryCode ?? '254';
  if (!input) return null;
  const s = cleanPhone(input);
  if (!s) return null;
  if (s.startsWith('+')) return e164OrNull(s.slice(1));
  if (s.startsWith('00')) return e164OrNull(s.slice(2));
  if (s.startsWith('0')) return e164OrNull(cc + s.slice(1));
  if (s.startsWith(cc)) return e164OrNull(s);
  return e164OrNull(cc + s);
}

export function isE164(input: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(input.trim());
}

/**
 * The recipient form Africa's Talking accepts: E.164 WITH the leading "+".
 * Supabase hands phones over as bare international digits ("2547…"), and
 * groups often type local numbers ("07…"); both must become "+2547…" or AT
 * rejects the message before sending (17/11/26: first live sign-in failed).
 * Bare digits that already carry a country code are kept as that country,
 * never re-prefixed with Kenya's. Returns null when it is not a phone number.
 */
export function toSmsRecipient(input: string): string | null {
  if (!input) return null;
  const s = cleanPhone(input);
  if (!s) return null;
  if (s.startsWith('+')) return e164OrNull(s.slice(1));
  if (s.startsWith('00')) return e164OrNull(s.slice(2));
  if (s.startsWith('0')) return toE164(s);
  if (/^\d{11,15}$/.test(s)) return e164OrNull(s);
  return toE164(s);
}
