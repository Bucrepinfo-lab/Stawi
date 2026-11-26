/**
 * Server side of "trust in the money record" (owner 26/11/26). The rules live
 * in @stawi/core money-trust; this file loads and stores. Server-only.
 */
import {
  correctionOutcome,
  neutralIsStale,
  pickRandom,
  witnessStatus,
  type ApprovalSeat,
  type TrustMember,
} from '@stawi/core';

const last9 = (raw: string) => raw.replace(/\D/g, '').replace(/^0+/, '').slice(-9);

export interface StoredSeat extends ApprovalSeat {
  pickedAt: string;
}

export function readSeats(raw: unknown): StoredSeat[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is StoredSeat => !!s && typeof s === 'object' && typeof (s as StoredSeat).membershipId === 'string' && typeof (s as StoredSeat).slot === 'string');
}

/** Members of the group, marking who can actually sign in (a login, or a PIN on their phone). */
export async function trustMembers(groupId: string): Promise<(TrustMember & { name: string })[]> {
  const { prisma } = await import('@stawi/db');
  const rows = await prisma.membership.findMany({ where: { groupId }, select: { id: true, role: true, fullName: true, clerkUserId: true, phone: true }, orderBy: { rotationOrder: 'asc' } });
  const placeholderKeys = rows.filter((r) => r.clerkUserId.startsWith('pending:') && r.phone).map((r) => last9(r.phone!)).filter((k) => k.length === 9);
  const pins = placeholderKeys.length
    ? await prisma.authPin.findMany({ where: { OR: placeholderKeys.map((k) => ({ phone: { endsWith: k } })) }, select: { phone: true } })
    : [];
  const withPin = new Set(pins.map((p) => last9(p.phone ?? '')));
  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    name: r.fullName,
    canSignIn: !r.clerkUserId.startsWith('pending:') || (!!r.phone && withPin.has(last9(r.phone))),
  }));
}

/**
 * Brings open corrections up to date when anyone opens the money record:
 * expired after 14 days, and a neutral who has not answered in 3 days is
 * replaced by another ordinary member, picked at random.
 */
export async function refreshCorrections(groupId: string, now = new Date()): Promise<void> {
  const { prisma } = await import('@stawi/db');
  const open = await prisma.contributionCorrection.findMany({ where: { groupId, status: 'PENDING' }, include: { decisions: true } });
  if (open.length === 0) return;
  const members = await trustMembers(groupId);
  for (const c of open) {
    const seats = readSeats(c.seats);
    const state = correctionOutcome({ seats, decisions: c.decisions, createdAt: c.createdAt, now });
    if (state === 'EXPIRED') {
      await prisma.contributionCorrection.updateMany({ where: { id: c.id, status: 'PENDING' }, data: { status: 'EXPIRED', decidedAt: now } });
      continue;
    }
    const decided = new Set(c.decisions.map((d) => d.membershipId));
    let changed = false;
    const next = seats.map((s) => {
      if (s.slot !== 'NEUTRAL' || !neutralIsStale(s.pickedAt, decided.has(s.membershipId), now)) return s;
      const taken = new Set(seats.map((x) => x.membershipId));
      const pool = members.filter((m) => m.role === 'MEMBER' && m.canSignIn && !taken.has(m.id) && !decided.has(m.id)).map((m) => m.id);
      const [pick] = pickRandom(pool, 1);
      if (!pick) return s; // nobody else to ask: keep waiting
      changed = true;
      return { slot: s.slot, membershipId: pick, pickedAt: now.toISOString() };
    });
    if (changed) await prisma.contributionCorrection.update({ where: { id: c.id }, data: { seats: next as unknown as object } });
  }
}

/** Check the caller's own PIN before an approval (same lock rule as sign-in). */
export async function confirmMyPin(pin: string): Promise<string | null> {
  if (!/^\d{4}$/.test(pin.trim())) return 'Enter your 4-digit PIN.';
  const { getUserId, getUserPhone } = await import('@/lib/auth');
  const userId = await getUserId();
  if (!userId) return 'Please sign in again.';
  const { prisma, getAuthPin, savePinAttempt } = await import('@stawi/db');
  const { afterPinAttempt, pinLocked, isReviewPinLogin } = await import('@stawi/core');
  const row = await getAuthPin(prisma, userId);
  if (!row) {
    // The Google Play review account signs in with its configured PIN and has no stored PIN.
    const phone = await getUserPhone().catch(() => null);
    return isReviewPinLogin(process.env, phone, pin) ? null : 'Set your own PIN first (Settings), then approve.';
  }
  if (pinLocked(row)) return 'Too many wrong PINs. Ask your chairperson to clear your PIN.';
  const { checkPin } = await import('@/lib/pin');
  const correct = await checkPin(pin.trim(), row.pinHash);
  const next = afterPinAttempt(row, correct, new Date());
  await savePinAttempt(prisma, userId, next);
  if (correct) return null;
  return next.locked ? 'Too many wrong PINs. Ask your chairperson to clear your PIN.' : `That PIN is not right. ${next.attemptsLeft} ${next.attemptsLeft === 1 ? 'try' : 'tries'} left.`;
}

export interface MoneyEntry {
  id: string;
  memberId: string;
  memberName: string;
  amountCents: number;
  channel: string;
  ref: string | null;
  createdAt: string;
  isAdjustment: boolean;
  correctionOfId: string | null;
  witnesses: { membershipId: string; name: string; confirmed: boolean; disputed: boolean }[];
  witness: { confirmed: number; needed: number; complete: boolean; overdue: boolean; disputed: number } | null;
  check: 'MINE' | 'WRONG' | null;
  checkNote: string | null;
}

