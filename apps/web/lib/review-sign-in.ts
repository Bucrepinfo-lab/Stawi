import crypto from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Google Play reviewer sign-in (PLAY_REVIEW_PHONE + PLAY_REVIEW_CODE both set,
 * already checked by the caller). Provisions the reviewer's Supabase login with
 * the admin API and a server-derived password, then signs in (session cookies).
 */
export async function signInReviewer(phone: string): Promise<{ ok: true; userId?: string } | { ok: false; status: number; error: string }> {
  const admin = createSupabaseAdminClient();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!admin || !serviceKey) return { ok: false, status: 503, error: 'review_access_not_configured' };

  const password = crypto
    .createHmac('sha256', serviceKey)
    .update(`stawi-play-review:${phone}:${process.env.PLAY_REVIEW_CODE}`)
    .digest('hex');

  const created = await admin.auth.admin.createUser({ phone, password, phone_confirm: true });
  if (created.error) {
    const digits = phone.replace(/^\+/, '');
    let userId: string | undefined;
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error || !data?.users?.length) break;
      userId = data.users.find((u) => (u.phone ?? '').replace(/^\+/, '') === digits)?.id;
      if (data.users.length < 200) break;
    }
    if (!userId) return { ok: false, status: 503, error: 'review_user_unavailable' };
    const upd = await admin.auth.admin.updateUserById(userId, { password, phone_confirm: true });
    if (upd.error) return { ok: false, status: 503, error: 'review_user_unavailable' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ phone, password });
  if (error) return { ok: false, status: 503, error: 'review_sign_in_failed' };
  return { ok: true, userId: data.user?.id };
}
