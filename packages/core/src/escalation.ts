/**
 * Flow & escalation — when a group's work stops moving, the right person is told.
 *
 * Adopted from the Telpen Edu standing orders (flow audit 10/10/26, escalation
 * privacy rule 09/11/26, least privilege 02/11/26) by owner order, 20/11/26.
 *
 * Every section of a group's records has ONE person who acts first. If nothing
 * happens, the matter climbs a short ladder so it never lands on nobody:
 *
 *   1 = the responsible official (Secretary, Treasurer or Chairperson)
 *   2 = the Chairperson (the Vice Chairperson when the Chairperson is responsible)
 *   3 = all the officials
 *   4 = every member — the group owns its records
 *
 * Privacy: a person sees only their own duties, and the duties that have climbed
 * to them. Colleagues do not see each other's lists. A matter that names one
 * member (missed contributions, absences) never goes beyond the officials.
 *
 * Pure and deterministic: charter + meetings + a date in, findings out. This
 * module only reports. It never sends a message, never moves money and never
 * changes a record.
 */

import type { CharterMember, GroupCharter, OfficialDesignation } from './charter';
import type { Meeting } from './minutes';
import { todayIso } from './dates';

export type EscalationLevel = 1 | 2 | 3 | 4;
export type EscalationDuty = 'chair' | 'secretary' | 'treasurer';

export type EscalationRuleId =
  | 'officials_missing'
  | 'rules_missing'
  | 'meeting_overdue'
  | 'minutes_not_posted'
  | 'contributions_not_recorded'
  | 'member_behind'
  | 'member_absent';

export interface EscalationRule {
  id: EscalationRuleId;
  duty: EscalationDuty;
  /** Days after the due date before the matter reaches levels 2, 3 and 4. */
  climbDays: [number, number, number];
  /** The highest level this matter may reach. 3 keeps a member's name among officials. */
  maxLevel: EscalationLevel;
  /** Where the responsible person goes to act (a tab of the group page). */
  tab: 'charter' | 'minutes' | 'statement';
}

/** One registry line per watch. Add a rule = one line here + one selector below. */
export const ESCALATION_RULES: Record<EscalationRuleId, EscalationRule> = {
  officials_missing: { id: 'officials_missing', duty: 'chair', climbDays: [7, 14, 28], maxLevel: 4, tab: 'charter' },
  rules_missing: { id: 'rules_missing', duty: 'chair', climbDays: [14, 28, 56], maxLevel: 4, tab: 'charter' },
  meeting_overdue: { id: 'meeting_overdue', duty: 'secretary', climbDays: [7, 14, 28], maxLevel: 4, tab: 'minutes' },
  minutes_not_posted: { id: 'minutes_not_posted', duty: 'secretary', climbDays: [7, 14, 28], maxLevel: 4, tab: 'minutes' },
  contributions_not_recorded: { id: 'contributions_not_recorded', duty: 'treasurer', climbDays: [7, 14, 28], maxLevel: 4, tab: 'minutes' },
  member_behind: { id: 'member_behind', duty: 'treasurer', climbDays: [7, 14, 9999], maxLevel: 3, tab: 'statement' },
  member_absent: { id: 'member_absent', duty: 'secretary', climbDays: [7, 14, 9999], maxLevel: 3, tab: 'minutes' },
};

/**
 * Sections that are deliberately NOT watched (creating them is a choice, so
 * "none yet" is not a stall). Kept here so the audit doc and the code agree.
 */
export const ESCALATION_UNWATCHED = ['group goals', 'business ideas', 'logo, motto, mission and vision', 'sharing'] as const;

export interface EscalationFinding {
  /** Stable key: rule + subject. Same matter → same key on every run. */
  key: string;
  rule: EscalationRuleId;
  duty: EscalationDuty;
  level: EscalationLevel;
  /** ISO date the work was due. */
  dueDate: string;
  daysOverdue: number;
  /** Member ids who should see this at its current level. Empty = every member. */
  audienceIds: string[];
  everyone: boolean;
  responsibleName: string;
  tab: EscalationRule['tab'];
  title: { en: string; sw: string };
  detail: { en: string; sw: string };
  action: { en: string; sw: string };
}

