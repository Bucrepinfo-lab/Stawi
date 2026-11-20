/**
 * Daily alerts for stalled work (owner approved 20/11/26).
 *
 * Once a day the stalled duties of every group are worked out and the people
 * they concern are told by SMS — once per matter, per person, per level, never
 * again. It is an alert about the person's own duty, not promotion.
 *
 * Kept small on purpose:
 *   - only the officials are sent an SMS; a matter that has reached every
 *     member (level 4) is shown to members in the app, not sent to all phones;
 *   - a matter about one member never puts that member's name in an SMS;
 *   - a run is capped, so a first day can never send a flood.
 *
 * Pure: decides who should be told what. Sending and remembering are the
 * caller's job.
 */

import type { CharterMember } from './charter';
import type { EscalationFinding, EscalationRuleId } from './escalation';
import { escalationLadder, ESCALATION_RULES } from './escalation';

export interface AttentionNoticePlan {
  /** The matter (finding key). */
  key: string;
  level: number;
  /** The member (row in the member list) to tell. */
  memberId: string;
  phone: string;
  text: string;
}

/** The most SMS one daily run may send across all groups. */
export const ATTENTION_SMS_CAP = 150;

/** Titles that name nobody, for matters about one member. */
const NAMELESS: Partial<Record<EscalationRuleId, { en: string; sw: string }>> = {
  member_behind: { en: 'A member has missed 3 contributions', sw: 'Mwanachama amekosa michango 3' },
  member_absent: { en: 'A member has missed 3 meetings', sw: 'Mwanachama amekosa mikutano 3' },
};

/** Stable id for "this matter, at this level, told to this person". */
export function attentionNoticeId(key: string, level: number, memberId: string): string {
  return `${key}|${level}|${memberId}`;
}

/** One SMS: Kiswahili and English, the group's name, no member's name. Fits one message where it can. */
export function attentionSmsText(groupName: string, f: Pick<EscalationFinding, 'rule' | 'title' | 'level'>): string {
  const t = NAMELESS[f.rule] ?? f.title;
  const name = groupName.trim().slice(0, 28) || 'Stawi';
  const raised = f.level > 1 ? ' (haijashughulikiwa / not yet done)' : '';
  return `Stawi, ${name}: ${t.sw}. ${t.en}${raised}. Fungua Stawi / Open Stawi.`.slice(0, 300);
}

/**
 * Who to tell today. `alreadyTold` holds the ids (attentionNoticeId) of
 * notices sent on earlier days.
 */
export function planAttentionNotices(input: {
  groupName: string;
  members: readonly CharterMember[];
  findings: readonly EscalationFinding[];
  alreadyTold: ReadonlySet<string>;
}): AttentionNoticePlan[] {
  const byId = new Map(input.members.map((m) => [m.id, m]));
  const out: AttentionNoticePlan[] = [];
  const seen = new Set<string>();
  for (const f of input.findings) {
    // Officials only: the ladder's people up to the level reached (never beyond level 3).
    const ladder = escalationLadder(input.members, ESCALATION_RULES[f.rule].duty);
    const people = new Map<string, CharterMember>();
    for (const m of ladder.responsible) people.set(m.id, m);
    if (f.level >= 2) for (const m of ladder.level2) people.set(m.id, m);
    if (f.level >= 3) for (const m of ladder.level3) people.set(m.id, m);
    const level = Math.min(f.level, 3);
    for (const person of people.values()) {
      const member = byId.get(person.id);
      const phone = (member?.phone ?? '').trim();
      if (!member || phone.replace(/\D/g, '').length < 9) continue;
      const id = attentionNoticeId(f.key, level, member.id);
      if (input.alreadyTold.has(id) || seen.has(id)) continue;
      seen.add(id);
      out.push({ key: f.key, level, memberId: member.id, phone, text: attentionSmsText(input.groupName, f) });
    }
  }
  return out;
}
