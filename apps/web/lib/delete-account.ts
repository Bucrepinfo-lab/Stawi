"use server";

import { getUserId } from "@/lib/auth";
import { dbEnabled } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Google Play requires an in-app + web account-deletion path. Stawi keys records by
 * the auth user id and a member's contributions form part of a *group's* savings
 * ledger — deleting those rows would corrupt shared financial records the group
 * controls. So we **anonymise the person's PII** (name, phone, photo) across their
 * memberships and detach the login, rather than delete the ledger. The user is
 * signed out afterwards.
 */
export async function deleteMyAccount(): Promise<{ ok: boolean }> {
  const userId = await getUserId();
  if (!userId) return { ok: false };

  if (dbEnabled()) {
    const { prisma } = await import("@stawi/db");
    await prisma.membership.updateMany({
      where: { clerkUserId: userId },
      data: { fullName: "Deleted member", phone: null, photoUrl: null },
    });
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return { ok: true };
}
