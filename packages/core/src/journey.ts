/**
 * Cross-pillar journey engine — the self-directing spine that makes the four
 * pillars feel like one app.
 *
 * Given a group's current state (a few primitives the caller already has), it
 * reports where the group stands on each pillar and, crucially, the single
 * most important **next step** to take — so the UI can always answer "what do
 * I do now?" without the user having to understand the pillar model at all.
 *
 * Pure functions, no I/O, no cross-module imports: every pillar hands in a
 * primitive, nothing reaches into another pillar's internals. That decoupling
 * is what keeps the pillars conflict-free as the app grows.
 */

export type PillarId = 1 | 2 | 3 | 4;

export type PillarStatus =
  | 'locked' // prerequisites not met yet
  | 'available' // can be started
  | 'in_progress' // started, not complete
  | 'ready' // eligible for a milestone action (e.g. activate SACCO+)
  | 'active' // milestone reached / running
  | 'done'; // complete

export interface PillarProgress {
  id: PillarId;
  key: 'records' | 'matching' | 'accounting' | 'sacco';
  title: string;
  status: PillarStatus;
  /** 0–100 completeness for this pillar. */
  pct: number;
  /** One-line, plain-language state. */
  summary: string;
  /** The concrete next action for this pillar, if any. */
  nextAction?: { label: string; target: JourneyTarget };
}

/** Where a next action points — an in-cockpit tab or a cross-route link. */
export type JourneyTarget =
  | { kind: 'tab'; tab: 'charter' | 'minutes' | 'documents' | 'statement' | 'sacco' }
  | { kind: 'route'; href: string };

export interface GroupJourney {
  pillars: PillarProgress[];
  /** Overall progress across the four pillars, 0–100. */
  overallPct: number;
  /** The one self-directing next step across the whole app. */
  focus: {
    pillarId: PillarId;
    label: string;
    why: string;
    target: JourneyTarget;
  };
}

