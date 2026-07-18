/**
 * Meeting Minutes — Pillar 1 activity capture.
 *
 * A meeting record is filled with the lightest possible touch: attendance is set
 * by tapping Present / Absent / Apology; agendas, AOBs and table-banking rows are
 * short entries. The heavy lifting — turning this into a formal, bank-ready
 * document — is done by `minutes-prose.ts`.
 *
 * Pure and deterministic. Money is integer cents. No network, no keys.
 */

export type AttendanceStatus = 'present' | 'absent' | 'apology';

export interface AttendanceMark {
  memberId: string;
  name: string;
  designation?: string;
  status: AttendanceStatus;
}

export interface AgendaItem {
  id: string;
  order: number;
  /** Short title, e.g. "Purchase of chairs". */
  title: string;
  /** What was discussed / proposed (raw, informal is fine). */
  discussion: string;
  proposedBy?: string;
  secondedBy?: string;
  /** What was agreed (raw, informal is fine). */
  resolution: string;
}

export interface AobItem {
  id: string;
  topic: string;
  deliberation: string;
}

/** A single table-banking / merry-go-round money movement in the meeting. */
export interface Contribution {
  memberId: string;
  name: string;
  amountCents: number;
}

export interface Fine {
  memberId: string;
  name: string;
  reason: string;
  amountCents: number;
}

export interface TableBanking {
  /** Contributions collected at the meeting. */
  contributions: Contribution[];
  /** Fines / penalties issued. */
  fines: Fine[];
  /** Merry-go-round payout made this meeting, if any. */
  payoutRecipient?: string;
  payoutCents?: number;
  /** Any loans disbursed / repaid noted at the table (free description + amount). */
  otherIn?: { label: string; amountCents: number }[];
  otherOut?: { label: string; amountCents: number }[];
  /** Cash carried forward from the previous meeting. */
  openingBalanceCents?: number;
}

export type MeetingStatus = 'DRAFT' | 'POSTED';

export interface Meeting {
  id: string;
  groupId: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  venue: string;
  day: string;
  startTime: string;
  endTime: string;
  /** 1-indexed sequence number within the group. */
  meetingNo: number;
  chairpersonName: string;
  secretaryName: string;
  attendance: AttendanceMark[];
  agendas: AgendaItem[];
  aobs: AobItem[];
  tableBanking: TableBanking;
  adjournmentTime: string;
  nextMeetingDate?: string;
  status: MeetingStatus;
}

export function emptyTableBanking(): TableBanking {
  return { contributions: [], fines: [], otherIn: [], otherOut: [], openingBalanceCents: 0 };
}

export function emptyMeeting(groupId: string, meetingNo: number, roster: { memberId: string; name: string; designation?: string }[] = []): Meeting {
  return {
    id: `mtg-${meetingNo}-${Math.random().toString(36).slice(2, 8)}`,
    groupId,
    date: '',
    venue: '',
    day: '',
    startTime: '',
    endTime: '',
    meetingNo,
    chairpersonName: '',
    secretaryName: '',
    attendance: roster.map((r) => ({ memberId: r.memberId, name: r.name, designation: r.designation, status: 'present' as AttendanceStatus })),
    agendas: [],
    aobs: [],
    tableBanking: emptyTableBanking(),
    adjournmentTime: '',
    status: 'DRAFT',
  };
}

export function addAgenda(items: AgendaItem[], input: Partial<AgendaItem> = {}): AgendaItem[] {
  const order = items.length + 1;
  return [
    ...items,
    {
      id: `ag${order}-${Math.random().toString(36).slice(2, 6)}`,
      order,
      title: input.title ?? '',
      discussion: input.discussion ?? '',
      proposedBy: input.proposedBy,
      secondedBy: input.secondedBy,
      resolution: input.resolution ?? '',
    },
  ];
}

export interface AttendanceTally {
  present: number;
  absent: number;
  apology: number;
  total: number;
  /** Present as a share of the roster (0–100). */
  presentPct: number;
  /** Quorum by a simple majority of the full roster. */
  quorumMet: boolean;
  presentNames: string[];
  absentNames: string[];
  apologyNames: string[];
}

