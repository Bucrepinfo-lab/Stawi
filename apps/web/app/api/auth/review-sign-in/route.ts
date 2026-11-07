import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { isReviewLogin, reviewPhone } from '@stawi/core';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/review-sign-in { phone, code }
 *
 * Google Play reviewer access. Active only when BOTH PLAY_REVIEW_PHONE and
 * PLAY_REVIEW_CODE are set; then that single number may sign in with that fixed
 * code (no SMS). Everyone else gets a generic 404 and the normal OTP flow runs.
 * The reviewer's rights come only from their membership in the seeded demo
 * group (seed-demo.ts: treasurer of that one group); server-side role checks
 * apply unchanged.
 */

// Small in-memory throttle (per instance) against code guessing.
const attempts = new Map<string, { n: number; until: number }>();
function throttled(key: string): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.until < now) {
    attempts.set(key, { n: 1, until: now + 10 * 60_000 });
    return false;
  }
  a.n += 1;
  return a.n > 10;
}

const notFound = () => NextResponse.json({ error: 'not_found' }, { status: 404 });

export async function POST(req: Request) {
  const env = process.env;
  const phone = reviewPhone(env);
  if (!phone) return notFound(); // feature off

  let body: { phone?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return notFound();
  }
  const ip = req.headers.get('fly-client-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (throttled(ip)) return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 });
  if (!isReviewLogin(env, body.phone, body.code)) return notFound();

  const admin = createSupabaseAdminClient();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!admin || !serviceKey) return NextResponse.json({ error: 'review_access_not_configured' }, { status: 503 });

  // Deterministic, server-only password for this reviewer user; never shown anywhere.
  const password = crypto.createHmac('sha256', serviceKey).update(`stawi-play-review:${phone}:${env.PLAY_REVIEW_CODE}`).digest('hex');

  const created = await admin.auth.admin.createUser({ phone, password, phone_confirm: true });
  if (created.error) {
    // Already exists → find it and (re)set the derived password.
    const digits = phone.replace(/^\+/, '');
    let userId: string | undefined;
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error || !data?.users?.length) break;
      userId = data.users.find((u) => (u.phone ?? '').replace(/^\+/, '') === digits)?.id;
      if (data.users.length < 200) break;
    }
    if (!userId) return NextResponse.json({ error: 'review_user_unavailable' }, { status: 503 });
    const upd = await admin.auth.admin.updateUserById(userId, { password, phone_confirm: true });
    if (upd.error) return NextResponse.json({ error: 'review_user_unavailable' }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ phone, password });
  if (error) return NextResponse.json({ error: 'review_sign_in_failed' }, { status: 503 });
  return NextResponse.json({ ok: true });
}
