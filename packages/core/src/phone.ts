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