/** Everything the journey needs — each field owned by a single pillar. */
export interface JourneyInput {
  /** Pillar 1 — charter completeness, 0–100. */
  charterPct: number;
  /** Pillar 1 — number of posted (finalised) meeting records. */
  postedRecords: number;
  /** Pillar 3 — group is legally registered. */
  registered: boolean;
  /** Pillar 3 — accounting/books engaged. */
  booksStarted?: boolean;
  /** Pillar 2 — business matching engaged. */
  matchingStarted?: boolean;
  /** Pillar 4 — SACCO+ activation readiness from sacco-activation, 0–100. */
  saccoReadinessPct: number;
  /** Pillar 4 — SACCO+ account is open. */
  saccoActive: boolean;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export const PILLAR_TITLES: Record<PillarId, string> = {
  1: 'Records & Table Banking',
  2: 'Business Matching',
  3: 'Accounting & Compliance',
  4: 'Savings & Credit',
};

function pillar1(i: JourneyInput): PillarProgress {
  const pct = clampPct(0.6 * i.charterPct + 0.4 * Math.min(100, i.postedRecords * 34));
  const done = i.charterPct >= 100 && i.postedRecords >= 1;
  const status: PillarStatus = done
    ? 'done'
    : i.charterPct > 0 || i.postedRecords > 0
      ? 'in_progress'
      : 'available';
  const nextAction =
    i.charterPct < 100
      ? { label: 'Complete your charter', target: { kind: 'tab', tab: 'charter' } as JourneyTarget }
      : i.postedRecords < 1
        ? { label: 'Record & post a meeting', target: { kind: 'tab', tab: 'minutes' } as JourneyTarget }
        : undefined;
  const summary = done
    ? `Charter complete · ${i.postedRecords} record${i.postedRecords === 1 ? '' : 's'} posted`
    : i.charterPct < 100
      ? `Charter ${clampPct(i.charterPct)}% complete`
      : 'Charter done — post your first meeting';
  return { id: 1, key: 'records', title: PILLAR_TITLES[1], status, pct, summary, nextAction };
}

function pillar3(i: JourneyInput): PillarProgress {
  const unlocked = i.charterPct >= 50;
  const status: PillarStatus = i.registered
    ? i.booksStarted
      ? 'active'
      : 'ready'
    : unlocked
      ? 'available'
      : 'locked';
  const pct = i.registered ? (i.booksStarted ? 100 : 70) : unlocked ? 20 : 0;
  const nextAction = !i.registered
    ? unlocked
      ? { label: 'Register your group', target: { kind: 'route', href: '/formalize' } as JourneyTarget }
      : undefined
    : { label: i.booksStarted ? 'Update your books' : 'Start your books', target: { kind: 'route', href: '/books' } as JourneyTarget };
  const summary = i.registered
    ? i.booksStarted
      ? 'Registered · books live'
      : 'Registered — start double-entry books'
    : unlocked
      ? 'Ready to register for legal standing'
      : 'Add your roster first to unlock registration';
  return { id: 3, key: 'accounting', title: PILLAR_TITLES[3], status, pct, summary, nextAction };
}

function pillar4(i: JourneyInput): PillarProgress {
  const hasHistory = i.postedRecords >= 1;
  const status: PillarStatus = i.saccoActive
    ? 'active'
    : i.saccoReadinessPct >= 100
      ? 'ready'
      : hasHistory
        ? 'available'
        : 'locked';
  const pct = i.saccoActive ? 100 : clampPct(i.saccoReadinessPct);
  const nextAction = i.saccoActive
    ? { label: 'Manage savings & credit', target: { kind: 'tab', tab: 'sacco' } as JourneyTarget }
    : hasHistory
      ? { label: i.saccoReadinessPct >= 100 ? 'Join Stawi SACCO now' : 'Review SACCO+ readiness', target: { kind: 'tab', tab: 'sacco' } as JourneyTarget }
      : undefined;
  const summary = i.saccoActive
    ? 'SACCO+ active — saving & lending'
    : i.saccoReadinessPct >= 100
      ? 'Fully lender-ready — one tap to join'
      : hasHistory
        ? `SACCO+ ${clampPct(i.saccoReadinessPct)}% lender-ready`
        : 'Post records to build lender-ready history';
  return { id: 4, key: 'sacco', title: PILLAR_TITLES[4], status, pct, summary, nextAction };
}

function pillar2(i: JourneyInput): PillarProgress {
  const unlocked = i.charterPct >= 100 || i.registered;
  const status: PillarStatus = i.matchingStarted ? 'active' : unlocked ? 'available' : 'locked';
  const pct = i.matchingStarted ? 100 : unlocked ? 15 : 0;
  const nextAction = unlocked
    ? { label: i.matchingStarted ? 'View your matches' : 'Find business matches', target: { kind: 'route', href: '/match' } as JourneyTarget }
    : undefined;
  const summary = i.matchingStarted
    ? 'Matching live'
    : unlocked
      ? 'Turn your capital into business matches'
      : 'Complete your charter to unlock matching';
  return { id: 2, key: 'matching', title: PILLAR_TITLES[2], status, pct, summary, nextAction };
}

/**
 * Compute the group's whole-app journey and its single next step.
 * Pillars are returned in the natural walk order 1 → 3 → 4 → 2 (records first,
 * then legal standing, then savings & credit, then growth), which is also the
 * order the focus selector prefers.
 */
export function computeJourney(input: JourneyInput): GroupJourney {
  const p1 = pillar1(input);
  const p3 = pillar3(input);
  const p4 = pillar4(input);
  const p2 = pillar2(input);
  const pillars = [p1, p3, p4, p2];

  const overallPct = clampPct((p1.pct + p2.pct + p3.pct + p4.pct) / 4);

  // Self-directing priority ladder: foundation → legal standing → savings/credit
  // when ready → keep books → growth. First actionable rung wins.
  const focus =
    (p1.status !== 'done' && p1.nextAction && {
      pillarId: 1 as PillarId,
      label: p1.nextAction.label,
      why: 'Your records are the foundation every other pillar builds on.',
      target: p1.nextAction.target,
    }) ||
    (!input.registered && p3.nextAction && {
      pillarId: 3 as PillarId,
      label: p3.nextAction.label,
      why: 'Registration gives your group legal standing lenders and partners require.',
      target: p3.nextAction.target,
    }) ||
    (p4.status === 'ready' && p4.nextAction && {
      pillarId: 4 as PillarId,
      label: p4.nextAction.label,
      why: 'Your Pillar 1 record already meets what a lender asks for — activate credit.',
      target: p4.nextAction.target,
    }) ||
    (p4.status === 'available' && p4.nextAction && {
      pillarId: 4 as PillarId,
      label: p4.nextAction.label,
      why: 'Keep posting records to become fully lender-ready for savings & credit.',
      target: p4.nextAction.target,
    }) ||
    (!input.booksStarted && input.registered && p3.nextAction && {
      pillarId: 3 as PillarId,
      label: p3.nextAction.label,
      why: 'Digital books keep your accounts audit-ready from day one.',
      target: p3.nextAction.target,
    }) ||
    (!input.matchingStarted && p2.nextAction && {
      pillarId: 2 as PillarId,
      label: p2.nextAction.label,
      why: 'Grow your group’s capital into real business opportunities.',
      target: p2.nextAction.target,
    }) || {
      pillarId: 4 as PillarId,
      label: 'Manage savings & credit',
      why: 'All four pillars are engaged — keep your momentum.',
      target: { kind: 'tab', tab: 'sacco' } as JourneyTarget,
    };

  return { pillars, overallPct, focus };
}
