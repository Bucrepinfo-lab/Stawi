import { toE164 } from '@stawi/core';
import { createSupabaseServerClient } from './supabase/server';

/** The Supabase-authenticated user for this request, or null. */
export async function getSupabaseUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * The app's user identity (Supabase UUID). Stored in the `*clerkUserId` columns —
 * kept under that name to avoid a schema churn; it now holds a Supabase id. Null
 * when signed out.
 */
export async function getUserId(): Promise<string | null> {
  const user = await getSupabaseUser();
  return user?.id ?? null;
}

/** The signed-in user's E.164 phone (login + M-Pesa identity), or null. */
export async function getUserPhone(): Promise<string | null> {
  const user = await getSupabaseUser();
  return user?.phone ? toE164(user.phone) : null;
}