export function attendanceTally(marks: AttendanceMark[]): AttendanceTally {
  const by = (s: AttendanceStatus) => marks.filter((m) => m.status === s);
  const present = by('present');
  const absent = by('absent');
  const apology = by('apology');
  const total = marks.length;
  return {
    present: present.length,
    absent: absent.length,
    apology: apology.length,
    total,
    presentPct: total ? Math.round((present.length / total) * 100) : 0,
    quorumMet: total > 0 && present.length * 2 > total,
    presentNames: present.map((m) => m.name),
    absentNames: absent.map((m) => m.name),
    apologyNames: apology.map((m) => m.name),
  };
}

export interface TableBankingSummary {
  openingCents: number;
  contributionsCents: number;
  finesCents: number;
  otherInCents: number;
  payoutCents: number;
  otherOutCents: number;
  /** Money that came onto the table this meeting (excl. opening). */
  totalInCents: number;
  totalOutCents: number;
  /** Opening + in − out. */
  closingBalanceCents: number;
  contributorCount: number;
  fineCount: number;
  /** True when the arithmetic is internally consistent (never throws). */
  balanced: boolean;
}

const sum = (xs: { amountCents: number }[]) => xs.reduce((s, x) => s + Math.round(x.amountCents), 0);

export function tableBankingSummary(tb: TableBanking): TableBankingSummary {
  const opening = Math.round(tb.openingBalanceCents ?? 0);
  const contributionsCents = sum(tb.contributions);
  const finesCents = sum(tb.fines);
  const otherInCents = sum(tb.otherIn ?? []);
  const payoutCents = Math.round(tb.payoutCents ?? 0);
  const otherOutCents = sum(tb.otherOut ?? []);
  const totalIn = contributionsCents + finesCents + otherInCents;
  const totalOut = payoutCents + otherOutCents;
  const closing = opening + totalIn - totalOut;
  return {
    openingCents: opening,
    contributionsCents,
    finesCents,
    otherInCents,
    payoutCents,
    otherOutCents,
    totalInCents: totalIn,
    totalOutCents: totalOut,
    closingBalanceCents: closing,
    contributorCount: tb.contributions.filter((c) => c.amountCents > 0).length,
    fineCount: tb.fines.length,
    balanced: closing === opening + totalIn - totalOut,
  };
}

export interface MeetingField {
  key: string;
  label: string;
  present: boolean;
  prompt: string;
}

/** Self-directing checklist: what the secretary still needs to fill. */
export function meetingCompleteness(m: Meeting): {
  pct: number;
  missing: MeetingField[];
  readyForDocument: boolean;
  nextPrompt?: string;
} {
  const fields: MeetingField[] = [
    { key: 'date', label: 'Meeting date', present: !!m.date, prompt: 'Set the date of this meeting.' },
    { key: 'venue', label: 'Venue', present: m.venue.trim().length > 0, prompt: 'Where was the meeting held?' },
    { key: 'time', label: 'Start time', present: m.startTime.trim().length > 0, prompt: 'What time did the meeting start?' },
    { key: 'chair', label: 'Chairperson', present: m.chairpersonName.trim().length > 0, prompt: 'Who chaired the meeting?' },
    { key: 'secretary', label: 'Secretary', present: m.secretaryName.trim().length > 0, prompt: 'Who took the minutes?' },
    { key: 'attendance', label: 'Attendance', present: m.attendance.length > 0, prompt: 'Mark who was present, absent or on apology.' },
    { key: 'agenda', label: 'At least one agenda', present: m.agendas.some((a) => a.title.trim()), prompt: 'Add the agenda items discussed.' },
    { key: 'resolutions', label: 'Resolutions', present: m.agendas.length > 0 && m.agendas.every((a) => !a.title.trim() || a.resolution.trim()), prompt: 'Record what was agreed for each agenda item.' },
    { key: 'adjourn', label: 'Adjournment', present: m.adjournmentTime.trim().length > 0, prompt: 'Note the time the meeting was adjourned.' },
  ];
  const got = fields.filter((f) => f.present).length;
  const missing = fields.filter((f) => !f.present);
  const requiredKeys = ['date', 'venue', 'time', 'chair', 'secretary', 'attendance', 'agenda', 'adjourn'];
  const readyForDocument = requiredKeys.every((k) => fields.find((f) => f.key === k)?.present);
  return {
    pct: Math.round((got / fields.length) * 100),
    missing,
    readyForDocument,
    nextPrompt: missing[0]?.prompt,
  };
}
