/**
 * Retention & Mobilization engine — the "Graduate-tab pattern", platform-wide.
 *
 * Analysis of the four pillars yields recurring MOMENTS where showing a party
 * their own progress converts into retention (they stay), mobilization (they
 * act) or referral (they recruit). Each moment is machine-detectable from
 * data the platform already holds, and carries ready channel copy — in-app,
 * SMS (≤160 chars), email subject, poster headline, newsletter blurb — so the
 * UI and every CRM campaign speak with one voice. Placeholders like {name},
 * {value}, {group} are filled at send time.
 */

export type MomentPillar = 1 | 2 | 3 | 4;
export type MomentGoal = 'RETAIN' | 'MOBILIZE' | 'REFER' | 'MONETIZE';
export type MomentAudience = 'MEMBER' | 'OFFICIAL' | 'GROUP';

export interface MomentSignals {
  // Pillar 1 — table banking
  savingStreakMonths: number;
  sharePct: number;
  sharePctPrev: number;
  nextPayoutDays: number | null;
  memberCount: number;
  /** Next membership milestone that matters (e.g. 50, or 500 for DT-SACCO). */
  memberTarget: number;
  // Pillar 2 — business matching
  newVenturesUnlocked: number;
  shortlistPendingVotes: number;
  // Pillar 3 — books
  booksStreakMonths: number;
  taxDueDays: number | null;
  deadStockCount: number;
  // Pillar 4 — SACCO+
  interestEarnedMonthCents: number;
  tierReadinessPct: number;
  nextTierName: string | null;
  nextTierRatePct: number | null;
  institutionReadinessDeltaPct: number;
  // Lifecycle
  trialDaysLeft: number | null;
}

export interface MomentCopy {
  /** In-app hook — short, second person. */
  hook: string;
  /** One-sentence body; placeholders {name} {group} {value}. */
  message: string;
  ctaLabel: string;
  ctaHref: string;
  smsText: string; // must fit 160 chars after fill
  emailSubject: string;
  posterHeadline: string;
  newsletterBlurb: string;
}

export interface Moment {
  id: string;
  pillar: MomentPillar;
  goal: MomentGoal;
  audience: MomentAudience;
  /** Higher = shown first. */
  priority: number;
  trigger: (s: MomentSignals) => boolean;
  /** Value formatter for the {value} placeholder. */
  value: (s: MomentSignals) => string;
  copy: MomentCopy;
}

