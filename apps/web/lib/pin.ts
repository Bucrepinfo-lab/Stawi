/**
 * Server-only sign-in helpers: phone + PIN, joining codes, trusted devices.
 *
 * Owner 20/11/26: no SMS is sent to sign in. Step 1 is the phone number,
 * step 2 the person's own 4-digit PIN, on any device. The first time (or after
 * a forgotten / locked PIN) a group official gives a one-time joining code.
 *
 * - PIN: 4 digits, bcrypt-hashed in AuthPin; 5 wrong tries lock it until a new
 *   joining code is redeemed.
 * - Trusted device: httpOnly, Secure, long-lived cookie `<id>.<secret>.<hmac>`
 *   signed with AUTH_DEVICE_SECRET and bound to the user; the DB keeps only a
 *   SHA-256 of the secret, so it can be revoked ("sign out of all devices").
 * - A PIN sign-in opens a Supabase session with a server-held password derived
 *   from AUTH_DEVICE_SECRET + the user's session epoch; the user never sees it,
 *   and revoking all devices rotates it.
 *
 * Active only when DATABASE_URL, AUTH_DEVICE_SECRET and SUPABASE_SERVICE_ROLE_KEY
 * are all set; otherwise sign-in is closed (demo mode runs without a login).
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

// ── Fresh proof: a PIN is set only right after a joining code (or a new account) ──
const SMS_OK_COOKIE = 'stawi_sms_ok';
const SMS_OK_TTL_S = 15 * 60;

/** Called after a redeemed joining code or a new account: short-lived, signed, httpOnly proof bound to the user. */
export async function markPinSetupAllowed(userId: string): Promise<void> {
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

/** Did this user redeem a joining code (or open their account) in this browser within the last 15 minutes? */
export async function pinSetupAllowed(userId: string): Promise<boolean> {
  const raw = (await cookies()).get(SMS_OK_COOKIE)?.value ?? '';
  const [expS, sig] = raw.split('.');
  const exp = Number(expS);
  if (!exp || !sig || exp < Date.now() / 1000) return false;
  const expected = deviceCrypto.hmac(`sms-ok:${userId}:${exp}`);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig.padEnd(expected.length).slice(0, expected.length)));
}

export async function clearPinSetupAllowed(): Promise<void> {
  (await cookies()).delete(SMS_OK_COOKIE);
}

// ── Accounts by phone (no SMS) ──

type AdminClient = NonNullable<ReturnType<typeof import('./supabase/admin').createSupabaseAdminClient>>;

async function admin(): Promise<AdminClient | null> {
  const { createSupabaseAdminClient } = await import('./supabase/admin');
  return createSupabaseAdminClient();
}

/** The Supabase user id that signs in with this E.164 phone, or null. */
export async function findUserIdByPhone(phone: string): Promise<string | null> {
  const { prisma, getAuthPinByPhone } = await import('@stawi/db');
  const pin = await getAuthPinByPhone(prisma, phone);
  if (pin) return pin.userId;
  // Accounts from before 20/11/26 have no phone on their PIN row: ask Supabase.
  const a = await admin();
  if (!a) return null;
  const digits = phone.replace(/^\+/, '');
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await a.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    const hit = data.users.find((u) => (u.phone ?? '').replace(/^\+/, '') === digits);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

/**
 * Make sure a Supabase login exists for this phone and that its server-held
 * password matches the PIN row's session epoch. `proved` records whether the
 * phone was proven by a joining code (true) or only typed by a founder (false).
 * Returns the user id.
 */
export async function ensurePhoneUser(phone: string, proved: boolean): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const a = await admin();
  if (!a) return { ok: false, error: 'Sign-in is not set up yet.' };
  const { prisma, getAuthPin } = await import('@stawi/db');
  let userId = await findUserIdByPhone(phone);
  if (!userId) {
    const created = await a.auth.admin.createUser({ phone, phone_confirm: true, app_metadata: { phone_proved: proved } });
    if (created.error || !created.data.user) return { ok: false, error: 'Could not open your account. Try again.' };
    userId = created.data.user.id;
  }
  const epoch = (await getAuthPin(prisma, userId))?.sessionEpoch ?? 0;
  const update: Parameters<AdminClient['auth']['admin']['updateUserById']>[1] = { password: sessionPassword(userId, epoch) };
  // A joining code proves the phone; never downgrade a proven phone.
  if (proved) update.app_metadata = { phone_proved: true };
  const upd = await a.auth.admin.updateUserById(userId, update);
  if (upd.error) return { ok: false, error: 'Could not open your account. Try again.' };
  return { ok: true, userId };
}

export interface OpenedSession {
  accessToken: string;
  refreshToken: string;
}

/**
 * Open the session for this user with the server-held password: browser
 * cookies, plus the tokens (only handed to the mobile app, which asks for them).
 */
export async function openSession(userId: string, phone: string): Promise<OpenedSession | null> {
  const { prisma, getAuthPin } = await import('@stawi/db');
  const epoch = (await getAuthPin(prisma, userId))?.sessionEpoch ?? 0;
  const { createSupabaseServerClient } = await import('./supabase/server');
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ phone, password: sessionPassword(userId, epoch) });
  if (error || !data.session) return null;
  return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
}
