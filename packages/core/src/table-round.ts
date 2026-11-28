/**
 * Table banking round (owner 28/11/26). Many groups do not invest: at each
 * meeting one member takes an agreed amount from the table and brings it back
 * at the next meeting with a small agreed profit, turn by turn until every
 * member has had a turn.
 *
 * Stawi is the group's RECORD BOOK for this, nothing more: the money is the
 * group's own, the amounts are the group's own rules, and Stawi never moves,
 * offers or arranges money. All amounts are whole cents.
 */

export interface RoundPlan {
  /** Amount each member takes on their turn, in cents. */
  amountCents: number;
  /** Agreed profit the member adds when bringing it back, in cents (0 is allowed). */
  profitCents: number;
  /** Days between turns (7 = weekly). The money comes back at the next turn. */
  everyDays: number;
  /** Day of the first turn, YYYY-MM-DD. */
  startsOn: string;
  /** Members in the order they take their turn. */
  memberIds: string[];
}

export interface RoundTurn {
  turn: number;
  membershipId: string;
  /** YYYY-MM-DD */
  givenOn: string;
  /** YYYY-MM-DD */
  returnOn: string;
  givenCents: number;
  returnCents: number;
}

export interface TurnRecord {
  givenAt?: Date | string | null;
  returnedAt?: Date | string | null;
  returnedCents?: number | null;
}

export type TurnState = 'coming' | 'due_out' | 'out' | 'late' | 'back';

export const ROUND_MAX_MEMBERS = 60;
const DAY = 86_400_000;
const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const dayOf = (d: Date | string) => (typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10));

/** A plain-language reason the plan cannot start, or null when it is fine. */
export function roundProblem(plan: RoundPlan): string | null {
  if (!Number.isInteger(plan.amountCents) || plan.amountCents <= 0) return 'Enter the amount each member takes.';
  if (!Number.isInteger(plan.profitCents) || plan.profitCents < 0) return 'The profit cannot be less than zero.';
  if (plan.profitCents > plan.amountCents) return 'The profit cannot be more than the amount taken.';
  if (!Number.isInteger(plan.everyDays) || plan.everyDays < 1 || plan.everyDays > 31) return 'Choose how often you meet: from every day to once a month.';
  if (!isDay(plan.startsOn)) return 'Choose the day of the first turn.';
  if (plan.memberIds.length < 2) return 'A round needs at least two members.';
  if (plan.memberIds.length > ROUND_MAX_MEMBERS) return `A round can have up to ${ROUND_MAX_MEMBERS} members.`;
  if (new Set(plan.memberIds).size !== plan.memberIds.length) return 'Each member has one turn in a round.';
  return null;
}

/** The roster: one turn per member, in order. */
export function buildRoster(plan: RoundPlan): RoundTurn[] {
  const problem = roundProblem(plan);
  if (problem) throw new Error(problem);
  return plan.memberIds.map((membershipId, i) => {
    const givenOn = addDays(plan.startsOn, i * plan.everyDays);
    return {
      turn: i + 1,
      membershipId,
      givenOn,
      returnOn: addDays(givenOn, plan.everyDays),
      givenCents: plan.amountCents,
      returnCents: plan.amountCents + plan.profitCents,
    };
  });
}

/** Where one turn stands today. */
export function turnState(turn: Pick<RoundTurn, 'givenOn' | 'returnOn'>, record: TurnRecord, today: Date | string): TurnState {
  const now = dayOf(today);
  if (record.returnedAt) return 'back';
  if (record.givenAt) return now > turn.returnOn ? 'late' : 'out';
  return now >= turn.givenOn ? 'due_out' : 'coming';
}

export const TURN_STATE_LABEL: Record<TurnState, string> = {
  coming: 'Coming up',
  due_out: 'To give today',
  out: 'Out with member',
  late: 'Late to return',
  back: 'Returned',
};

export interface RoundTotals {
  turns: number;
  turnsBack: number;
  /** Given out and not yet returned. */
  outCents: number;
  /** Profit actually brought back so far. */
  profitBackCents: number;
  /** Profit the whole round brings if every turn returns in full. */
  profitWhenDoneCents: number;
  late: number;
}

export function roundTotals(turns: (RoundTurn & TurnRecord)[], today: Date | string): RoundTotals {
  let turnsBack = 0;
  let outCents = 0;
  let profitBackCents = 0;
  let late = 0;
  for (const t of turns) {
    const state = turnState(t, t, today);
    if (state === 'back') {
      turnsBack += 1;
      profitBackCents += Math.max(0, (t.returnedCents ?? t.returnCents) - t.givenCents);
    } else if (state === 'out' || state === 'late') {
      outCents += t.givenCents;
      if (state === 'late') late += 1;
    }
  }
  return {
    turns: turns.length,
    turnsBack,
    outCents,
    profitBackCents,
    profitWhenDoneCents: turns.reduce((sum, t) => sum + (t.returnCents - t.givenCents), 0),
    late,
  };
}

/** Key under which a sent reminder is remembered, so nobody is reminded twice. */
export const roundReminderKey = (turnId: string) => `round_return:${turnId}`;

/**
 * Turns whose money is due back TOMORROW: given, not yet returned, return day
 * is the day after `today` (YYYY-MM-DD in the group's own time zone).
 */
export function roundRemindersDue<T extends Pick<RoundTurn, 'returnOn'> & TurnRecord>(turns: T[], today: string): T[] {
  const tomorrow = addDays(today.slice(0, 10), 1);
  return turns.filter((t) => Boolean(t.givenAt) && !t.returnedAt && t.returnOn.slice(0, 10) === tomorrow);
}

/** The reminder, in plain words. Record only: it asks nobody to pay Stawi anything. */
export function roundReminderText(input: { name: string; returnOn: string; givenCents: number; returnCents: number }): string {
  const d = input.returnOn;
  const day = `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(2, 4)}`;
  const kes = (c: number) => `KES ${(c / 100).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
  const profit = input.returnCents - input.givenCents;
  const made = profit > 0 ? ` (${kes(input.givenCents)} taken plus ${kes(profit)} profit)` : '';
  return `Table banking round reminder for ${input.name}: tomorrow, ${day}, ${kes(input.returnCents)} comes back to the table${made}. Treasurer: write it as returned in the round book when you receive it.`;
}

/** Who may write in the round book (server-enforced; the group's treasurer keeps the money). */
export function roundRecordProblem(input: { role: string | null; recorderIds: string[]; turnMembershipId: string }): string | null {
  const receivesIt = input.recorderIds.includes(input.turnMembershipId);
  if (input.role === 'TREASURER' && !receivesIt) return null;
  // The treasurer cannot record their own turn; the chairperson does that one.
  if (input.role === 'CHAIRMAN' && !receivesIt) return null;
  if (receivesIt) return 'This is your own turn, so another official records it.';
  return 'Only the treasurer or the chairperson writes in the round book.';
}
