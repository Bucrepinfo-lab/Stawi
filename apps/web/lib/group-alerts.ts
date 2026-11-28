/**
 * Who in a group gets an alert, and sending it (owner 26/11/26). Members are
 * reached by their login (clerkUserId), or — for a roster row whose person signs
 * in with phone + PIN — by the user id on their PIN. Never throws.
 */
import { alertUserIds, contributionAlert, correctionAlert, messageAlert, type AlertMember } from '@stawi/core';
import { sendAlert } from './push';

const last9 = (raw: string) => raw.replace(/\D/g, '').replace(/^0+/, '').slice(-9);

async function groupMembers(groupId: string): Promise<{ groupName: string; members: (AlertMember & { name: string })[] } | null> {
  const { prisma } = await import('@stawi/db');
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true, members: { where: { leftAt: null }, select: { id: true, clerkUserId: true, phone: true, role: true, fullName: true } } } });
  if (!group) return null;
  const keys = group.members.filter((m) => m.clerkUserId.startsWith('pending:') && m.phone).map((m) => last9(m.phone!)).filter((k) => k.length === 9);
  const pins = keys.length ? await prisma.authPin.findMany({ where: { OR: keys.map((k) => ({ phone: { endsWith: k } })) }, select: { userId: true, phone: true } }) : [];
  const byKey = new Map(pins.map((p) => [last9(p.phone ?? ''), p.userId]));
  return {
    groupName: group.name,
    members: group.members.map((m) => ({
      membershipId: m.id,
      role: m.role,
      name: m.fullName,
      userId: m.clerkUserId.startsWith('pending:') ? (m.phone ? byKey.get(last9(m.phone)) ?? null : null) : m.clerkUserId,
    })),
  };
}

export async function alertNewContribution(contributionId: string, actorUserId?: string | null): Promise<void> {
  try {
    if (!process.env.DATABASE_URL) return;
    const { prisma } = await import('@stawi/db');
    const c = await prisma.contribution.findUnique({ where: { id: contributionId }, select: { groupId: true, membershipId: true, amountCents: true, channel: true, status: true } });
    if (!c || c.status !== 'CONFIRMED') return;
    const g = await groupMembers(c.groupId);
    if (!g) return;
    const total = await prisma.contribution.aggregate({ where: { groupId: c.groupId, status: 'CONFIRMED' }, _sum: { amountCents: true } });
    const WAY: Record<string, string> = { CASH: 'Cash', MPESA_STK: 'M-Pesa', MPESA_C2B: 'M-Pesa', BANK: 'Bank', CARD: 'Card' };
    const alert = contributionAlert({
      groupId: c.groupId,
      groupName: g.groupName,
      memberName: g.members.find((m) => m.membershipId === c.membershipId)?.name ?? 'A member',
      amountCents: c.amountCents,
      way: WAY[c.channel] ?? 'Cash',
      totalCents: total._sum.amountCents ?? null,
    });
    await sendAlert(alertUserIds({ members: g.members, exceptUserIds: [actorUserId] }), alert);
  } catch (err) {
    console.error('[alerts] contribution', err instanceof Error ? err.message : err);
  }
}

export async function alertCorrectionApproved(input: { groupId: string; membershipId: string; fromCents: number; toCents: number }): Promise<void> {
  try {
    if (!process.env.DATABASE_URL) return;
    const g = await groupMembers(input.groupId);
    if (!g) return;
    const alert = correctionAlert({ groupId: input.groupId, groupName: g.groupName, memberName: g.members.find((m) => m.membershipId === input.membershipId)?.name ?? 'A member', fromCents: input.fromCents, toCents: input.toCents });
    await sendAlert(alertUserIds({ members: g.members }), alert);
  } catch (err) {
    console.error('[alerts] correction', err instanceof Error ? err.message : err);
  }
}

export async function alertNewMessage(input: { groupId: string; senderMembershipId: string; body: string; channel: 'ALL' | 'OFFICIALS'; threadMemberId: string | null }): Promise<void> {
  try {
    if (!process.env.DATABASE_URL) return;
    const g = await groupMembers(input.groupId);
    if (!g) return;
    const sender = g.members.find((m) => m.membershipId === input.senderMembershipId);
    const alert = messageAlert({ groupId: input.groupId, groupName: g.groupName, senderName: sender?.name ?? 'A member', body: input.body, channel: input.channel });
    const ids = alertUserIds({
      members: g.members,
      exceptUserIds: [sender?.userId],
      ...(input.channel === 'OFFICIALS' ? { officialsThreadMemberId: input.threadMemberId } : {}),
    });
    await sendAlert(ids, alert);
  } catch (err) {
    console.error('[alerts] message', err instanceof Error ? err.message : err);
  }
}

/** Phone alert to a business's owner and officials (owner 28/11/26: red lines, supplier replies). Never throws. */
export async function alertBusinessOfficials(groupId: string, alert: import('@stawi/core').GroupAlert): Promise<void> {
  try {
    if (!process.env.DATABASE_URL) return;
    const g = await groupMembers(groupId);
    if (!g) return;
    await sendAlert(alertUserIds({ members: g.members, officialsThreadMemberId: null }), alert);
  } catch (err) {
    console.error('[alerts] business', err instanceof Error ? err.message : err);
  }
}

/**
 * Phone alert to whoever signs in with this phone (last nine digits), e.g. a
 * supplier who uses Stawi and has been sent a restock request. Never throws.
 */
export async function alertByPhoneKey(key: string, alert: import('@stawi/core').GroupAlert): Promise<void> {
  try {
    if (!process.env.DATABASE_URL || key.length !== 9) return;
    const { prisma } = await import('@stawi/db');
    const [pins, rows] = await Promise.all([
      prisma.authPin.findMany({ where: { phone: { endsWith: key } }, select: { userId: true } }),
      prisma.membership.findMany({ where: { phone: { endsWith: key }, NOT: { clerkUserId: { startsWith: 'pending:' } } }, select: { clerkUserId: true } }),
    ]);
    const ids = [...new Set([...pins.map((p) => p.userId), ...rows.map((r) => r.clerkUserId)])];
    if (ids.length) await sendAlert(ids, alert);
  } catch (err) {
    console.error('[alerts] phone', err instanceof Error ? err.message : err);
  }
}

/** Alert every member who has not left (e.g. a vote opened or a choice confirmed). Never throws. */
export async function alertGroupMembers(groupId: string, alert: import('@stawi/core').GroupAlert, exceptUserId?: string | null): Promise<void> {
  try {
    if (!process.env.DATABASE_URL) return;
    const g = await groupMembers(groupId);
    if (!g) return;
    await sendAlert(alertUserIds({ members: g.members, exceptUserIds: [exceptUserId] }), alert);
  } catch (err) {
    console.error('[alerts] group', err instanceof Error ? err.message : err);
  }
}
