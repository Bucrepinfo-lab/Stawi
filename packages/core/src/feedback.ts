import { formatMoney } from './capital';

/**
 * Words for the banner the treasurer sees after recording a contribution
 * (owner 26/11/26: "the moment I add the contribution … a highlight message
 * that the contribution is updated"). Plain, specific, and the same on every
 * screen that records money.
 */
export interface ContributionFeedback {
  title: string;
  detail: string;
}

export function contributionRecorded(input: { name: string; amountCents: number; way: string; totalCents: number }): ContributionFeedback {
  const who = input.name.trim() || 'the member';
  return {
    title: 'Contribution recorded',
    detail: `KES ${formatMoney(input.amountCents)} from ${who}, ${input.way.toLowerCase()}. New group total KES ${formatMoney(input.totalCents)}; every member's share is updated.`,
  };
}

export function contributionNotRecorded(reason?: string | null): ContributionFeedback {
  return {
    title: 'Contribution not recorded',
    detail: reason?.trim() || 'Nothing was saved. Check your connection and try again.',
  };
}
