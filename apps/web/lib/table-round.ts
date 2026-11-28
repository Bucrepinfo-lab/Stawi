/**
 * Table banking round — loading the round book for a group (owner 28/11/26).
 * A record book only: Stawi never moves or offers money here.
 */
import { roundTotals, turnState, type RoundTotals, type TurnState } from '@stawi/core';

export interface RoundTurnView {
  id: string;
  turn: number;
  membershipId: string;
  name: string;
  givenOn: string;
  returnOn: string;
  givenCents: number;
  returnCents: number;
  givenAt: string | null;
  returnedAt: string | null;
  returnedCents: number | null;
  state: TurnState;
}

export interface RoundView {
  id: string;
  amountCents: number;
  profitCents: number;
  everyDays: number;
  startsOn: string;
  turns: RoundTurnView[];
  totals: RoundTotals;
}

const day = (d: Date) => d.toISOString().slice(0, 10);

export async function loadRound(groupId: string): Promise<{ round: RoundView | null; members: { id: string; name: string }[]; past: number }> {
  const { prisma } = await import('@stawi/db');
  const [open, members, past] = await Promise.all([
    prisma.tableRound.findFirst({ where: { groupId, closedAt: null }, orderBy: { createdAt: 'desc' }, include: { turns: { orderBy: { turn: 'asc' } } } }),
    prisma.membership.findMany({ where: { groupId }, orderBy: [{ rotationOrder: 'asc' }, { joinedAt: 'asc' }], select: { id: true, fullName: true } }),
    prisma.tableRound.count({ where: { groupId, closedAt: { not: null } } }),
  ]);
  const names = new Map(members.map((m) => [m.id, m.fullName]));
  const list = members.map((m) => ({ id: m.id, name: m.fullName }));
  if (!open) return { round: null, members: list, past };
  const now = new Date();
  const rows = open.turns.map((t) => ({
    turn: t.turn,
    membershipId: t.membershipId,
    givenOn: day(t.givenOn),
    returnOn: day(t.returnOn),
    givenCents: t.givenCents,
    returnCents: t.returnCents,
    givenAt: t.givenAt,
    returnedAt: t.returnedAt,
    returnedCents: t.returnedCents,
    id: t.id,
  }));
  return {
    members: list,
    past,
    round: {
      id: open.id,
      amountCents: open.amountCents,
      profitCents: open.profitCents,
      everyDays: open.everyDays,
      startsOn: day(open.startsOn),
      totals: roundTotals(rows, now),
      turns: rows.map((t) => ({
        id: t.id,
        turn: t.turn,
        membershipId: t.membershipId,
        name: names.get(t.membershipId) ?? 'A member',
        givenOn: t.givenOn,
        returnOn: t.returnOn,
        givenCents: t.givenCents,
        returnCents: t.returnCents,
        givenAt: t.givenAt ? t.givenAt.toISOString() : null,
        returnedAt: t.returnedAt ? t.returnedAt.toISOString() : null,
        returnedCents: t.returnedCents,
        state: turnState(t, t, now),
      })),
    },
  };
}
