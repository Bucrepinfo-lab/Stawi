/**
 * Trust in the money record (owner 26/11/26): "make it very difficult for
 * somebody to edit the figure … people are going to have a lot of trust by how
 * we enter our data and how we safeguard it."
 *
 * 1. A recorded contribution is never edited or deleted.
 * 2. Cash at the meeting, or M-Pesa sent to an official's own phone, is
 *    recorded with TWO witnesses who saw it handed over (not the person
 *    recording, not the person paying). It counts at once, clearly marked
 *    "awaiting witnesses"; after 7 days unconfirmed it is flagged.
 * 3. Every member can confirm "yes, that's mine" or "that's wrong" on money
 *    recorded in their name.
 * 4. A correction is a NEW entry that counts only after five different people
 *    approve: Chairperson, Secretary, Treasurer, a neutral ordinary member
 *    picked at random by Stawi, and the member whose money it is. One "no"
 *    stops it; it expires after 14 days; a neutral who does not answer in 3
 *    days is replaced by another, again at random.
 * Pure rules only; the server enforces them on every write.
 */

export const WITNESS_WAYS = ['CASH', 'MPESA_PHONE'] as const;
export const WITNESSES_NEEDED = 2;
export const WITNESS_OVERDUE_DAYS = 7;
export const CORRECTION_EXPIRY_DAYS = 14;
export const NEUTRAL_REPICK_DAYS = 3;
/** Fewest different people who must approve any correction. */
export const MIN_APPROVERS = 3;
const DAY_MS = 86_400_000;

export type OfficialRole = 'CHAIRMAN' | 'SECRETARY' | 'TREASURER';
export type ApprovalSlot = 'CHAIR' | 'SECRETARY' | 'TREASURER' | 'NEUTRAL' | 'CONTRIBUTOR';

export interface TrustMember {
  id: string;
  role: string;
  /** False for a roster row whose person has not signed in yet. */
  canSignIn: boolean;
}

export function needsWitnesses(way: string | null | undefined): boolean {
  return (WITNESS_WAYS as readonly string[]).includes(String(way ?? '').toUpperCase());
}

/** Why a witness choice is refused, or null when it is fine. */
export function witnessProblem(input: {
  way: string;
  witnessIds: string[];
  recorderIds: string[];
  contributorId: string;
  memberIds: string[];
}): string | null {
  if (!needsWitnesses(input.way)) return null;
  const ids = input.witnessIds.filter(Boolean);
  if (ids.length < WITNESSES_NEEDED) return 'Choose two members who saw the money handed over.';
  if (new Set(ids).size !== ids.length) return 'Choose two different witnesses.';
  for (const id of ids) {
    if (!input.memberIds.includes(id)) return 'A witness must be a member of this group.';
    if (id === input.contributorId) return 'The member paying cannot be their own witness.';
    if (input.recorderIds.includes(id)) return 'The person recording cannot be a witness.';
  }
  return null;
}

export interface WitnessState {
  membershipId: string;
  confirmedAt?: Date | string | null;
  disputedAt?: Date | string | null;
}

export function witnessStatus(witnesses: WitnessState[], recordedAt: Date | string, now: Date) {
  const confirmed = witnesses.filter((w) => w.confirmedAt && !w.disputedAt).length;
  const disputed = witnesses.filter((w) => w.disputedAt).length;
  const age = now.getTime() - new Date(recordedAt).getTime();
  const complete = confirmed >= WITNESSES_NEEDED;
  return { confirmed, needed: WITNESSES_NEEDED, disputed, complete, overdue: !complete && age > WITNESS_OVERDUE_DAYS * DAY_MS };
}

export interface ApprovalSeat {
  slot: ApprovalSlot;
  membershipId: string;
}

/**
 * Who must approve a correction: each official once, the member whose money it
 * is, and neutral members picked at random. Everyone different. An official who
 * is also the member, or a missing official, is replaced by one more neutral,
 * so collusion always needs ordinary members too.
 */
