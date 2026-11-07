/**
 * Shared helpers for the mobile JSON API (apps/web/app/api/mobile/*).
 *
 * The mobile app is phone-first and cross-origin, so these routes add permissive
 * CORS. Every data route needs a verified Supabase session (see `authorize`)
 * and checks the caller's membership/role in the group. Seed-mode responses
 * (no database) exist only outside production.
 */
import { NextResponse } from 'next/server';
import { decideApiAccess, toE164, type VerifiedIdentity } from '@stawi/core';

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
 * Authorize a mobile request (owner rule 07/11/26: a typed phone number alone
 * never reaches account or group data).
 *  1. Supabase session token (Authorization: Bearer …) → verified with Supabase
 *     (auth.getUser), giving the caller's user id and verified phone.
 *  2. Otherwise: denied in production. A shared app key (MOBILE_API_KEY) is no
 *     longer enough on its own — it ships inside the app and is not a secret.
 *  3. Open only outside production when nothing is configured (seed demo).
 * Returns the identity (or null in dev-open mode), or a 401 response.
 */
export async function authorize(req: Request): Promise<{ identity: VerifiedIdentity | null } | NextResponse> {
  const authz = req.headers.get('authorization');
  const bearer = authz?.startsWith('Bearer ') ? authz.slice(7).trim() : null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let identity: VerifiedIdentity | null = null;
  if (bearer && url && anon) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await sb.auth.getUser(bearer);
      if (!error && data.user) identity = { userId: data.user.id, phone: data.user.phone ? toE164(data.user.phone) : null };
    } catch {
      identity = null;
    }
    if (!identity) return bad('Invalid session', 401);
  }

  const decision = decideApiAccess({
    production: process.env.NODE_ENV === 'production',
    identity,
    authConfigured: !!(url && anon) || !!process.env.MOBILE_API_KEY,
  });
  if (decision === 'deny') return bad('Sign in required', 401);
  return { identity };
}

/** Membership check for mobile routes: the caller's role in `groupId`, or a 403/401 response. */
export async function requireMobileGroupRole(
  identity: VerifiedIdentity | null,
  groupId: string,
  allowed: 'member' | 'records',
): Promise<NextResponse | null> {
  if (!identity) return null; // dev-open seed mode only (never production)
  const { groupRoleFor, RECORD_EDITOR_ROLES } = await import('@/lib/group-access');
  const role = await groupRoleFor(groupId, identity);
  if (!role) return bad('Not a member of this group', 403);
  if (allowed === 'records' && !RECORD_EDITOR_ROLES.has(role)) return bad('Only group officials can change records', 403);
  return null;
}