export interface MoneyCorrection {
  id: string;
  contributionId: string;
  memberName: string;
  originalCents: number;
  correctedCents: number;
  reason: string;
  requestedBy: string;
  status: string;
  createdAt: string;
  seats: { slot: string; membershipId: string; name: string; decision: boolean | null; note: string | null }[];
}

/** Everything the "Money record" page shows. Only members of the group call this. */
export async function loadMoneyRecord(groupId: string) {
  const { prisma } = await import('@stawi/db');
  await refreshCorrections(groupId);
  const members = await trustMembers(groupId);
  const name = new Map(members.map((m) => [m.id, m.name]));
  const now = new Date();
  const rows = await prisma.contribution.findMany({
    where: { groupId, status: 'CONFIRMED' },
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: { witnesses: true, check: true },
  });
  const entries: MoneyEntry[] = rows.map((r) => ({
    id: r.id,
    memberId: r.membershipId,
    memberName: name.get(r.membershipId) ?? 'Member',
    amountCents: r.amountCents,
    channel: r.channel,
    ref: r.mpesaRef,
    createdAt: r.createdAt.toISOString(),
    isAdjustment: !!r.correctionOfId,
    correctionOfId: r.correctionOfId,
    witnesses: r.witnesses.map((w) => ({ membershipId: w.membershipId, name: name.get(w.membershipId) ?? 'Member', confirmed: !!w.confirmedAt, disputed: !!w.disputedAt })),
    witness: r.witnesses.length ? witnessStatus(r.witnesses, r.createdAt, now) : null,
    check: r.check ? (r.check.verdict === 'WRONG' ? 'WRONG' : 'MINE') : null,
    checkNote: r.check?.note ?? null,
  }));
  const corr = await prisma.contributionCorrection.findMany({ where: { groupId }, orderBy: { createdAt: 'desc' }, take: 100, include: { decisions: true } });
  const corrections: MoneyCorrection[] = corr.map((c) => ({
    id: c.id,
    contributionId: c.contributionId,
    memberName: name.get(c.membershipId) ?? 'Member',
    originalCents: c.originalCents,
    correctedCents: c.correctedCents,
    reason: c.reason,
    requestedBy: name.get(c.requestedByMembershipId) ?? 'Member',
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    seats: readSeats(c.seats).map((s) => {
      const d = c.decisions.find((x) => x.membershipId === s.membershipId);
      return { slot: s.slot, membershipId: s.membershipId, name: name.get(s.membershipId) ?? 'Member', decision: d ? d.approve : null, note: d?.note ?? null };
    }),
  }));
  return { entries, corrections, members: members.map((m) => ({ id: m.id, name: m.name, role: m.role })) };
}

/**
 * What the money record asks of THIS member, for the card on the group page:
 * their own tasks, plus — after 7 days without both witnesses, or when a member
 * says an entry is wrong — an alert to the officials and to that member.
 */
export async function moneyAlerts(groupId: string, myIds: string[], isOfficial: boolean) {
  if (myIds.length === 0) return null;
  const { prisma } = await import('@stawi/db');
  await refreshCorrections(groupId);
  const now = new Date();
  const [witnessTasks, checkTasks, openCorr, witnessed, disputes] = await Promise.all([
    prisma.contributionWitness.count({ where: { groupId, membershipId: { in: myIds }, confirmedAt: null, disputedAt: null } }),
    prisma.contribution.count({ where: { groupId, status: 'CONFIRMED', correctionOfId: null, membershipId: { in: myIds }, check: { is: null } } }),
    prisma.contributionCorrection.findMany({ where: { groupId, status: 'PENDING' }, include: { decisions: { select: { membershipId: true } } } }),
    prisma.contribution.findMany({ where: { groupId, status: 'CONFIRMED', witnesses: { some: {} }, ...(isOfficial ? {} : { membershipId: { in: myIds } }) }, select: { createdAt: true, witnesses: true } }),
    isOfficial ? prisma.contributionCheck.count({ where: { groupId, verdict: 'WRONG', contribution: { corrections: { none: { status: { in: ['PENDING', 'APPROVED'] } } } } } }) : Promise.resolve(0),
  ]);
  const approvals = openCorr.filter((c) => readSeats(c.seats).some((s) => myIds.includes(s.membershipId) && !c.decisions.some((d) => d.membershipId === s.membershipId))).length;
  const overdueWitness = witnessed.filter((c) => witnessStatus(c.witnesses, c.createdAt, now).overdue || c.witnesses.some((w) => w.disputedAt)).length;
  return { approvals, witnessTasks, checkTasks, overdueWitness, disputes };
}

/**
 * One member's payment history in a group (owner 26/11/26). The caller decides
 * whose: their own, or — for an official — any member of the group.
 */
export async function loadMemberHistory(groupId: string, membershipIds: string[]) {
  const { prisma } = await import('@stawi/db');
  const { memberHistory } = await import('@stawi/core');
  const [group, members, rows] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
    prisma.membership.findMany({ where: { id: { in: membershipIds }, groupId }, select: { id: true, fullName: true, role: true } }),
    prisma.contribution.findMany({ where: { groupId, membershipId: { in: membershipIds }, status: 'CONFIRMED' }, include: { witnesses: true }, orderBy: { createdAt: 'asc' } }),
  ]);
  const history = memberHistory(rows.map((r) => ({
    id: r.id,
    at: r.createdAt.toISOString(),
    amountCents: r.amountCents,
    channel: r.channel,
    ref: r.mpesaRef,
    isCorrection: !!r.correctionOfId,
    witnessed: r.witnesses.length ? `${r.witnesses.filter((w) => w.confirmedAt && !w.disputedAt).length} of ${r.witnesses.length}` : null,
  })));
  return { groupName: group?.name ?? 'Group', memberName: members[0]?.fullName ?? 'Member', ...history };
}