const DUTY_DESIGNATIONS: Record<EscalationDuty, OfficialDesignation[]> = {
  chair: ['Chairperson', 'Vice Chairperson'],
  secretary: ['Secretary', 'Assistant Secretary'],
  treasurer: ['Treasurer', 'Assistant Treasurer'],
};

const OFFICIAL_SET = new Set<OfficialDesignation>([
  'Chairperson', 'Vice Chairperson', 'Secretary', 'Assistant Secretary',
  'Treasurer', 'Assistant Treasurer', 'Organising Secretary', 'Signatory',
]);

const DUTY_NAME: Record<EscalationDuty, { en: string; sw: string }> = {
  chair: { en: 'Chairperson', sw: 'Mwenyekiti' },
  secretary: { en: 'Secretary', sw: 'Katibu' },
  treasurer: { en: 'Treasurer', sw: 'Mweka hazina' },
};

const LEVEL_NAME: Record<EscalationLevel, { en: string; sw: string }> = {
  1: { en: 'With the person responsible', sw: 'Kwa mhusika' },
  2: { en: 'Raised to the Chairperson', sw: 'Imepelekwa kwa Mwenyekiti' },
  3: { en: 'Raised to all officials', sw: 'Imepelekwa kwa viongozi wote' },
  4: { en: 'Raised to all members', sw: 'Imepelekwa kwa wanachama wote' },
};

export function escalationLevelName(level: EscalationLevel, lang: 'en' | 'sw' = 'en'): string {
  return LEVEL_NAME[level][lang];
}

const DAY_MS = 86_400_000;
const toMs = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
const isIsoDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s) && !Number.isNaN(toMs(s));

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.floor((toMs(toIso) - toMs(fromIso)) / DAY_MS);
}

