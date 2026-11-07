/**
 * 4-digit PIN + trusted-device rules (owner standing rule, 07/11/26) — pure.
 *
 * After a verified SMS sign-in the user sets a PIN; that device gets a signed,
 * revocable device token. Later sign-ins on that device use the PIN. Five wrong
 * PINs lock it: the next sign-in needs a new SMS code (which also lets the
 * user set a new PIN). Hashing and HMAC are injected so this stays runtime-free.
 */

export const PIN_LENGTH = 4;
export const PIN_MAX_ATTEMPTS = 5;
/** Trusted-device cookie lifetime. */
export const DEVICE_TOKEN_MAX_AGE_S = 365 * 24 * 60 * 60;
export const DEVICE_COOKIE = 'stawi_device';
export const PIN_SKIP_COOKIE = 'stawi_pin_skip';

/** Why a chosen PIN is not acceptable, or null when it is fine. */
export function pinProblem(pin: string | null | undefined): string | null {
  const p = (pin ?? '').trim();
  if (!/^\d{4}$/.test(p)) return 'Your PIN must be exactly 4 digits.';
  if (/^(\d)\1{3}$/.test(p)) return 'Choose a PIN that is not one digit repeated.';
  const d = p.split('').map(Number);
  const up = d.every((x, i) => i === 0 || x === d[i - 1]! + 1);
  const down = d.every((x, i) => i === 0 || x === d[i - 1]! - 1);
  if (up || down) return 'Choose a PIN that is not a simple sequence like 1234.';
  return null;
}

export interface PinState {
  failedCount: number;
  lockedAt: Date | null;
}

export function pinLocked(s: PinState): boolean {
  return s.lockedAt !== null || s.failedCount >= PIN_MAX_ATTEMPTS;
}

/** State after one PIN attempt. A correct PIN on an unlocked PIN clears the counter. */
export function afterPinAttempt(s: PinState, correct: boolean, now: Date): PinState & { attemptsLeft: number; locked: boolean } {
  if (pinLocked(s)) return { ...s, attemptsLeft: 0, locked: true };
  if (correct) return { failedCount: 0, lockedAt: null, attemptsLeft: PIN_MAX_ATTEMPTS, locked: false };
  const failedCount = s.failedCount + 1;
  const locked = failedCount >= PIN_MAX_ATTEMPTS;
  return { failedCount, lockedAt: locked ? now : null, attemptsLeft: Math.max(0, PIN_MAX_ATTEMPTS - failedCount), locked };
}

// ───────────────────────────── trusted-device token ─────────────────────────────

export interface DeviceRow {
  id: string;
  userId: string;
  tokenHash: string;
  revokedAt: Date | null;
}

export interface DeviceCrypto {
  /** HMAC-SHA256 (hex) with the server's AUTH_DEVICE_SECRET. */
  hmac: (data: string) => string;
  /** SHA-256 (hex). */
  sha256: (data: string) => string;
}

/** Cookie value: `<deviceId>.<random secret>.<hmac(deviceId.secret.userId)>`. */
export function makeDeviceToken(deviceId: string, secret: string, userId: string, c: DeviceCrypto): string {
  return `${deviceId}.${secret}.${c.hmac(`${deviceId}.${secret}.${userId}`)}`;
}

export function parseDeviceToken(raw: string | null | undefined): { deviceId: string; secret: string; sig: string } | null {
  const parts = (raw ?? '').split('.');
  if (parts.length !== 3 || parts.some((x) => !x || !/^[A-Za-z0-9_-]+$/.test(x))) return null;
  return { deviceId: parts[0]!, secret: parts[1]!, sig: parts[2]! };
}

function sameString(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/**
 * The user a device token belongs to, or null if it is malformed, tampered,
 * unknown, revoked or bound to someone else. `row` is the DB row for the
 * token's deviceId (null if none).
 */
export function verifyDeviceToken(raw: string | null | undefined, row: DeviceRow | null, c: DeviceCrypto): string | null {
  const t = parseDeviceToken(raw);
  if (!t || !row) return null;
  if (row.id !== t.deviceId || row.revokedAt) return null;
  if (!sameString(c.sha256(t.secret), row.tokenHash)) return null;
  if (!sameString(c.hmac(`${t.deviceId}.${t.secret}.${row.userId}`), t.sig)) return null;
  return row.userId;
}

/** "+254712345678" → "07•• ••• 678" for the PIN screen (never the full number). */
export function maskPhone(e164: string | null | undefined): string {
  const d = (e164 ?? '').replace(/\D/g, '');
  if (d.length < 6) return '••••';
  const local = d.startsWith('254') ? `0${d.slice(3)}` : d;
  return `${local.slice(0, 2)}•• ••• ${local.slice(-3)}`;
}
