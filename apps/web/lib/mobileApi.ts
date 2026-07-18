/**
 * Shared helpers for the mobile JSON API (apps/web/app/api/mobile/*).
 *
 * The mobile app is phone-first and cross-origin, so these routes add permissive
 * CORS and an OPTIONAL shared-key gate. Set MOBILE_API_KEY in production and send
 * it as `x-stawi-mobile-key`; when unset (local/demo) the gate is open so the
 * Expo app works against a dev server immediately.
 *
 * NOTE: for production, put Clerk mobile session verification in front of writes.
 * The seed-mode responses let the app run with no database at all.
 */
import { NextResponse } from 'next/server';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-stawi-mobile-key',
};

export function ok(data: unknown) {
  return NextResponse.json(data, { headers: CORS });
}
export function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: CORS });
}
export function preflight() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Seed/demo responses are allowed ONLY outside production. In production a missing
 * DATABASE_URL is an error, never a silent fall-back to demo data.
 */
export function seedAllowed(): boolean {
  return process.env.NODE_ENV !== 'production';
}
export function dbRequired() {
  return bad('Database not configured', 503);
}

/**
 * Authorize a mobile request. Order of precedence:
 *  1. Clerk session token (Authorization: Bearer …) verified with CLERK_SECRET_KEY.
 *  2. Shared key (x-stawi-mobile-key === MOBILE_API_KEY).
 *  3. Open — only when neither is configured (local/demo).
 * Returns null when allowed, or a 401 response otherwise.
 */
export async function guard(req: Request): Promise<NextResponse | null> {
  const secret = process.env.CLERK_SECRET_KEY;
  const key = process.env.MOBILE_API_KEY;
  const authz = req.headers.get('authorization');
  const bearer = authz?.startsWith('Bearer ') ? authz.slice(7) : null;

  if (bearer && secret) {
    try {
      const { verifyToken } = await import('@clerk/backend');
      await verifyToken(bearer, { secretKey: secret });
      return null; // valid Clerk session
    } catch {
      return bad('Invalid session', 401);
    }
  }
  if (key) {
    const got = req.headers.get('x-stawi-mobile-key');
    return got === key ? null : bad('Unauthorized', 401);
  }
  return null; // demo/dev: no auth configured
}
