/**
 * Per-group, server-side role checks (least privilege).
 *
 * A person's authority is their Membership role in THAT group — not a global
 * flag. Matches the signed-in user by auth id, or by their verified phone for
 * roster rows not yet linked to a login.
 */
import { getUserId, getUserPhone } from '@/lib/auth';

export type GroupRole = 'CHAIRMAN' | 'SECRETARY' | 'TREASURER' | 'SIGNATORY' | 'MEMBER';

/** Officials who may edit records (charter, minutes, statements). */
export const RECORD_EDITOR_ROLES: ReadonlySet<GroupRole> = new Set(['CHAIRMAN', 'SECRETARY', 'TREASURER']);
/** Who may record or request money (contributions, M-Pesa STK): the treasurer. */
export const MONEY_ROLES: ReadonlySet<GroupRole> = new Set(['TREASURER']);

const last9 = (raw: string) => raw.replace(/\D/g, '').replace(/^0+/, '').slice(-9);

/** The signed-in (cookie session) caller's role in `groupId`, or null. */
export async function myGroupRole(groupId: string): Promise<GroupRole | null> {
  if (!process.env.DATABASE_URL || !groupId) return null;
  const userId = await getUserId();
  if (!userId) return null;
  const phone = await getUserPhone().catch(() => null);
  return groupRoleFor(groupId, { userId, phone });
}

/** Role of a verified identity (user id + verified phone) in `groupId`, or null. */
export async function groupRoleFor(groupId: string, who: { userId: string; phone: string | null }): Promise<GroupRole | null> {
  if (!process.env.DATABASE_URL || !groupId) return null;
  const userId = who.userId;
  const key = who.phone ? last9(who.phone) : '';
  const { prisma } = await import('@stawi/db');
  const rows = await prisma.membership.findMany({
    where: {
      groupId,
      OR: [{ clerkUserId: userId }, ...(key.length === 9 ? [{ phone: { endsWith: key } }] : [])],
    },
    select: { role: true },
  });
  if (rows.length === 0) return null;
  // If matched more than once, take the most privileged.
  const order: GroupRole[] = ['CHAIRMAN', 'TREASURER', 'SECRETARY', 'SIGNATORY', 'MEMBER'];
  return order.find((r) => rows.some((x) => x.role === r)) ?? 'MEMBER';
}
