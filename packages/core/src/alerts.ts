import { formatMoney } from './capital';

/**
 * Phone alerts that keep a group's app alive (owner 26/11/26): "if there is a
 * message which has been sent, all the members with the app should receive the
 * alert", and "any contribution made, every member should be alerted".
 * Pure words and recipient rules; the server sends them (Web Push).
 */
export interface GroupAlert {
  title: string;
  body: string;
  /** Where a tap opens. Same-site path only. */
  url: string;
  /** Alerts with the same tag replace each other on the phone instead of piling up. */
  tag: string;
}

const clip = (s: string, n: number) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

export function contributionAlert(input: { groupId: string; groupName: string; memberName: string; amountCents: number; way: string; totalCents?: number | null }): GroupAlert {
  const total = input.totalCents != null ? ` Group total now KES ${formatMoney(input.totalCents)}.` : '';
  return {
    title: `New contribution · ${clip(input.groupName, 40)}`,
    body: `${clip(input.memberName, 40) || 'A member'} paid KES ${formatMoney(input.amountCents)} (${input.way.toLowerCase()}).${total}`,
    url: `/groups/${encodeURIComponent(input.groupId)}/money`,
    tag: `contrib-${input.groupId}`,
  };
}

export function correctionAlert(input: { groupId: string; groupName: string; memberName: string; fromCents: number; toCents: number }): GroupAlert {
  return {
    title: `Correction approved · ${clip(input.groupName, 40)}`,
    body: `${clip(input.memberName, 40)}: KES ${formatMoney(input.fromCents)} is now KES ${formatMoney(input.toCents)}, approved by five members. Both entries stay on record.`,
    url: `/groups/${encodeURIComponent(input.groupId)}/money`,
    tag: `corr-${input.groupId}`,
  };
}

export function messageAlert(input: { groupId: string; groupName: string; senderName: string; body: string; channel: 'ALL' | 'OFFICIALS' }): GroupAlert {
  if (input.channel === 'OFFICIALS') {
    // A private question to the officials: nothing of it on a lock screen.
    return {
      title: `Private message · ${clip(input.groupName, 40)}`,
      body: 'You have a new message between a member and the officials. Open Stawi to read it.',
      url: `/groups/${encodeURIComponent(input.groupId)}?tab=messages`,
      tag: `msg-off-${input.groupId}`,
    };
  }
  return {
    title: `${clip(input.senderName, 30) || 'A member'} · ${clip(input.groupName, 30)}`,
    body: clip(input.body, 140),
    url: `/groups/${encodeURIComponent(input.groupId)}?tab=messages`,
    tag: `msg-${input.groupId}`,
  };
}

export interface AlertMember {
  membershipId: string;
  userId: string | null;
  role: string;
}

const OFFICIAL_ROLES = new Set(['CHAIRMAN', 'SECRETARY', 'TREASURER']);

/**
 * Who gets an alert: every member who has the app (a user id), never the person
 * who did it. For a private officials' thread: the officials and that member only.
 */
export function alertUserIds(input: { members: AlertMember[]; exceptUserIds?: (string | null | undefined)[]; officialsThreadMemberId?: string | null }): string[] {
  const except = new Set((input.exceptUserIds ?? []).filter(Boolean) as string[]);
  const pool = input.officialsThreadMemberId !== undefined
    ? input.members.filter((m) => OFFICIAL_ROLES.has(m.role) || m.membershipId === input.officialsThreadMemberId)
    : input.members;
  return [...new Set(pool.map((m) => m.userId).filter((u): u is string => !!u && !except.has(u)))];
}
