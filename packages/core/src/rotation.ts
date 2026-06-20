/**
 * Merry-go-round (rotating savings) engine — Pillar 1.
 *
 * Each cycle, the pooled contributions are paid out to the next member in the
 * rotation order. This computes who receives when, and tracks cycle progress.
 */

export interface RotationMember {
  memberId: string;
  name: string;
  /** Position in the payout order, 0-indexed. */
  order: number;
}

export interface CycleSchedule {
  cycle: number; // 1-indexed
  recipientId: string;
  recipientName: string;
  isPast: boolean;
  isCurrent: boolean;
}

/**
 * Build the full payout schedule for one full round.
 * `currentCycle` is 1-indexed (cycle 1 = first payout).
 */
export function buildRotationSchedule(
  members: RotationMember[],
  currentCycle: number,
): CycleSchedule[] {
  const ordered = [...members].sort((a, b) => a.order - b.order);
  return ordered.map((m, i) => {
    const cycle = i + 1;
    return {
      cycle,
      recipientId: m.memberId,
      recipientName: m.name,
      isPast: cycle < currentCycle,
      isCurrent: cycle === currentCycle,
    };
  });
}

/**
 * Per-cycle payout = number of members × contribution per member.
 * Pool is contributed by everyone, paid to one recipient.
 */
export function cyclePayoutCents(
  memberCount: number,
  contributionPerMemberCents: number,
): number {
  return memberCount * contributionPerMemberCents;
}

/** Who receives the payout in a given (1-indexed) cycle. */
export function recipientForCycle(
  members: RotationMember[],
  cycle: number,
): RotationMember | null {
  const ordered = [...members].sort((a, b) => a.order - b.order);
  if (cycle < 1 || cycle > ordered.length) return null;
  return ordered[cycle - 1] ?? null;
}
