import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase admin client (service-role key). Never import from a
 * client component. Returns null when SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
