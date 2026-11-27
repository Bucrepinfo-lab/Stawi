/**
 * Server side of "only the secretary writes the minutes" (owner 27/11/26).
 * Web actions and the mobile API share this, so both enforce one rule.
 */
import { canWriteMinutes, activeStandIn, MINUTES_ONLY_SECRETARY } from '@stawi/core';
import { dbEnabled } from './data';
import { groupRoleFor, myGroupRole, myMembershipIds, type GroupRole } from './group-access';

const last9 = (raw: string) => raw.replace(/\D/g, '').replace(/^0+/, '').slice(-9);

export interface MinutesAccess {
  allowed: boolean;
  role: GroupRole | null;
  myIds: string[];
  groupHasSecretary: boolean;
  /** The stand-in in force, if any. */
  standIn: { membershipId: string; name: string; until: string } | null;
}

async function facts(groupId: string, role: GroupRole | null, myIds: string[]): Promise<MinutesAccess> {
  const { prisma } = await import('@stawi/db');
  const now = new Date();
  const [secretaries, standIns] = await Promise.all([
    prisma.membership.count({ where: { groupId, role: 'SECRETARY' } }),
    prisma.minutesStandIn.findMany({ where: { groupId, endedAt: null, until: { gt: now } }, orderBy: { until: 'desc' }, take: 5 }),
  ]);
  const current = activeStandIn(standIns, now);
  const name = current
    ? (await prisma.membership.findFirst({ where: { id: current.membershipId, groupId }, select: { fullName: true } }))?.fullName ?? 'A member'
    : '';
  return {
    allowed: canWriteMinutes({ role, myMembershipIds: myIds, groupHasSecretary: secretaries > 0, standIns, now }),
    role,
    myIds,
    groupHasSecretary: secretaries > 0,
    standIn: current ? { membershipId: current.membershipId, name, until: new Date(current.until).toISOString() } : null,
  };
}

/** For the signed-in (cookie) caller. */
export async function minutesAccess(groupId: string): Promise<MinutesAccess> {
  if (!dbEnabled()) return { allowed: true, role: 'SECRETARY', myIds: [], groupHasSecretary: true, standIn: null };
  const [role, myIds] = await Promise.all([myGroupRole(groupId), myMembershipIds(groupId)]);
  return facts(groupId, role, myIds);
}

/** For a verified mobile identity. */
export async function minutesAccessFor(groupId: string, who: { userId: string; phone: string | null }): Promise<MinutesAccess> {
  const role = await groupRoleFor(groupId, who);
  const { prisma } = await import('@stawi/db');
  const key = who.phone ? last9(who.phone) : '';
  const rows = await prisma.membership.findMany({
    where: { groupId, OR: [{ clerkUserId: who.userId }, ...(key.length === 9 ? [{ phone: { endsWith: key } }] : [])] },
    select: { id: true },
  });
  return facts(groupId, role, rows.map((r) => r.id));
}

export const MINUTES_DENIED = MINUTES_ONLY_SECRETARY.en;
