"use server";

import { getUserId, getUserPhone } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  const phone = await getUserPhone().catch(() => null);
  const key = phone ? phone.replace(/\D/g, "").slice(-9) : "";

  if (dbEnabled()) {
    const { prisma } = await import("@stawi/db");
    const mine = {
      OR: [{ clerkUserId: userId }, ...(key.length === 9 ? [{ phone: { endsWith: key } }] : [])],
    };
    const groups = await prisma.membership.findMany({ where: mine, select: { groupId: true } });
    await prisma.membership.updateMany({
      where: mine,
      data: { fullName: "Deleted member", phone: null, photoUrl: null },
    });
    // The charter roster keeps its own copy (name, phone, ID number) — scrub it too.
    if (key.length === 9) {
      for (const groupId of new Set(groups.map((g) => g.groupId))) {
        const charter = await prisma.groupCharter.findUnique({ where: { groupId }, select: { members: true } });
        const roster = Array.isArray(charter?.members) ? (charter!.members as unknown as Record<string, unknown>[]) : null;
        if (!roster) continue;
        let changed = false;
        const next = roster.map((m) => {
          const p = typeof m?.phone === "string" ? m.phone.replace(/\D/g, "").slice(-9) : "";
          if (p !== key) return m;
          changed = true;
          return { ...m, fullName: "Deleted member", phone: "", idNumber: "" };
        });
        if (changed) await prisma.groupCharter.update({ where: { groupId }, data: { members: next as never } });
      }
    }
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  // Remove the login itself (needs SUPABASE_SERVICE_ROLE_KEY; otherwise the
  // account is signed out and anonymised, and support completes it on request).
  const admin = createSupabaseAdminClient();
  if (admin) await admin.auth.admin.deleteUser(userId).catch(() => undefined);
  return { ok: true };
}
