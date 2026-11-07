/**
 * Duplicate-membership finder (owner, 07/11/26) — pure, read-only.
 *
 * Groups membership rows that describe the same person in the same group:
 * the same phone (tolerant 9-digit key) or the same linked login. Pending
 * placeholders ("pending:<key>") are matched by phone, not by user id. Used by
 * scripts/check-duplicate-memberships.ts; it never changes data.
 */
export interface MembershipRowLite {
  id: string;
  groupId: string;
  clerkUserId: string;
  phone: string | null;
}

export interface DuplicateSet {
  groupId: string;
  kind: 'phone' | 'user';
  /** Phone: last 3 digits only; user: a short prefix of the id (owner reports carry no full phones). */
  keyHint: string;
  membershipIds: string[];
}

const phoneKey = (raw: string) => (raw || '').replace(/\D/g, '').replace(/^0+/, '').slice(-9);

export function findDuplicateMemberships(rows: readonly MembershipRowLite[]): DuplicateSet[] {
  const buckets = new Map<string, { groupId: string; kind: 'phone' | 'user'; key: string; ids: string[] }>();
  const add = (kind: 'phone' | 'user', groupId: string, key: string, id: string) => {
    const k = `${kind}|${groupId}|${key}`;
    const b = buckets.get(k) ?? { groupId, kind, key, ids: [] };
    if (!b.ids.includes(id)) b.ids.push(id);
    buckets.set(k, b);
  };
  for (const r of rows) {
    const pk = phoneKey(r.phone ?? '');
    if (pk.length === 9) add('phone', r.groupId, pk, r.id);
    if (r.clerkUserId && !r.clerkUserId.startsWith('pending:')) add('user', r.groupId, r.clerkUserId, r.id);
  }
  return [...buckets.values()]
    .filter((b) => b.ids.length > 1)
    .map((b) => ({
      groupId: b.groupId,
      kind: b.kind,
      keyHint: b.kind === 'phone' ? `…${b.key.slice(-3)}` : `${b.key.slice(0, 6)}…`,
      membershipIds: [...b.ids].sort(),
    }))
    .sort((a, b) => a.groupId.localeCompare(b.groupId) || a.kind.localeCompare(b.kind) || a.keyHint.localeCompare(b.keyHint));
}
