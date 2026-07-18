/**
 * Capital-ratio engine — Pillar 1.
 *
 * When a treasurer records a contribution, every member's share of the group's
 * total capital is recomputed. This is the calculation that fans out live to
 * every member's dashboard.
 */

export interface MemberContribution {
  memberId: string;
  name: string;
  /** Total contributed by this member, in minor units (cents) to avoid float drift. */
  totalCents: number;
}

export interface MemberCapitalShare extends MemberContribution {
  /** Share of total group capital, 0–100, rounded to 2dp. */
  sharePct: number;
}

export interface CapitalSnapshot {
  totalCents: number;
  members: MemberCapitalShare[];
  /** Sum of all member sharePct, should be ~100 (used to verify rounding integrity). */
  sharePctSum: number;
}

/** Round to 2 decimal places without binary-float artefacts. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Compute each member's share of total group capital.
 * Pure and deterministic — safe to run on every payment event.
 */
export function computeCapitalShares(
  members: MemberContribution[],
): CapitalSnapshot {
  const totalCents = members.reduce((sum, m) => sum + Math.max(0, m.totalCents), 0);

  const shares: MemberCapitalShare[] = members.map((m) => ({
    ...m,
    sharePct:
      totalCents === 0 ? 0 : round2((Math.max(0, m.totalCents) / totalCents) * 100),
  }));

  return {
    totalCents,
    members: shares,
    sharePctSum: round2(shares.reduce((s, m) => s + m.sharePct, 0)),
  };
}

/**
 * Apply a new contribution to a member and return the updated snapshot.
 * Returns a NEW array (does not mutate input) so the caller can diff/animate.
 */
export function applyContribution(
  members: MemberContribution[],
  memberId: string,
  amountCents: number,
): CapitalSnapshot {
  if (amountCents <= 0) throw new Error('Contribution must be positive');
  const next = members.map((m) =>
    m.memberId === memberId ? { ...m, totalCents: m.totalCents + amountCents } : m,
  );
  if (!members.some((m) => m.memberId === memberId)) {
    throw new Error(`Unknown member: ${memberId}`);
  }
  return computeCapitalShares(next);
}

/** Format minor-unit cents as a display string, e.g. 4200000 -> "42,000.00". */
export function formatMoney(
  cents: number,
  opts: { decimals?: boolean } = {},
): string {
  const value = cents / 100;
  return value.toLocaleString('en-KE', {
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  });
}