export function addDays(iso: string, days: number): string {
  return new Date(toMs(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

/** A country's own clock decides what "today" is (standing rule 9). */
const COUNTRY_TIME_ZONE: Record<string, string> = {
  KE: 'Africa/Nairobi', UG: 'Africa/Kampala', TZ: 'Africa/Dar_es_Salaam', RW: 'Africa/Kigali',
  NG: 'Africa/Lagos', GH: 'Africa/Accra', ZA: 'Africa/Johannesburg', ZM: 'Africa/Lusaka',
};

export function escalationToday(countryCode: string | undefined, now: Date = new Date()): string {
  return todayIso(now, COUNTRY_TIME_ZONE[(countryCode ?? 'KE').toUpperCase()] ?? 'Africa/Nairobi');
}

/** Level reached after `daysOverdue`, never above the rule's ceiling. */
export function escalationLevel(rule: EscalationRule, daysOverdue: number): EscalationLevel {
  const [l2, l3, l4] = rule.climbDays;
  const raw: EscalationLevel = daysOverdue >= l4 ? 4 : daysOverdue >= l3 ? 3 : daysOverdue >= l2 ? 2 : 1;
  return (raw > rule.maxLevel ? rule.maxLevel : raw) as EscalationLevel;
}

export interface EscalationLadder {
  responsible: CharterMember[];
  level2: CharterMember[];
  level3: CharterMember[];
}

/**
 * Who stands on each rung for a duty, from today's roster. Falls through so a
 * matter never lands on nobody: no Secretary → the Chairperson acts first; no
 * officials at all → every member.
 */
export function escalationLadder(members: readonly CharterMember[], duty: EscalationDuty): EscalationLadder {
  const by = (d: OfficialDesignation) => members.filter((m) => m.designation === d);
  const [lead, deputy] = DUTY_DESIGNATIONS[duty] as [OfficialDesignation, OfficialDesignation];
  const chair = by('Chairperson');
  const vice = by('Vice Chairperson');
  const allOfficials = members.filter((m) => OFFICIAL_SET.has(m.designation));

  let responsible = by(lead);
  if (responsible.length === 0) responsible = by(deputy);
  if (responsible.length === 0) responsible = chair.length ? chair : vice;
  if (responsible.length === 0) responsible = allOfficials;

  const ids = new Set(responsible.map((m) => m.id));
  // The senior of a duty: the Chairperson — or, for the Chairperson's own duty, the Vice Chairperson.
  let level2 = (duty === 'chair' ? vice : chair).filter((m) => !ids.has(m.id));
  if (level2.length === 0) level2 = chair.concat(vice).filter((m) => !ids.has(m.id));
  return { responsible, level2, level3: allOfficials };
}

export interface EscalationInput {
  charter: GroupCharter;
  meetings: readonly Meeting[];
  /** ISO date; defaults to today on the group's own country clock. */
  today?: string;
  /** ISO date the group was created; ages the set-up duties. Unknown → they stay at level 1. */
  groupCreated?: string;
}

const FREQUENCY_DAYS: Record<string, number> = { weekly: 7, fortnightly: 14, biweekly: 14, monthly: 31 };
const GRACE_DAYS = 3;
const STREAK = 3;

function names(list: CharterMember[]): string {
  return list.map((m) => m.fullName.trim()).filter(Boolean).join(', ');
}

/** Find every stalled duty in one group. Sorted: highest level first, then longest overdue. */
export function findEscalations(input: EscalationInput): EscalationFinding[] {
  const { charter } = input;
  const today = input.today ?? escalationToday(charter.countryCode);
  const members = charter.members ?? [];
  const meetings = [...input.meetings].filter((m) => isIsoDate(m.date)).sort((a, b) => a.date.localeCompare(b.date));
  const held = meetings.filter((m) => m.date <= today);
  const created = isIsoDate(input.groupCreated) ? input.groupCreated.slice(0, 10) : meetings[0]?.date;
  const out: EscalationFinding[] = [];

  const push = (
    ruleId: EscalationRuleId,
    subject: string,
    dueDate: string,
    text: Pick<EscalationFinding, 'title' | 'detail' | 'action'>,
  ) => {
    const rule = ESCALATION_RULES[ruleId];
    const daysOverdue = Math.max(0, daysBetween(dueDate, today));
    const level = escalationLevel(rule, daysOverdue);
    const ladder = escalationLadder(members, rule.duty);
    const audience = new Map<string, CharterMember>();
    for (const m of ladder.responsible) audience.set(m.id, m);
    if (level >= 2) for (const m of ladder.level2) audience.set(m.id, m);
    if (level >= 3) for (const m of ladder.level3) audience.set(m.id, m);
    // Nobody to tell (no officials named yet) → the whole group sees it.
    const everyone = level >= 4 || audience.size === 0;
    out.push({
      key: `${ruleId}:${subject}`,
      rule: ruleId,
      duty: rule.duty,
      level,
      dueDate,
      daysOverdue,
      audienceIds: [...audience.keys()],
      everyone,
      responsibleName: names(ladder.responsible) || DUTY_NAME[rule.duty].en,
      tab: rule.tab,
      ...text,
    });
  };

  // ── Set-up duties (Chairperson) ──────────────────────────────────────────
  if (members.length > 0) {
    const missing = (['Chairperson', 'Secretary', 'Treasurer'] as OfficialDesignation[]).filter(
      (d) => !members.some((m) => m.designation === d),
    );
    if (missing.length > 0) {
      const sw = missing.map((d) => (d === 'Chairperson' ? 'Mwenyekiti' : d === 'Secretary' ? 'Katibu' : 'Mweka hazina'));
      push('officials_missing', 'group', created ?? today, {
        title: { en: 'Name your officials', sw: 'Taja viongozi wenu' },
        detail: {
          en: `The group has no ${missing.join(', ')} on its list. Registration and bank forms ask for all three.`,
          sw: `Kikundi hakina ${sw.join(', ')} kwenye orodha. Fomu za usajili na za benki huhitaji wote watatu.`,
        },
        action: { en: 'Open the member list', sw: 'Fungua orodha ya wanachama' },
      });
    }
    if (!charter.constitution?.trim() && !charter.constitutionFileUrl) {
      push('rules_missing', 'group', created ?? today, {
        title: { en: 'Write down the group rules', sw: 'Andikeni sheria za kikundi' },
        detail: {
          en: 'The group has no written rules yet. Written rules settle arguments about money before they start.',
          sw: 'Kikundi bado hakina sheria zilizoandikwa. Sheria zilizoandikwa hutatua mabishano ya pesa kabla hayajaanza.',
        },
        action: { en: 'Add the rules', sw: 'Ongeza sheria' },
      });
    }
  }

  // ── Meetings (Secretary) ─────────────────────────────────────────────────
  const last = held[held.length - 1];
  const interval = FREQUENCY_DAYS[(charter.schedule?.frequency ?? '').trim().toLowerCase()];
  if (last && interval) {
    const expected = isIsoDate(last.nextMeetingDate) && last.nextMeetingDate > last.date
      ? last.nextMeetingDate.slice(0, 10)
      : addDays(last.date, interval);
    const due = addDays(expected, GRACE_DAYS);
    if (today > due) {
      push('meeting_overdue', expected, due, {
        title: { en: 'No meeting on record', sw: 'Hakuna mkutano uliorekodiwa' },
        detail: {
          en: `The meeting expected on ${fmt(expected)} has not been recorded. If the group met, write it down so every member can see it.`,
          sw: `Mkutano uliotarajiwa tarehe ${fmt(expected)} haujarekodiwa. Kama kikundi kilikutana, uandike ili kila mwanachama aone.`,
        },
        action: { en: 'Record the meeting', sw: 'Rekodi mkutano' },
      });
    }
  }

  for (const m of held) {
    if (m.status === 'DRAFT') {
      const due = addDays(m.date, GRACE_DAYS);
      if (today > due) {
        push('minutes_not_posted', m.id, due, {
          title: { en: `Meeting ${m.meetingNo} is not finished`, sw: `Mkutano wa ${m.meetingNo} haujakamilika` },
          detail: {
            en: `The record of the meeting held on ${fmt(m.date)} is still a draft. Members cannot rely on it until it is posted.`,
            sw: `Kumbukumbu za mkutano wa tarehe ${fmt(m.date)} bado ni rasimu. Wanachama hawawezi kuzitegemea hadi zikamilishwe.`,
          },
          action: { en: 'Finish and post it', sw: 'Kamilisha na uzichapishe' },
        });
      }
    }
    // ── Money at the table (Treasurer) ─────────────────────────────────────
    const present = m.attendance.filter((a) => a.status === 'present').length;
    if (present > 0 && (m.tableBanking?.contributions ?? []).length === 0) {
      const due = addDays(m.date, GRACE_DAYS);
      if (today > due) {
        push('contributions_not_recorded', m.id, due, {
          title: { en: `No contributions written for meeting ${m.meetingNo}`, sw: `Michango ya mkutano wa ${m.meetingNo} haijaandikwa` },
          detail: {
            en: `${present} members attended on ${fmt(m.date)} but no contribution is written down. Unwritten money is where doubt begins.`,
            sw: `Wanachama ${present} walihudhuria tarehe ${fmt(m.date)} lakini hakuna mchango ulioandikwa. Pesa isiyoandikwa ndiyo chanzo cha shaka.`,
          },
          action: { en: 'Write the contributions', sw: 'Andika michango' },
        });
      }
    }
  }

  // ── Members falling behind (kept among officials only) ───────────────────
  const recent = held.slice(-STREAK);
  if (recent.length === STREAK) {
    const lastDate = recent[STREAK - 1]!.date;
    const due = addDays(lastDate, GRACE_DAYS);
    if (today > due) {
      const anyMoney = recent.every((m) => (m.tableBanking?.contributions ?? []).length > 0);
      for (const person of members) {
        const onAll = recent.every((m) => m.attendance.some((a) => a.memberId === person.id));
        if (!onAll) continue;
        const name = person.fullName.trim() || 'A member';
        if (anyMoney && recent.every((m) => !m.tableBanking.contributions.some((c) => c.memberId === person.id && c.amountCents > 0))) {
          push('member_behind', person.id, due, {
            title: { en: `${name} has missed ${STREAK} contributions`, sw: `${name} amekosa michango ${STREAK}` },
            detail: {
              en: `No contribution from ${name} in the last ${STREAK} meetings. Talk early — small arrears are easy to clear, large ones break groups.`,
              sw: `Hakuna mchango kutoka kwa ${name} katika mikutano ${STREAK} iliyopita. Zungumzeni mapema — deni dogo ni rahisi kulipa, kubwa huvunja vikundi.`,
            },
            action: { en: 'See the statement', sw: 'Tazama taarifa' },
          });
        }
        if (recent.every((m) => m.attendance.some((a) => a.memberId === person.id && a.status === 'absent'))) {
          push('member_absent', person.id, due, {
            title: { en: `${name} has missed ${STREAK} meetings`, sw: `${name} amekosa mikutano ${STREAK}` },
            detail: {
              en: `${name} was absent without apology from the last ${STREAK} meetings. Check what your rules say and reach out.`,
              sw: `${name} hakuhudhuria mikutano ${STREAK} iliyopita bila udhuru. Angalieni sheria zenu zinasemaje na mumtafute.`,
            },
            action: { en: 'See the meetings', sw: 'Tazama mikutano' },
          });
        }
      }
    }
  }

  return out.sort((a, b) => b.level - a.level || b.daysOverdue - a.daysOverdue || a.key.localeCompare(b.key));
}

/** dd/mm/yy (owner date rule). */
function fmt(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;
}

export interface EscalationViewer {
  /** The viewer's row in the member list, if they are on it. */
  memberId?: string | null;
  /** Platform owner / support: sees everything, to help a group. */
  overseer?: boolean;
}

/**
 * Least privilege, decided on the server: a viewer gets only their own duties
 * and the matters that have climbed to them.
 */
export function visibleEscalations(findings: readonly EscalationFinding[], viewer: EscalationViewer): EscalationFinding[] {
  if (viewer.overseer) return [...findings];
  return findings.filter((f) => f.everyone || (!!viewer.memberId && f.audienceIds.includes(viewer.memberId)));
}

/** Match a signed-in phone to a row in the member list (last 9 digits). */
export function memberIdForPhone(members: readonly CharterMember[], phone: string | null | undefined): string | null {
  const key = (phone ?? '').replace(/\D/g, '').replace(/^0+/, '').slice(-9);
  if (key.length !== 9) return null;
  return members.find((m) => m.phone.replace(/\D/g, '').replace(/^0+/, '').slice(-9) === key)?.id ?? null;
}

export interface EscalationSummary {
  total: number;
  /** Matters where this viewer is the one who acts first. */
  mine: number;
  /** Matters raised to this viewer because nobody acted. */
  raised: number;
  highest: EscalationLevel | 0;
}

export function summariseEscalations(findings: readonly EscalationFinding[], viewerMemberId?: string | null): EscalationSummary {
  let raised = 0;
  let highest: EscalationLevel | 0 = 0;
  for (const f of findings) {
    if (f.level > 1) raised += 1;
    if (f.level > highest) highest = f.level;
  }
  return { total: findings.length, mine: viewerMemberId ? findings.filter((f) => f.level === 1 && f.audienceIds.includes(viewerMemberId)).length : 0, raised, highest };
}
