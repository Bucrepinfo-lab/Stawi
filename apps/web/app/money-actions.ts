'use server';

/**
 * Trust in the money record (owner 26/11/26). Every rule is enforced here, on
 * the server; the screens only mirror it.
 *  - A recorded contribution is never edited or deleted.
 *  - Witnesses confirm cash / M-Pesa-to-a-phone they saw handed over.
 *  - Each member confirms or disputes money recorded in their name.
 *  - A correction is a NEW entry that counts only after five different people
 *    (Chairperson, Secretary, Treasurer, a random neutral member, the member
 *    whose money it is) approve with their own PIN. One "no" stops it.
 */
import { dbEnabled } from '@/lib/data';
import { publishEvent } from '@/lib/events';

type Result = { ok: boolean; error?: string };

async function membershipContext(groupId: string) {
  if (!dbEnabled()) return { error: 'The money record needs the live database.' } as const;
  const { myMembershipIds } = await import('@/lib/group-access');
  const mine = await myMembershipIds(groupId);
  if (mine.length === 0) return { error: 'Only members of this group can do this.' } as const;
  const { prisma } = await import('@stawi/db');
  return { mine, prisma } as const;
}

async function cleanNote(note: string | undefined): Promise<string | null> {
  const text = (note ?? '').trim().slice(0, 400);
  if (!text) return null;
  const { assertClean } = await import('@stawi/core');
  assertClean(text);
  return text;
}

/** A witness says "I saw this money handed over" — or "I did not". Once only. */
export async function confirmWitnessAction(input: { groupId: string; contributionId: string; saw: boolean; note?: string }): Promise<Result> {
  const ctx = await membershipContext(input.groupId);
  if ('error' in ctx) return { ok: false, error: ctx.error };
  let note: string | null;
  try { note = await cleanNote(input.note); } catch { return { ok: false, error: 'Please keep the note respectful.' }; }
  const now = new Date();
  const done = await ctx.prisma.contributionWitness.updateMany({
    where: { groupId: input.groupId, contributionId: input.contributionId, membershipId: { in: ctx.mine }, confirmedAt: null, disputedAt: null },
    data: input.saw ? { confirmedAt: now, note } : { disputedAt: now, note },
  });
  if (done.count === 0) return { ok: false, error: 'You are not a witness for this entry, or you have already answered.' };
  publishEvent({ type: 'contribution', channel: 'public' });
  return { ok: true };
}

/** The member says "Yes, that's mine" or "That's wrong" about money in their name. */
export async function checkMyContributionAction(input: { groupId: string; contributionId: string; verdict: 'MINE' | 'WRONG'; note?: string }): Promise<Result> {
  const ctx = await membershipContext(input.groupId);
  if ('error' in ctx) return { ok: false, error: ctx.error };
  if (input.verdict !== 'MINE' && input.verdict !== 'WRONG') return { ok: false, error: 'Choose an answer.' };
  let note: string | null;
  try { note = await cleanNote(input.note); } catch { return { ok: false, error: 'Please keep the note respectful.' }; }
  if (input.verdict === 'WRONG' && !note) return { ok: false, error: 'Say what is wrong, so the officials can check it.' };
  const row = await ctx.prisma.contribution.findFirst({ where: { id: input.contributionId, groupId: input.groupId, membershipId: { in: ctx.mine } }, select: { id: true, membershipId: true } });
  if (!row) return { ok: false, error: 'You can only answer for money recorded in your own name.' };
  await ctx.prisma.contributionCheck.upsert({
    where: { contributionId: row.id },
    create: { groupId: input.groupId, contributionId: row.id, membershipId: row.membershipId, verdict: input.verdict, note },
    update: { verdict: input.verdict, note },
  });
  publishEvent({ type: 'contribution', channel: 'public' });
  return { ok: true };
}

