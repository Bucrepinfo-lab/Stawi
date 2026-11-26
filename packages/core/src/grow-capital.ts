import { formatMoney } from './capital';

/**
 * "A minimum, not a maximum" (owner 26/11/26): when every member pays only the
 * agreed minimum, the group takes years to reach the capital for its business.
 * The minimum keeps everyone in; anyone who can should be free to put in more —
 * it raises their own share of the capital and brings the business closer.
 * Pure: the months-to-target sums and the words (English and Kiswahili).
 */
export interface PaceInput {
  totalCents: number; // saved so far
  targetCents: number; // capital the business needs
  members: number;
  minimumCents: number; // agreed minimum per member per meeting
  meetingsPerMonth: number;
}

/** Months to the target if everyone pays `perMemberCents` at every meeting; null if it never gets there. */
export function monthsToTarget(input: PaceInput, perMemberCents = input.minimumCents): number | null {
  const left = input.targetCents - input.totalCents;
  if (left <= 0) return 0;
  const perMonth = perMemberCents * input.members * input.meetingsPerMonth;
  if (perMonth <= 0) return null;
  return Math.ceil(left / perMonth);
}

/** Same target, but `extraMembers` of them add `extraCents` above the minimum each meeting. */
export function monthsWithExtra(input: PaceInput, extraMembers: number, extraCents: number): number | null {
  const left = input.targetCents - input.totalCents;
  if (left <= 0) return 0;
  const perMonth = (input.minimumCents * input.members + Math.max(0, Math.min(extraMembers, input.members)) * extraCents) * input.meetingsPerMonth;
  if (perMonth <= 0) return null;
  return Math.ceil(left / perMonth);
}

export function monthsLabel(m: number | null, lang: 'en' | 'sw' = 'en'): string {
  if (m === null) return lang === 'sw' ? 'haitafika' : 'never';
  if (m === 0) return lang === 'sw' ? 'tayari mmefika' : 'already reached';
  const y = Math.floor(m / 12);
  const r = m % 12;
  if (lang === 'sw') return [y ? `miaka ${y}` : '', r ? `miezi ${r}` : ''].filter(Boolean).join(' na ');
  return [y ? `${y} year${y === 1 ? '' : 's'}` : '', r ? `${r} month${r === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ');
}

export const MIN_NOT_MAX = {
  en: {
    title: 'A minimum, not a maximum',
    lead: 'The amount your group agreed is the least each member pays, so nobody is left out. It is not the most anyone may pay.',
    points: [
      'If everyone pays only the minimum, the group waits much longer for the capital its business needs.',
      'Every shilling you add above the minimum is yours: it raises your share of the group’s capital, and your share of the profit.',
      'Paying more shows you believe in the plan and trust the members you work with — and it brings the business closer for everyone.',
      'Nobody is pushed. Pay the minimum when times are hard and more when you can. Every member still has one vote.',
    ],
  },
  sw: {
    title: 'Kiwango cha chini, si cha juu',
    lead: 'Kiasi mlichokubaliana ni kidogo zaidi kila mwanachama analipa, ili hakuna anayeachwa nje. Sio kiwango cha juu ambacho mtu anaweza kulipa.',
    points: [
      'Kila mtu akilipa kiwango cha chini tu, kikundi kitachukua muda mrefu zaidi kupata mtaji wa biashara.',
      'Kila shilingi unayoongeza juu ya kiwango ni yako: inaongeza hisa yako katika mtaji wa kikundi na sehemu yako ya faida.',
      'Kulipa zaidi kunaonyesha unaamini mpango na wanachama wenzako — na kunaleta biashara karibu kwa wote.',
      'Hakuna anayelazimishwa. Lipa kiwango cha chini wakati mgumu, na zaidi unapoweza. Kila mwanachama bado ana kura moja.',
    ],
  },
} as const;

/** One line comparing the two paces, e.g. for a message to the group. */
export function paceLine(input: PaceInput, extraMembers: number, extraCents: number): string {
  const slow = monthsToTarget(input);
  const fast = monthsWithExtra(input, extraMembers, extraCents);
  return `With the minimum only: ${monthsLabel(slow)}. If ${extraMembers} member${extraMembers === 1 ? '' : 's'} add KES ${formatMoney(extraCents)} more each meeting: ${monthsLabel(fast)}.`;
}
