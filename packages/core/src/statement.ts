/**
 * Month-End Statement — Pillar 1 reconciliation.
 *
 * At month end, every meeting held in the period is harmonised into one
 * analytical, downloadable statement: attendance per member, contributions,
 * fines, the money trail (opening → closing), and every resolution passed.
 *
 * This is the artefact a group hands to a bank or SACCO as proof of disciplined,
 * ongoing activity. Pure and deterministic; officials edit before posting.
 */

import type { Meeting } from './minutes';
import { attendanceTally, tableBankingSummary } from './minutes';
import type { GroupCharter } from './charter';
import { formalResolution, formatKes, ordinal } from './minutes-prose';

export interface MemberMonthStat {
  memberId: string;
  name: string;
  meetingsPresent: number;
  meetingsApology: number;
  meetingsAbsent: number;
  attendancePct: number;
  contributedCents: number;
  finesCents: number;
}

export interface MonthFinance {
  openingCents: number;
  contributionsCents: number;
  finesCents: number;
  otherInCents: number;
  payoutsCents: number;
  otherOutCents: number;
  totalInCents: number;
  totalOutCents: number;
  closingCents: number;
}

export interface MonthEndStatement {
  groupName: string;
  motto?: string;
  period: { year: number; month: number; label: string };
  meetingsHeld: number;
  membersOnRegister: number;
  avgAttendancePct: number;
  members: MemberMonthStat[];
  finance: MonthFinance;
  resolutions: string[];
  narrative: string[];
  topContributor?: { name: string; amountCents: number };
  bestAttendee?: { name: string; pct: number };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function monthOf(iso: string): { year: number; month: number } | null {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00Z' : iso);
  if (isNaN(d.getTime())) return null;
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/**
 * Harmonise the meetings that fall in a given month.
 * If `year`/`month` are omitted, the period is inferred from the first dated meeting.
 */
export function reconcileMonth(
  allMeetings: Meeting[],
  charter?: GroupCharter,
  period?: { year: number; month: number },
): MonthEndStatement {
  const dated = allMeetings.filter((m) => monthOf(m.date));
  const inferred = period ?? (dated[0] ? monthOf(dated[0].date)! : { year: new Date().getUTCFullYear(), month: new Date().getUTCMonth() + 1 });

  const meetings = dated
    .filter((m) => {
      const mo = monthOf(m.date)!;
      return mo.year === inferred.year && mo.month === inferred.month;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const groupName = charter?.name?.trim() || 'The Group';
  const meetingsHeld = meetings.length;

  // Register: charter roster if present, else the union of attendees.
  const registerMap = new Map<string, { name: string }>();
  charter?.members.forEach((m) => registerMap.set(m.id, { name: m.fullName }));
  if (registerMap.size === 0) {
    meetings.forEach((mt) => mt.attendance.forEach((a) => registerMap.set(a.memberId, { name: a.name })));
  }

  // Per-member stats
  const members: MemberMonthStat[] = [...registerMap.entries()].map(([memberId, info]) => {
    let present = 0, apology = 0, absent = 0, contributed = 0, fines = 0;
    for (const mt of meetings) {
      const mark = mt.attendance.find((a) => a.memberId === memberId);
      if (mark?.status === 'present') present++;
      else if (mark?.status === 'apology') apology++;
      else if (mark?.status === 'absent') absent++;
      contributed += mt.tableBanking.contributions.filter((c) => c.memberId === memberId).reduce((s, c) => s + c.amountCents, 0);
      fines += mt.tableBanking.fines.filter((f) => f.memberId === memberId).reduce((s, f) => s + f.amountCents, 0);
    }
    return {
      memberId,
      name: info.name,
      meetingsPresent: present,
      meetingsApology: apology,
      meetingsAbsent: absent,
      attendancePct: meetingsHeld ? Math.round((present / meetingsHeld) * 100) : 0,
      contributedCents: contributed,
      finesCents: fines,
    };
  });

  // Finance roll-up
  const summaries = meetings.map((m) => tableBankingSummary(m.tableBanking));
  const finance: MonthFinance = {
    openingCents: summaries[0]?.openingCents ?? 0,
    contributionsCents: summaries.reduce((s, x) => s + x.contributionsCents, 0),
    finesCents: summaries.reduce((s, x) => s + x.finesCents, 0),
    otherInCents: summaries.reduce((s, x) => s + x.otherInCents, 0),
    payoutsCents: summaries.reduce((s, x) => s + x.payoutCents, 0),
    otherOutCents: summaries.reduce((s, x) => s + x.otherOutCents, 0),
    totalInCents: summaries.reduce((s, x) => s + x.totalInCents, 0),
    totalOutCents: summaries.reduce((s, x) => s + x.totalOutCents, 0),
    closingCents: summaries[summaries.length - 1]?.closingBalanceCents ?? 0,
  };

  const resolutions: string[] = [];
  meetings.forEach((m) => m.agendas.forEach((a) => { if (a.resolution.trim()) resolutions.push(formalResolution(a.resolution)); }));

  const avgAttendancePct = members.length
    ? Math.round(members.reduce((s, m) => s + m.attendancePct, 0) / members.length)
    : 0;

  const topContributor = [...members].sort((a, b) => b.contributedCents - a.contributedCents)[0];
  const bestAttendee = [...members].sort((a, b) => b.attendancePct - a.attendancePct)[0];

  const label = `${MONTHS[inferred.month - 1]} ${inferred.year}`;

  const narrative: string[] = [];
  narrative.push(
    `During the month of ${label}, ${groupName} convened ${meetingsHeld} meeting${meetingsHeld === 1 ? '' : 's'}, ` +
      `with an average member attendance of ${avgAttendancePct}%. The group has ${members.length} member(s) on its register.`,
  );
  narrative.push(
    `A total of ${formatKes(finance.contributionsCents)} was contributed and ${formatKes(finance.finesCents)} collected in fines and penalties. ` +
      `Opening the month with ${formatKes(finance.openingCents)}, the group recorded total receipts of ${formatKes(finance.totalInCents)} ` +
      `and disbursements of ${formatKes(finance.totalOutCents)}, closing with a balance of ${formatKes(finance.closingCents)}.`,
  );
  if (topContributor && topContributor.contributedCents > 0)
    narrative.push(`The highest individual contributor for the period was ${topContributor.name} (${formatKes(topContributor.contributedCents)}).`);
  if (resolutions.length)
    narrative.push(`The group passed ${resolutions.length} formal resolution${resolutions.length === 1 ? '' : 's'} during the period, all recorded in the respective meeting minutes.`);
  narrative.push(
    `This statement is a harmonised reconciliation of all attendance, contributions, fines and resolutions for ${label}, ` +
      `and may be presented as evidence of the group's continuing activity and financial discipline.`,
  );

  return {
    groupName,
    motto: charter?.motto,
    period: { ...inferred, label },
    meetingsHeld,
    membersOnRegister: members.length,
    avgAttendancePct,
    members,
    finance,
    resolutions,
    narrative,
    topContributor: topContributor && topContributor.contributedCents > 0 ? { name: topContributor.name, amountCents: topContributor.contributedCents } : undefined,
    bestAttendee: bestAttendee ? { name: bestAttendee.name, pct: bestAttendee.attendancePct } : undefined,
  };
}