export function correctionSeats(input: {
  members: TrustMember[];
  contributorId: string;
  random?: () => number;
}): { seats: ApprovalSeat[] } | { error: string } {
  const rand = input.random ?? Math.random;
  const seats: ApprovalSeat[] = [{ slot: 'CONTRIBUTOR', membershipId: input.contributorId }];
  const used = new Set([input.contributorId]);
  const official: [OfficialRole, ApprovalSlot][] = [['CHAIRMAN', 'CHAIR'], ['SECRETARY', 'SECRETARY'], ['TREASURER', 'TREASURER']];
  let neutralsNeeded = 1;
  for (const [role, slot] of official) {
    const holder = input.members.find((m) => m.role === role && m.canSignIn && !used.has(m.id));
    if (holder) {
      seats.push({ slot, membershipId: holder.id });
      used.add(holder.id);
    } else {
      neutralsNeeded += 1;
    }
  }
  const pool = input.members.filter((m) => m.role === 'MEMBER' && m.canSignIn && !used.has(m.id));
  const picked = pickRandom(pool.map((m) => m.id), neutralsNeeded, rand);
  for (const id of picked) seats.push({ slot: 'NEUTRAL', membershipId: id });
  if (seats.length < MIN_APPROVERS) {
    return { error: `A correction needs at least ${MIN_APPROVERS} different people who can sign in to approve it. Add more members first.` };
  }
  return { seats };
}

export function pickRandom<T>(items: T[], count: number, random: () => number = Math.random): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length) {
    const i = Math.min(pool.length - 1, Math.floor(random() * pool.length));
    out.push(pool.splice(i, 1)[0]!);
  }
  return out;
}

export interface Decision {
  membershipId: string;
  approve: boolean;
}

export type CorrectionState = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export function correctionOutcome(input: { seats: ApprovalSeat[]; decisions: Decision[]; createdAt: Date | string; now: Date }): CorrectionState {
  const bySeat = new Map(input.decisions.map((d) => [d.membershipId, d.approve]));
  if (input.seats.some((s) => bySeat.get(s.membershipId) === false)) return 'REJECTED';
  if (input.seats.every((s) => bySeat.get(s.membershipId) === true)) return 'APPROVED';
  const age = input.now.getTime() - new Date(input.createdAt).getTime();
  return age > CORRECTION_EXPIRY_DAYS * DAY_MS ? 'EXPIRED' : 'PENDING';
}

/** The seat this person may decide on, if any (one person, one decision). */
export function seatFor(myIds: string[], seats: ApprovalSeat[]): ApprovalSeat | null {
  return seats.find((s) => myIds.includes(s.membershipId)) ?? null;
}

/** A neutral who has not answered within 3 days is replaced. */
export function neutralIsStale(pickedAt: Date | string, decided: boolean, now: Date): boolean {
  return !decided && now.getTime() - new Date(pickedAt).getTime() > NEUTRAL_REPICK_DAYS * DAY_MS;
}

/** Why a correction cannot be raised, or null. */
export function correctionProblem(input: { originalCents: number; correctedCents: number; reason: string; hasOpenCorrection: boolean }): string | null {
  if (input.hasOpenCorrection) return 'A correction for this entry is already waiting for approval.';
  if (!Number.isInteger(input.correctedCents) || input.correctedCents < 0) return 'Enter the correct amount (0 to cancel the entry).';
  if (input.correctedCents === input.originalCents) return 'The correct amount is the same as the recorded one.';
  if (input.reason.trim().length < 10) return 'Write the reason in a sentence, so every member understands it.';
  return null;
}

export const SLOT_LABEL: Record<ApprovalSlot, string> = {
  CHAIR: 'Chairperson',
  SECRETARY: 'Secretary',
  TREASURER: 'Treasurer',
  NEUTRAL: 'Neutral member (picked at random)',
  CONTRIBUTOR: 'Member whose money it is',
};
