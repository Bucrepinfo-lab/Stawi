import { createBrowserClient } from '@supabase/ssr';

/** Supabase client for the phone → OTP sign-in/up screens. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
