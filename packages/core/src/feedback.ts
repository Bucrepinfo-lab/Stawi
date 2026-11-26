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

/**
 * The check-before-you-record step (owner 26/11/26: "give them a chance to see
 * what they have typed before they proceed"). Every line the treasurer typed or
 * chose, read back in words, with the amount written large.
 */
export interface ContributionConfirm {
  title: string;
  amount: string;
  lines: { label: string; value: string }[];
  warning: string | null;
  yes: string;
  no: string;
}

export function contributionConfirm(input: {
  name: string;
  amountCents: number;
  way: string;
  reference?: string | null;
  witnesses?: string[];
  /** What this member has on record so far, to spot a slip like 50,000 for 5,000. */
  memberTotalCents?: number;
}): ContributionConfirm {
  const lines: { label: string; value: string }[] = [
    { label: 'Member', value: input.name.trim() || 'the member' },
    { label: 'How it was paid', value: input.way },
  ];
  if (input.reference?.trim()) lines.push({ label: 'Reference', value: input.reference.trim() });
  if (input.witnesses?.length) lines.push({ label: 'Witnesses', value: input.witnesses.join(' and ') });
  const big = input.memberTotalCents != null && input.memberTotalCents > 0 && input.amountCents >= input.memberTotalCents * 5;
  return {
    title: 'Record this contribution?',
    amount: `KES ${formatMoney(input.amountCents)}`,
    lines,
    warning: big
      ? `This is much more than the KES ${formatMoney(input.memberTotalCents!)} this member has on record so far. Check the zeros.`
      : null,
    yes: 'Yes, record it',
    no: 'Cancel',
  };
}

/** Before an M-Pesa payment request is sent to someone's phone. */
export function stkConfirm(input: { name: string; amountCents: number; phone: string }): ContributionConfirm {
  return {
    title: 'Send this M-Pesa request?',
    amount: `KES ${formatMoney(input.amountCents)}`,
    lines: [
      { label: 'Member', value: input.name.trim() || 'the member' },
      { label: 'Prompt goes to', value: input.phone.trim() },
    ],
    warning: null,
    yes: 'Yes, send it',
    no: 'Cancel',
  };
}