export const MOMENTS: Moment[] = [
  {
    id: 'p1-streak',
    pillar: 1, goal: 'RETAIN', audience: 'MEMBER', priority: 70,
    trigger: (s) => s.savingStreakMonths >= 3 && s.savingStreakMonths % 3 === 0,
    value: (s) => `${s.savingStreakMonths} months`,
    copy: {
      hook: 'Your saving streak is alive: {value} unbroken.',
      message: '{name}, {value} of never missing — the system is watching, and your credit tier is too. Don’t break the chain.',
      ctaLabel: 'Keep the streak', ctaHref: '/dashboard',
      smsText: 'Stawi: {value} saving streak, {name}! Every month lifts your loan tier. Keep the chain: pay this week’s round.',
      emailSubject: '{value} unbroken — your streak is earning you a better rate',
      posterHeadline: 'Savers who never miss borrow at 0.75%.',
      newsletterBlurb: 'Streak spotlight: parties with 12-month streaks now borrow a full quarter-point cheaper. Consistency is currency.',
    },
  },
  {
    id: 'p1-share-up',
    pillar: 1, goal: 'RETAIN', audience: 'MEMBER', priority: 55,
    trigger: (s) => s.sharePct - s.sharePctPrev >= 1,
    value: (s) => `${(s.sharePct - s.sharePctPrev).toFixed(1)}%`,
    copy: {
      hook: 'Your share of the pot grew {value} this month.',
      message: 'Your capital ratio in {group} rose {value} — every member saw it update live.',
      ctaLabel: 'See my capital', ctaHref: '/dashboard',
      smsText: 'Stawi: your share of {group} grew {value} this month. Open the app to see your live capital ratio.',
      emailSubject: 'You own {value} more of {group} than last month',
      posterHeadline: 'Watch your share of the pot grow — live, on every phone.',
      newsletterBlurb: 'Members saved harder this month: average capital shares grew across the platform, updated live on every dashboard.',
    },
  },
  {
    id: 'p1-payout-soon',
    pillar: 1, goal: 'MOBILIZE', audience: 'MEMBER', priority: 90,
    trigger: (s) => s.nextPayoutDays !== null && s.nextPayoutDays <= 14,
    value: (s) => `${s.nextPayoutDays} days`,
    copy: {
      hook: 'Your merry-go-round payout lands in {value}.',
      message: '{name}, your turn is coming in {value}. A full round means a full payout — remind the group.',
      ctaLabel: 'View my cycle', ctaHref: '/dashboard',
      smsText: 'Stawi: your payout turn in {group} arrives in {value}. Full round = full payout. Nudge the group today.',
      emailSubject: 'Your payout is {value} away',
      posterHeadline: 'Everyone gets their turn. On time. In full. On record.',
      newsletterBlurb: 'Payout week: rotations completed on time hit a new high — the merry-go-round works when every seat is full.',
    },
  },
  {
    id: 'p1-member-drive',
    pillar: 1, goal: 'REFER', audience: 'GROUP', priority: 60,
    trigger: (s) => s.memberTarget - s.memberCount > 0 && s.memberTarget - s.memberCount <= 10,
    value: (s) => `${s.memberTarget - s.memberCount}`,
    copy: {
      hook: 'Only {value} members to your next milestone.',
      message: '{group} needs {value} more trusted savers to unlock the next stage. Every member you bring strengthens the licence case.',
      ctaLabel: 'Invite a saver', ctaHref: '/community',
      smsText: 'Stawi: {group} is {value} members from its next milestone. Bring one trusted saver this month.',
      emailSubject: '{value} members between {group} and the next stage',
      posterHeadline: 'Bring one saver. Move the whole group up.',
      newsletterBlurb: 'Recruitment radar: groups within 10 members of a milestone grew fastest — mobilized members are the best sales force.',
    },
  },
  {
    id: 'p2-ventures-unlocked',
    pillar: 2, goal: 'MOBILIZE', audience: 'GROUP', priority: 50,
    trigger: (s) => s.newVenturesUnlocked > 0,
    value: (s) => `${s.newVenturesUnlocked}`,
    copy: {
      hook: 'Your pot now funds {value} new business types.',
      message: 'Saving moved {group} into a new capital band — {value} fresh ventures fit your money now.',
      ctaLabel: 'See the ventures', ctaHref: '/match',
      smsText: 'Stawi: {group}’s savings unlocked {value} new business ideas in your capital band. Re-roll and shortlist 3.',
      emailSubject: 'New capital band reached — {value} ventures now fit your pot',
      posterHeadline: 'Your savings just qualified for a bigger business.',
      newsletterBlurb: 'Capital-band graduations: dozens of groups unlocked bigger venture bands this month — savings converting to enterprise.',
    },
  },
  {
    id: 'p2-vote-pending',
    pillar: 2, goal: 'MOBILIZE', audience: 'MEMBER', priority: 65,
    trigger: (s) => s.shortlistPendingVotes > 0,
    value: (s) => `${s.shortlistPendingVotes}`,
    copy: {
      hook: '{value} venture ideas are waiting for your vote.',
      message: 'The shortlist is set — {group} decides its next business democratically. Your vote is missing.',
      ctaLabel: 'Vote now', ctaHref: '/match',
      smsText: 'Stawi: {group} shortlisted {value} ventures. The group votes this week — have your say in the app.',
      emailSubject: 'Your group picks its business this week — vote',
      posterHeadline: 'The group decides. Every voice on record.',
      newsletterBlurb: 'Democracy in action: venture votes closed across the platform — businesses chosen by members, minuted by the system.',
    },
  },
  {
    id: 'p3-clean-books',
    pillar: 3, goal: 'RETAIN', audience: 'OFFICIAL', priority: 55,
    trigger: (s) => s.booksStreakMonths >= 3,
    value: (s) => `${s.booksStreakMonths} months`,
    copy: {
      hook: '{value} of audit-ready books. Zero conflicts.',
      message: '{group} has kept {value} of reconciled, publishable books — the transparency that ends treasurer disputes and unlocks the top credit tier.',
      ctaLabel: 'Publish the report', ctaHref: '/books',
      smsText: 'Stawi: {group} has {value} of clean, audit-ready books. Publish this month’s report to members in one tap.',
      emailSubject: '{value} of conflict-free books — publish the proof',
      posterHeadline: 'No more “where did the money go?” Ever.',
      newsletterBlurb: 'Transparency pays: groups with 6+ months of kept books qualify for Mkubwa — the cheapest money on the platform.',
    },
  },
  {
    id: 'p3-tax-due',
    pillar: 3, goal: 'MOBILIZE', audience: 'OFFICIAL', priority: 85,
    trigger: (s) => s.taxDueDays !== null && s.taxDueDays <= 7,
    value: (s) => `${s.taxDueDays} days`,
    copy: {
      hook: 'Tax filing due in {value} — already calculated.',
      message: 'Your VAT/levies for the period are auto-computed and reconciled. Filing is one click and {value} away from the deadline.',
      ctaLabel: 'Review & file', ctaHref: '/books',
      smsText: 'Stawi: tax deadline in {value}. Your figures are computed and ready — review and file from the Books page.',
      emailSubject: 'Filed in 5 minutes: your tax is ready, deadline in {value}',
      posterHeadline: 'Tax season without the panic.',
      newsletterBlurb: 'Compliance corner: automated levy calculations filed on time keep your registration — and your graduation — on track.',
    },
  },
  {
    id: 'p4-interest-earned',
    pillar: 4, goal: 'RETAIN', audience: 'MEMBER', priority: 75,
    trigger: (s) => s.interestEarnedMonthCents > 0,
    value: (s) => `${Math.round(s.interestEarnedMonthCents / 100).toLocaleString('en-KE')}`,
    copy: {
      hook: 'Your money earned {value} while you slept.',
      message: 'This month’s interest landed: {value} at 10% p.a., posted automatically. No branch. No queue. No forms.',
      ctaLabel: 'See my savings', ctaHref: '/sacco',
      smsText: 'Stawi SACCO+: interest of {value} posted to your account this month. Your deposits earn 10% p.a., every month, automatically.',
      emailSubject: 'Interest posted: {value} — 10% p.a., automatic',
      posterHeadline: 'Your money should work night shift too.',
      newsletterBlurb: 'Interest day: deposits across SACCO+ earned their monthly 10% p.a. accrual — posted automatically, visible to every member.',
    },
  },
  {
    id: 'p4-tier-close',
    pillar: 4, goal: 'MOBILIZE', audience: 'MEMBER', priority: 80,
    trigger: (s) => s.nextTierName !== null && s.tierReadinessPct >= 60 && s.tierReadinessPct < 100,
    value: (s) => `${s.tierReadinessPct}%`,
    copy: {
      hook: 'You are {value} of the way to {tier}.',
      message: 'One or two checks stand between you and {tier} — a bigger multiplier and a cheaper rate, earned by your own record.',
      ctaLabel: 'See my gap list', ctaHref: '/sacco',
      smsText: 'Stawi: you are {value} of the way to the {tier} tier. Open the Graduate tab to see exactly what’s left.',
      emailSubject: '{value} to {tier} — your next rate cut is close',
      posterHeadline: 'No committee. No favours. Your record decides.',
      newsletterBlurb: 'Tier graduations: hundreds of parties moved up this quarter — cheaper loans earned by streaks, repayment and clean books.',
    },
  },
  {
    id: 'p4-ladder-progress',
    pillar: 4, goal: 'REFER', audience: 'GROUP', priority: 45,
    trigger: (s) => s.institutionReadinessDeltaPct > 0,
    value: (s) => `${s.institutionReadinessDeltaPct}%`,
    copy: {
      hook: 'Your institution moved {value} closer to its next licence.',
      message: '{group} climbed {value} toward the next rung this quarter. Members did that — savings, repayments, and new recruits.',
      ctaLabel: 'See the ladder', ctaHref: '/sacco',
      smsText: 'Stawi: {group} moved {value} closer to its next licence this quarter. Every deposit and every new member counts.',
      emailSubject: '{group} is {value} closer to graduating',
      posterHeadline: 'From chama to bank. Watch it happen.',
      newsletterBlurb: 'Ladder report: institutional readiness rose across the platform — the chama→listed journey, measured and moving.',
    },
  },
  {
    id: 'lifecycle-trial-ending',
    pillar: 1, goal: 'MONETIZE', audience: 'OFFICIAL', priority: 95,
    trigger: (s) => s.trialDaysLeft !== null && s.trialDaysLeft <= 7,
    value: (s) => `${s.trialDaysLeft} days`,
    copy: {
      hook: 'Free month ends in {value} — look what you built.',
      message: 'In one month {group} got live capital ratios, clean books and a credit tier in motion. Keep it for the price of one member’s lunch.',
      ctaLabel: 'Continue with Stawi', ctaHref: '/subscribe',
      smsText: 'Stawi: your free month ends in {value}. Keep your books, ratios and credit progress — subscribe from the app.',
      emailSubject: 'Your first month, in numbers (and {value} to keep it)',
      posterHeadline: 'One month free. A lifetime of order.',
      newsletterBlurb: 'Welcome cohort: trial groups converting keep their entire history — streaks, tiers and books carry straight over.',
    },
  },
];

/** Active moments for a party, highest priority first, capped to `limit`. */
export function detectMoments(signals: MomentSignals, limit = 3): Moment[] {
  return MOMENTS.filter((m) => m.trigger(signals))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}

/** Fill copy placeholders for a channel string. */
export function fillMoment(
  template: string,
  vars: { name?: string; group?: string; value?: string; tier?: string },
): string {
  return template
    .replaceAll('{name}', vars.name ?? 'member')
    .replaceAll('{group}', vars.group ?? 'your group')
    .replaceAll('{value}', vars.value ?? '')
    .replaceAll('{tier}', vars.tier ?? 'the next tier');
}
