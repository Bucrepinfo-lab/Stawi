/**
 * The paraphrasing "OS" — Pillar 1.
 *
 * Takes a lightly-filled meeting record (from members who may not write formal
 * English) and produces a professional, structured minutes document suitable for
 * presenting to a bank or microfinance institution as evidence of the group's
 * existence and activity.
 *
 * Fully deterministic: same input → same document, offline, no keys. An optional
 * live-on-key AI pass can polish the prose further, but the group is never blocked
 * on it. Officials edit the generated text before posting.
 */

import type { Meeting, AgendaItem, AobItem } from './minutes';
import { attendanceTally, tableBankingSummary } from './minutes';
import type { GroupCharter } from './charter';

// ── formatting helpers ───────────────────────────────────────────────────

export function formatKes(cents: number, currency = 'KES'): string {
  const whole = Math.round(cents) / 100;
  const s = whole.toLocaleString('en-KE', { minimumFractionDigits: whole % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
  return `${currency} ${s}`;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0] ?? 'th');
}

export function formatDateLong(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00Z' : iso);
  if (isNaN(d.getTime())) return iso;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${days[d.getUTCDay()]}, ${ordinal(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function joinNames(names: string[], empty = 'none'): string {
  const clean = names.filter(Boolean);
  if (clean.length === 0) return empty;
  if (clean.length === 1) return clean[0]!;
  return clean.slice(0, -1).join(', ') + ' and ' + clean[clean.length - 1]!;
}

/** Strip conversational filler from a raw phrase so it can be recast formally. */
export function cleanClause(raw: string): string {
  let s = (raw || '').trim().replace(/\s+/g, ' ');
  s = s.replace(/[.。]+$/, '');
  s = s.replace(/^(we\s+)?(agreed|resolved|decided|proposed|suggested)\s+(to|that)\s+/i, '');
  s = s.replace(/^(to|that)\s+/i, '');
  s = s.replace(/^we\s+(will|shall|should|would|are going to|are)\s+/i, '');
  return s.trim();
}

function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

/** Recast an informal agreement into a formal resolution. */
export function formalResolution(raw: string): string {
  const clause = cleanClause(raw);
  if (!clause) return '';
  let body: string;
  if (/^we\b/i.test(clause)) {
    body = clause.replace(/^we\b/i, 'the group');
  } else if (/^(the |members\b|all \b|all\b|each\b|every\b|it\b|officials?\b|committee\b|a )/i.test(clause)) {
    body = clause;
  } else {
    body = 'the group shall ' + lowerFirst(clause);
  }
  return `RESOLVED THAT ${body}.`;
}

function sentence(raw: string): string {
  const s = (raw || '').trim().replace(/\s+/g, ' ');
  if (!s) return '';
  const cased = s.charAt(0).toUpperCase() + s.slice(1);
  return /[.!?]$/.test(cased) ? cased : cased + '.';
}

// ── document model ────────────────────────────────────────────────────────

export interface ProseSection {
  heading: string;
  paragraphs: string[];
}

export interface FinanceRow {
  label: string;
  amountDisplay: string;
  emphasis?: boolean;
}

export interface ProfessionalMinutes {
  documentTitle: string;
  groupName: string;
  motto?: string;
  meetingRef: string;
  dateLong: string;
  venue: string;
  timeRange: string;
  attendanceLine: string;
  sections: ProseSection[];
  financeRows: FinanceRow[];
  signatories: { role: string; name: string }[];
  /** The whole document assembled as plain text (for copy / print / export). */
  plainText: string;
}

function agendaSection(agendas: AgendaItem[]): ProseSection {
  const paras: string[] = [];
  agendas.filter((a) => a.title.trim()).forEach((a, i) => {
    const no = `4.${i + 1}`;
    const bits: string[] = [`${no} ${sentence(a.title)}`];
    if (a.discussion.trim()) bits.push(`The meeting deliberated on ${lowerFirst(sentence(a.discussion)).replace(/\.$/, '')}.`);
    if (a.proposedBy?.trim()) {
      const seconded = a.secondedBy?.trim() ? ` and seconded by ${a.secondedBy.trim()}` : '';
      bits.push(`The matter was proposed by ${a.proposedBy.trim()}${seconded}.`);
    }
    if (a.resolution.trim()) bits.push(formalResolution(a.resolution));
    paras.push(bits.join(' '));
  });
  if (paras.length === 0) paras.push('No agenda items were formally minuted for this meeting.');
  return { heading: '4. AGENDA & DELIBERATIONS', paragraphs: paras };
}

function aobSection(aobs: AobItem[]): ProseSection {
  const paras = aobs
    .filter((a) => a.topic.trim())
    .map((a, i) => {
      const d = a.deliberation.trim() ? ` ${sentence(a.deliberation)}` : ' The matter was noted for follow-up.';
      return `${sentence(a.topic)}:${d}`;
    });
  if (paras.length === 0) paras.push('There was no other business.');
  return { heading: '6. ANY OTHER BUSINESS (AOB)', paragraphs: paras };
}

/** The core transform: a filled meeting → a professional minutes document. */
export function paraphraseMinutes(m: Meeting, charter?: GroupCharter): ProfessionalMinutes {
  const groupName = charter?.name?.trim() || 'The Group';
  const currency = 'KES';
  const tally = attendanceTally(m.attendance);
  const fin = tableBankingSummary(m.tableBanking);

  const documentTitle = `MINUTES OF THE ${ordinal(m.meetingNo).toUpperCase()} MEETING OF ${groupName.toUpperCase()}`;
  const dateLong = formatDateLong(m.date);
  const timeRange = [m.startTime, m.endTime].filter(Boolean).join(' – ');

  // 1. Preliminaries
  const chair = m.chairpersonName.trim() || 'the Chairperson';
  const opening: string[] = [];
  opening.push(
    `The ${ordinal(m.meetingNo)} meeting of ${groupName} was held on ${dateLong || 'the stated date'}${m.venue ? ` at ${m.venue}` : ''}. ` +
      `The meeting was called to order at ${m.startTime || 'the appointed time'} by the Chairperson, ${chair}.`,
  );
  opening.push(
    tally.quorumMet
      ? 'The Secretary confirmed that the required quorum was present and the meeting proceeded to business.'
      : 'The Secretary noted the attendance; members present resolved to proceed with the business of the day.',
  );

  // 2. Attendance
  const attendance: string[] = [];
  attendance.push(
    `A total of ${tally.total} members were on the register. ` +
      `Present (${tally.present}): ${joinNames(tally.presentNames)}. ` +
      `Absent with apology (${tally.apology}): ${joinNames(tally.apologyNames)}. ` +
      `Absent without apology (${tally.absent}): ${joinNames(tally.absentNames)}.`,
  );

  // 3. Confirmation of previous minutes
  const confirmation: string[] = [
    m.meetingNo > 1
      ? 'The minutes of the previous meeting were read, confirmed as a true record, and signed by the Chairperson.'
      : 'This being the inaugural meeting on record, there were no previous minutes to confirm.',
  ];

  // 5. Table banking
  const finance: string[] = [];
  if (fin.contributorCount > 0 || fin.finesCents > 0 || fin.payoutCents > 0) {
    const parts: string[] = [];
    if (fin.contributorCount > 0)
      parts.push(`contributions totalling ${formatKes(fin.contributionsCents, currency)} were collected from ${fin.contributorCount} member(s)`);
    if (fin.finesCents > 0)
      parts.push(`fines and penalties amounting to ${formatKes(fin.finesCents, currency)} were levied`);
    if ((fin.otherInCents ?? 0) > 0) parts.push(`other receipts of ${formatKes(fin.otherInCents, currency)} were recorded`);
    finance.push(`During the table-banking session, ${joinNames(parts, 'no monies were transacted')}.`);
    if (fin.payoutCents > 0)
      finance.push(`A merry-go-round payout of ${formatKes(fin.payoutCents, currency)} was made to ${m.tableBanking.payoutRecipient || 'the member next in rotation'}.`);
    if (m.tableBanking.fines.length > 0) {
      const reasons = m.tableBanking.fines.filter((f) => f.reason.trim()).map((f) => `${f.name} (${lowerFirst(f.reason.trim())}, ${formatKes(f.amountCents, currency)})`);
      if (reasons.length) finance.push(`Fines were recorded against: ${joinNames(reasons)}.`);
    }
    finance.push(
      `The meeting opened with a balance of ${formatKes(fin.openingCents, currency)}. ` +
        `Total receipts were ${formatKes(fin.totalInCents, currency)} and total disbursements ${formatKes(fin.totalOutCents, currency)}, ` +
        `leaving a closing balance of ${formatKes(fin.closingBalanceCents, currency)}.`,
    );
  } else {
    finance.push('No table-banking transactions were recorded at this meeting.');
  }

  // 7. Adjournment
  const adjourn: string[] = [];
  adjourn.push(
    `There being no further business, the meeting was adjourned at ${m.adjournmentTime || m.endTime || 'the scheduled time'} with a word of prayer.` +
      (m.nextMeetingDate ? ` The next meeting is scheduled for ${formatDateLong(m.nextMeetingDate)}.` : ''),
  );

  const sections: ProseSection[] = [
    { heading: '1. PRELIMINARIES', paragraphs: opening },
    { heading: '2. ATTENDANCE', paragraphs: attendance },
    { heading: '3. CONFIRMATION OF PREVIOUS MINUTES', paragraphs: confirmation },
    agendaSection(m.agendas),
    { heading: '5. TABLE-BANKING / FINANCIAL REPORT', paragraphs: finance },
    aobSection(m.aobs),
    { heading: '7. ADJOURNMENT', paragraphs: adjourn },
  ];

  const financeRows: FinanceRow[] = [
    { label: 'Opening balance', amountDisplay: formatKes(fin.openingCents, currency) },
    { label: 'Contributions collected', amountDisplay: formatKes(fin.contributionsCents, currency) },
    { label: 'Fines & penalties', amountDisplay: formatKes(fin.finesCents, currency) },
    { label: 'Other receipts', amountDisplay: formatKes(fin.otherInCents, currency) },
    { label: 'Merry-go-round payout', amountDisplay: formatKes(fin.payoutCents, currency) },
    { label: 'Other disbursements', amountDisplay: formatKes(fin.otherOutCents, currency) },
    { label: 'Closing balance', amountDisplay: formatKes(fin.closingBalanceCents, currency), emphasis: true },
  ];

  const signatories = [
    { role: 'Chairperson', name: m.chairpersonName.trim() || '__________________' },
    { role: 'Secretary', name: m.secretaryName.trim() || '__________________' },
  ];

  const attendanceLine = `${tally.present}/${tally.total} present (${tally.presentPct}%) · quorum ${tally.quorumMet ? 'met' : 'not met'}`;

  const plainText = buildPlainText({
    documentTitle,
    groupName,
    motto: charter?.motto,
    meetingRef: `Meeting No. ${m.meetingNo}`,
    dateLong,
    venue: m.venue,
    timeRange,
    attendanceLine,
    sections,
    financeRows,
    signatories,
    plainText: '',
  });

  return {
    documentTitle,
    groupName,
    motto: charter?.motto,
    meetingRef: `Meeting No. ${m.meetingNo}`,
    dateLong,
    venue: m.venue,
    timeRange,
    attendanceLine,
    sections,
    financeRows,
    signatories,
    plainText,
  };
}

function buildPlainText(doc: ProfessionalMinutes): string {
  const lines: string[] = [];
  lines.push(doc.groupName.toUpperCase());
  if (doc.motto) lines.push(`"${doc.motto}"`);
  lines.push('');
  lines.push(doc.documentTitle);
  lines.push(`${doc.meetingRef}${doc.dateLong ? ' · ' + doc.dateLong : ''}${doc.venue ? ' · ' + doc.venue : ''}${doc.timeRange ? ' · ' + doc.timeRange : ''}`);
  lines.push('');
  for (const s of doc.sections) {
    lines.push(s.heading);
    for (const p of s.paragraphs) lines.push(p);
    if (s.heading.startsWith('5.')) {
      lines.push('');
      for (const r of doc.financeRows) lines.push(`  ${r.label}: ${r.amountDisplay}`);
    }
    lines.push('');
  }
  lines.push('SIGNED:');
  for (const sig of doc.signatories) lines.push(`  ${sig.role}: ${sig.name}`);
  return lines.join('\n');
}
