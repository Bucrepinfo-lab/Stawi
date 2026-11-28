'use server';

/**
 * Table banking round — writing in the round book (owner 28/11/26).
 * Record only: nothing here moves money. The treasurer or the chairperson
 * writes; nobody records their own turn. Enforced here on the server.
 */
import { revalidatePath } from 'next/cache';
import { buildRoster, roundProblem, roundRecordProblem } from '@stawi/core';
import { dbEnabled } from '@/lib/data';
import { myGroupRole, myMembershipIds } from '@/lib/group-access';

type Result = { ok: boolean; error?: string };
const OFF = 'The round book opens when your group’s live records are connected.';
const toCents = (v: number) => Math.round(Number(v) * 100);

export async function startRoundAction(input: { groupId: string; amount: number; profit: number; everyDays: number; startsOn: string; memberIds: string[] }): Promise<Result> {
  if (!dbEnabled()) return { ok: false, error: OFF };
  const [role, myIds] = await Promise.all([myGroupRole(input.groupId), myMembershipIds(input.groupId)]);
  if (role !== 'TREASURER' && role !== 'CHAIRMAN') return { ok: false, error: 'Only the treasurer or the chairperson starts a round.' };
  const { prisma } = await import('@stawi/db');
  const members = await prisma.membership.findMany({ where: { groupId: input.groupId }, select: { id: true } });
  const real = new Set(members.map((m) => m.id));
  const memberIds = input.memberIds.filter((id) => real.has(id));
  const plan = { amountCents: toCents(input.amount), profitCents: toCents(input.profit), everyDays: Math.round(Number(input.everyDays)), startsOn: String(input.startsOn).slice(0, 10), memberIds };
  const problem = roundProblem(plan);
  if (problem) return { ok: false, error: problem };
  if (await prisma.tableRound.count({ where: { groupId: input.groupId, closedAt: null } })) return { ok: false, error: 'A round is already running. Finish it before starting another.' };
  const roster = buildRoster(plan);
  await prisma.tableRound.create({
    data: {
      groupId: input.groupId,
      amountCents: plan.amountCents,
      profitCents: plan.profitCents,
      everyDays: plan.everyDays,
      startsOn: new Date(`${plan.startsOn}T00:00:00Z`),
      createdByMembershipId: myIds[0] ?? 'unknown',
      turns: {
        create: roster.map((t) => ({
          groupId: input.groupId,
          turn: t.turn,
          membershipId: t.membershipId,
          givenOn: new Date(`${t.givenOn}T00:00:00Z`),
          returnOn: new Date(`${t.returnOn}T00:00:00Z`),
          givenCents: t.givenCents,
          returnCents: t.returnCents,
        })),
      },
    },
  });
  revalidatePath(`/groups/${input.groupId}/round`);
  return { ok: true };
}

async function turnFor(groupId: string, turnId: string) {
  const [role, myIds] = await Promise.all([myGroupRole(groupId), myMembershipIds(groupId)]);
  const { prisma } = await import('@stawi/db');
  const turn = await prisma.tableRoundTurn.findFirst({ where: { id: turnId, groupId, round: { closedAt: null } } });
  if (!turn) return { error: 'That turn is not in the open round.' as const };
  const problem = roundRecordProblem({ role, recorderIds: myIds, turnMembershipId: turn.membershipId });
  if (problem) return { error: problem };
  return { turn, me: myIds[0] ?? 'unknown', prisma };
}

/** Write that the member has been handed their amount. */
export async function markGivenAction(input: { groupId: string; turnId: string }): Promise<Result> {
  if (!dbEnabled()) return { ok: false, error: OFF };
  const got = await turnFor(input.groupId, input.turnId);
  if ('error' in got) return { ok: false, error: got.error };
  if (got.turn.givenAt) return { ok: false, error: 'This turn is already written as given.' };
  await got.prisma.tableRoundTurn.update({ where: { id: got.turn.id }, data: { givenAt: new Date(), givenByMembershipId: got.me } });
  revalidatePath(`/groups/${input.groupId}/round`);
  return { ok: true };
}

/** Write that the member has brought the money back (amount in shillings; blank = the agreed amount). */
export async function markReturnedAction(input: { groupId: string; turnId: string; amount?: number }): Promise<Result> {
  if (!dbEnabled()) return { ok: false, error: OFF };
  const got = await turnFor(input.groupId, input.turnId);
  if ('error' in got) return { ok: false, error: got.error };
  if (!got.turn.givenAt) return { ok: false, error: 'Write it as given first.' };
  if (got.turn.returnedAt) return { ok: false, error: 'This turn is already written as returned.' };
  const cents = input.amount === undefined ? got.turn.returnCents : toCents(input.amount);
  if (!Number.isInteger(cents) || cents <= 0 || cents > got.turn.returnCents * 3) return { ok: false, error: 'Check the amount brought back.' };
  await got.prisma.tableRoundTurn.update({ where: { id: got.turn.id }, data: { returnedAt: new Date(), returnedCents: cents, returnedByMembershipId: got.me } });
  revalidatePath(`/groups/${input.groupId}/round`);
  return { ok: true };
}

/** Close the round (kept in the record; a new one can then start). */
export async function closeRoundAction(input: { groupId: string }): Promise<Result> {
  if (!dbEnabled()) return { ok: false, error: OFF };
  const role = await myGroupRole(input.groupId);
  if (role !== 'TREASURER' && role !== 'CHAIRMAN') return { ok: false, error: 'Only the treasurer or the chairperson closes a round.' };
  const { prisma } = await import('@stawi/db');
  const out = await prisma.tableRoundTurn.count({ where: { groupId: input.groupId, round: { closedAt: null }, givenAt: { not: null }, returnedAt: null } });
  if (out > 0) return { ok: false, error: 'Money is still out with a member. Write it as returned before closing the round.' };
  await prisma.tableRound.updateMany({ where: { groupId: input.groupId, closedAt: null }, data: { closedAt: new Date() } });
  revalidatePath(`/groups/${input.groupId}/round`);
  return { ok: true };
}
