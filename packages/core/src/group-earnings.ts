/**
 * Group earnings (owner 28/11/26): every shilling the GROUP itself earns,
 * traced to who, when and why, so nobody can ask "where did the fines go?".
 *
 * Two sources today:
 *  - Table banking extra: what a member brought back above what they took
 *    (TableRoundTurn.returnedCents − givenCents). Not yet back = "still to come".
 *  - Fines written in meeting minutes (Meeting.tableBanking.fines). They count
 *    once the minutes are posted; fines in a draft are shown apart as "not final".
 *
 * Pure and read-only: a record of what the group wrote down. Stawi never
 * moves, holds or shares out this money (propose, never dispose).
 */

export interface EarningsTurn {
  roundNo: number;
  turn: number;
  name: string;
  givenCents: number;
  /** Agreed amount to bring back. */
  returnCents: number;
  /** Agreed day to bring it back (yyyy-mm-dd). */
  returnOn: string;
  /** What was really brought back, and when; null while not back. */
  returnedCents: number | null;
  returnedOn: string | null;
  /** False when the money was never handed out (no extra is expected). */
  given: boolean;
}

export interface EarningsFine {
  meetingNo: number;
  date: string;
  name: string;
  reason: string;
  amountCents: number;
  posted: boolean;
}

export type EarningKind = 'round' | 'fine';
export type EarningState = 'in' | 'coming' | 'late' | 'draft' | 'short';

export interface EarningLine {
  kind: EarningKind;
  date: string;
  who: string;
  why: string;
  amountCents: number;
  state: EarningState;
}

export interface GroupEarnings {
  lines: EarningLine[];
  /** Earned and counted. */
  inCents: number;
  roundInCents: number;
  finesInCents: number;
  /** Agreed extra not brought back yet (late included). */
  comingCents: number;
  lateCents: number;
  /** Fines in minutes not posted yet. */
  draftCents: number;
  /** Members who brought back less than they took. */
  shortCents: number;
  byMonth: { month: string; roundCents: number; finesCents: number }[];
}

export const EARNING_WORDS: Record<EarningState, string> = {
  in: 'Earned',
  coming: 'Still to come',
  late: 'Late',
  draft: 'Not final yet',
  short: 'Brought back less',
};

const day = (s: string) => String(s ?? '').slice(0, 10);

export function groupEarnings(turns: EarningsTurn[], fines: EarningsFine[], today: string): GroupEarnings {
  const lines: EarningLine[] = [];
  for (const t of turns) {
    if (!t.given || t.givenCents <= 0) continue;
    const label = `Round ${t.roundNo}, turn ${t.turn}`;
    if (t.returnedCents !== null) {
      const extra = t.returnedCents - t.givenCents;
      const agreedExtra = t.returnCents - t.givenCents;
      if (extra < 0) {
        lines.push({ kind: 'round', date: day(t.returnedOn ?? t.returnOn), who: t.name, why: `${label}: brought back less than taken`, amountCents: extra, state: 'short' });
      } else if (extra > 0) {
        const less = agreedExtra > extra ? ` (agreed extra was more)` : '';
        lines.push({ kind: 'round', date: day(t.returnedOn ?? t.returnOn), who: t.name, why: `${label}: extra brought back${less}`, amountCents: extra, state: 'in' });
      }
    } else {
      const agreedExtra = t.returnCents - t.givenCents;
      if (agreedExtra > 0) {
        const late = day(t.returnOn) < day(today);
        lines.push({ kind: 'round', date: day(t.returnOn), who: t.name, why: `${label}: extra due back${late ? ' (late)' : ''}`, amountCents: agreedExtra, state: late ? 'late' : 'coming' });
      }
    }
  }
  for (const f of fines) {
    if (!(f.amountCents > 0)) continue;
    lines.push({
      kind: 'fine',
      date: day(f.date),
      who: f.name || 'A member',
      why: `Meeting ${f.meetingNo}: ${f.reason?.trim() || 'fine'}`,
      amountCents: f.amountCents,
      state: f.posted ? 'in' : 'draft',
    });
  }
  lines.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const sum = (pred: (l: EarningLine) => boolean) => lines.filter(pred).reduce((t, l) => t + l.amountCents, 0);
  const roundInCents = sum((l) => l.kind === 'round' && (l.state === 'in' || l.state === 'short'));
  const finesInCents = sum((l) => l.kind === 'fine' && l.state === 'in');
  const months = new Map<string, { roundCents: number; finesCents: number }>();
  for (const l of lines) {
    if (l.state !== 'in' && l.state !== 'short') continue;
    const m = months.get(l.date.slice(0, 7)) ?? { roundCents: 0, finesCents: 0 };
    if (l.kind === 'round') m.roundCents += l.amountCents;
    else m.finesCents += l.amountCents;
    months.set(l.date.slice(0, 7), m);
  }
  return {
    lines,
    inCents: roundInCents + finesInCents,
    roundInCents,
    finesInCents,
    comingCents: sum((l) => l.state === 'coming' || l.state === 'late'),
    lateCents: sum((l) => l.state === 'late'),
    draftCents: sum((l) => l.state === 'draft'),
    shortCents: -sum((l) => l.state === 'short'),
    byMonth: [...months.entries()].sort(([a], [b]) => (a < b ? 1 : -1)).map(([month, v]) => ({ month, ...v })),
  };
}

/** Spreadsheet copy for the auditor or the members' WhatsApp group. */
export function groupEarningsCsv(e: GroupEarnings): string {
  const q = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const rows = [['Date', 'Where it came from', 'Member', 'Why', 'KES', 'State'].map(q).join(',')];
  for (const l of e.lines) {
    rows.push([l.date, l.kind === 'round' ? 'Table banking extra' : 'Fine', l.who, l.why, (l.amountCents / 100).toFixed(2), EARNING_WORDS[l.state]].map(q).join(','));
  }
  rows.push(['', '', '', 'Total earned', (e.inCents / 100).toFixed(2), ''].map(q).join(','));
  return rows.join('\n') + '\n';
}
