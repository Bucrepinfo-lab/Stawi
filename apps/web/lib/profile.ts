/**
 * "My profile" (owner 26/11/26), server side. Everything here acts on the
 * signed-in person's own rows only: their login, and roster rows matched by
 * their PROVEN phone (the same rule as group access).
 */
import { getLoginPhone, getUserId, getUserPhone } from '@/lib/auth';

const last9 = (raw: string) => raw.replace(/\D/g, '').replace(/^0+/, '').slice(-9);

export async function me(): Promise<{ userId: string; loginPhone: string | null; provenPhone: string | null } | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const [loginPhone, provenPhone] = await Promise.all([getLoginPhone().catch(() => null), getUserPhone().catch(() => null)]);
  return { userId, loginPhone, provenPhone };
}

/** Where-clause for "my memberships, in every group". */
export function myMembershipsWhere(who: { userId: string; provenPhone: string | null }) {
  const key = who.provenPhone ? last9(who.provenPhone) : '';
  return { OR: [{ clerkUserId: who.userId }, ...(key.length === 9 ? [{ phone: { endsWith: key } }] : [])] };
}

export function photoLink(userId: string, version: string): string {
  return `/api/photo/${encodeURIComponent(userId)}?v=${version}`;
}

export async function loadProfile() {
  const who = await me();
  if (!who) return null;
  const { prisma } = await import('@stawi/db');
  const [memberships, pin, photo] = await Promise.all([
    prisma.membership.findMany({
      where: myMembershipsWhere(who),
      select: { id: true, fullName: true, role: true, phone: true, group: { select: { id: true, name: true } }, contributions: { where: { status: 'CONFIRMED' }, select: { amountCents: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.authPin.findUnique({ where: { userId: who.userId }, select: { phone: true } }),
    prisma.profilePhoto.findUnique({ where: { userId: who.userId }, select: { version: true } }),
  ]);
  const name = memberships.find((m) => m.fullName && m.fullName !== 'Group founder')?.fullName ?? memberships[0]?.fullName ?? '';
  return {
    userId: who.userId,
    name,
    phone: pin?.phone ?? who.loginPhone,
    photo: photo ? photoLink(who.userId, photo.version) : null,
    groups: memberships.map((m) => ({
      membershipId: m.id,
      groupId: m.group.id,
      groupName: m.group.name,
      role: m.role.charAt(0) + m.role.slice(1).toLowerCase(),
      nameHere: m.fullName,
      totalCents: m.contributions.reduce((s, c) => s + c.amountCents, 0),
      payments: m.contributions.length,
    })),
  };
}