/** Ask for a correction. Officials or the member whose money it is. Nothing changes until five approve. */
export async function requestCorrectionAction(input: { groupId: string; contributionId: string; correctedCents: number; reason: string; pin: string }): Promise<Result> {
  const ctx = await membershipContext(input.groupId);
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const { correctionProblem, correctionSeats, assertClean } = await import('@stawi/core');
  const { myGroupRole, RECORD_EDITOR_ROLES } = await import('@/lib/group-access');
  const { trustMembers, confirmMyPin } = await import('@/lib/money-trust');
  const entry = await ctx.prisma.contribution.findFirst({ where: { id: input.contributionId, groupId: input.groupId, status: 'CONFIRMED', correctionOfId: null } });
  if (!entry) return { ok: false, error: 'Entry not found. Corrections are made on the original entry.' };
  const role = await myGroupRole(input.groupId);
  const isOfficial = !!role && RECORD_EDITOR_ROLES.has(role);
  if (!isOfficial && !ctx.mine.includes(entry.membershipId)) return { ok: false, error: 'Only an official, or the member whose money it is, can ask for a correction.' };
  // What the entry counts for now: the original plus any approved corrections.
  const adjustments = await ctx.prisma.contribution.aggregate({ where: { groupId: input.groupId, correctionOfId: entry.id, status: 'CONFIRMED' }, _sum: { amountCents: true } });
  const currentCents = entry.amountCents + (adjustments._sum.amountCents ?? 0);
  const open = await ctx.prisma.contributionCorrection.count({ where: { contributionId: entry.id, status: 'PENDING' } });
  const problem = correctionProblem({ originalCents: currentCents, correctedCents: input.correctedCents, reason: input.reason, hasOpenCorrection: open > 0 });
  if (problem) return { ok: false, error: problem };
  try { assertClean(input.reason); } catch { return { ok: false, error: 'Please keep the reason respectful.' }; }
  const pinError = await confirmMyPin(input.pin);
  if (pinError) return { ok: false, error: pinError };
  const seated = correctionSeats({ members: await trustMembers(input.groupId), contributorId: entry.membershipId });
  if ('error' in seated) return { ok: false, error: seated.error };
  const now = new Date();
  const seats = seated.seats.map((s) => ({ ...s, pickedAt: now.toISOString() }));
  const requester = ctx.mine.find((id) => seats.some((s) => s.membershipId === id)) ?? ctx.mine[0]!;
  await ctx.prisma.$transaction(async (tx) => {
    const c = await tx.contributionCorrection.create({
      data: {
        groupId: input.groupId,
        contributionId: entry.id,
        membershipId: entry.membershipId,
        originalCents: currentCents,
        correctedCents: input.correctedCents,
        reason: input.reason.trim().slice(0, 600),
        requestedByMembershipId: requester,
        seats: seats as unknown as object,
      },
    });
    // Asking counts as the asker's own "yes", if they hold a seat.
    const own = seats.find((s) => s.membershipId === requester);
    if (own) await tx.correctionDecision.create({ data: { groupId: input.groupId, correctionId: c.id, membershipId: requester, slot: own.slot, approve: true } });
  });
  publishEvent({ type: 'contribution', channel: 'public' });
  return { ok: true };
}

/** Approve or reject a correction, with your own PIN. The fifth "yes" writes the new entry. */
export async function decideCorrectionAction(input: { groupId: string; correctionId: string; approve: boolean; note?: string; pin: string }): Promise<Result & { outcome?: string }> {
  const ctx = await membershipContext(input.groupId);
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const { seatFor, correctionOutcome } = await import('@stawi/core');
  const { readSeats, confirmMyPin, refreshCorrections } = await import('@/lib/money-trust');
  await refreshCorrections(input.groupId);
  const c = await ctx.prisma.contributionCorrection.findFirst({ where: { id: input.correctionId, groupId: input.groupId }, include: { decisions: true } });
  if (!c) return { ok: false, error: 'Correction not found.' };
  if (c.status !== 'PENDING') return { ok: false, error: `This correction is already ${c.status.toLowerCase()}.` };
  const seats = readSeats(c.seats);
  const mySeat = seatFor(ctx.mine, seats);
  if (!mySeat) return { ok: false, error: 'You are not one of the people asked to approve this correction.' };
  if (c.decisions.some((d) => d.membershipId === mySeat.membershipId)) return { ok: false, error: 'You have already answered.' };
  let note: string | null;
  try { note = await cleanNote(input.note); } catch { return { ok: false, error: 'Please keep the note respectful.' }; }
  if (!input.approve && !note) return { ok: false, error: 'Say why you are rejecting it, so everyone understands.' };
  const pinError = await confirmMyPin(input.pin);
  if (pinError) return { ok: false, error: pinError };
  const now = new Date();
  const outcome = await ctx.prisma.$transaction(async (tx) => {
    await tx.correctionDecision.create({ data: { groupId: input.groupId, correctionId: c.id, membershipId: mySeat.membershipId, slot: mySeat.slot, approve: input.approve, note } });
    const decisions = await tx.correctionDecision.findMany({ where: { correctionId: c.id } });
    const state = correctionOutcome({ seats, decisions, createdAt: c.createdAt, now });
    if (state === 'PENDING') return state;
    // Only one request can close it (guards a double tap or two people at once).
    const closed = await tx.contributionCorrection.updateMany({ where: { id: c.id, status: 'PENDING' }, data: { status: state, decidedAt: now } });
    if (closed.count === 1 && state === 'APPROVED') {
      const original = await tx.contribution.findUniqueOrThrow({ where: { id: c.contributionId } });
      const adj = await tx.contribution.create({
        data: {
          groupId: c.groupId,
          membershipId: c.membershipId,
          amountCents: c.correctedCents - c.originalCents,
          channel: original.channel,
          status: 'CONFIRMED',
          correctionOfId: original.id,
          recordedByClerkUserId: `correction:${c.id}`,
        },
        select: { id: true },
      });
      await tx.contributionCorrection.update({ where: { id: c.id }, data: { adjustmentId: adj.id } });
    }
    return state;
  });
  publishEvent({ type: 'contribution', channel: 'public' });
  return { ok: true, outcome };
}
