/**
 * Server-only PIN + trusted-device helpers (owner standing rule 07/11/26).
 *
 * - PIN: 4 digits, bcrypt-hashed in AuthPin; 5 wrong tries lock it until a new
 *   SMS code is verified.
 * - Trusted device: httpOnly, Secure, long-lived cookie `<id>.<secret>.<hmac>`
 *   signed with AUTH_DEVICE_SECRET and bound to the user; the DB keeps only a
 *   SHA-256 of the secret, so it can be revoked ("sign out of all devices").
 * - A PIN sign-in opens a Supabase session with a server-held password derived
 *   from AUTH_DEVICE_SECRET + the user's session epoch; the user never sees it,
 *   and revoking all devices rotates it.
 *
 * Active only when DATABASE_URL, AUTH_DEVICE_SECRET and SUPABASE_SERVICE_ROLE_KEY
 * are all set; otherwise every sign-in simply uses an SMS code.
 */
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import {
  DEVICE_COOKIE,
  DEVICE_TOKEN_MAX_AGE_S,
  makeDeviceToken,
  parseDeviceToken,
  verifyDeviceToken,
  type DeviceCrypto,
} from '@stawi/core';

export function pinFeatureEnabled(): boolean {
  return !!(process.env.DATABASE_URL && process.env.AUTH_DEVICE_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function secret(): string {
  const s = process.env.AUTH_DEVICE_SECRET;
  if (!s) throw new Error('AUTH_DEVICE_SECRET is not set');
  return s;
}

export const deviceCrypto: DeviceCrypto = {
  hmac: (data) => crypto.createHmac('sha256', secret()).update(data).digest('hex'),
  sha256: (data) => crypto.createHash('sha256').update(data).digest('hex'),
};

/** The Supabase password the server uses for PIN sign-ins (never shown to anyone). */
export function sessionPassword(userId: string, epoch: number): string {
  return crypto.createHmac('sha256', secret()).update(`stawi-pin-session:${userId}:${epoch}`).digest('hex');
}

export async function hashPin(pin: string): Promise<string> {
  const bcrypt = (await import('bcryptjs')).default;
  return bcrypt.hash(pin, 10);
}

export async function checkPin(pin: string, hash: string): Promise<boolean> {
  const bcrypt = (await import('bcryptjs')).default;
  return bcrypt.compare(pin, hash);
}

/** Create a trusted-device row for this user and set its cookie. */
export async function trustThisDevice(userId: string, phone: string, userAgent: string | null): Promise<void> {
  const { prisma, createTrustedDevice, setTrustedDeviceHash } = await import('@stawi/db');
  const secretPart = crypto.randomBytes(32).toString('base64url');
  // Placeholder hash first (unique), then the real one — keeps the secret out of the DB.
  const row = await createTrustedDevice(prisma, { userId, tokenHash: `pending:${crypto.randomUUID()}`, phone, userAgent });
  await setTrustedDeviceHash(prisma, row.id, deviceCrypto.sha256(secretPart));
  const token = makeDeviceToken(row.id, secretPart, userId, deviceCrypto);
  (await cookies()).set(DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DEVICE_TOKEN_MAX_AGE_S,
  });
}

/** The trusted device presented by this browser, if genuine and not revoked. */
export async function currentDevice(): Promise<{ id: string; userId: string; phone: string } | null> {
  if (!pinFeatureEnabled()) return null;
  const raw = (await cookies()).get(DEVICE_COOKIE)?.value;
  const parsed = parseDeviceToken(raw);
  if (!parsed) return null;
  const { prisma, findTrustedDevice } = await import('@stawi/db');
  const row = await findTrustedDevice(prisma, parsed.deviceId);
  const userId = verifyDeviceToken(raw, row, deviceCrypto);
  if (!userId || !row) return null;
  return { id: row.id, userId, phone: row.phone };
}

export async function clearDeviceCookie(): Promise<void> {
  (await cookies()).delete(DEVICE_COOKIE);
}

// ── Fresh-SMS proof: PIN setup only right after a verified SMS code ──
const SMS_OK_COOKIE = 'stawi_sms_ok';
const SMS_OK_TTL_S = 15 * 60;

/** Called after a verified SMS code: short-lived, signed, httpOnly proof bound to the user. */
export async function markSmsVerified(userId: string): Promise<void> {
  if (!pinFeatureEnabled()) return;
  const exp = Math.floor(Date.now() / 1000) + SMS_OK_TTL_S;
  const value = `${exp}.${deviceCrypto.hmac(`sms-ok:${userId}:${exp}`)}`;
  (await cookies()).set(SMS_OK_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SMS_OK_TTL_S,
  });
}

/** Did this user verify an SMS code in this browser within the last 15 minutes? */
export async function smsVerifiedRecently(userId: string): Promise<boolean> {
  const raw = (await cookies()).get(SMS_OK_COOKIE)?.value ?? '';
  const [expS, sig] = raw.split('.');
  const exp = Number(expS);
  if (!exp || !sig || exp < Date.now() / 1000) return false;
  const expected = deviceCrypto.hmac(`sms-ok:${userId}:${exp}`);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig.padEnd(expected.length).slice(0, expected.length)));
}

export async function clearSmsVerified(): Promise<void> {
  (await cookies()).delete(SMS_OK_COOKIE);
}
