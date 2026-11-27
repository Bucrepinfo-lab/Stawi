/**
 * Who may write the minutes (owner 27/11/26): the secretary only, so nobody can
 * add something the meeting did not deliberate. When the secretary is away the
 * chair (or the secretary) names a stand-in for a few days, like a lesson cover
 * in a school; the stand-in writes until then. A group with no secretary at all
 * lets the chair write, so small groups are never locked out.
 * Pure rules; the server applies them on every save and post.
 */

export type MinutesRole = 'CHAIRMAN' | 'SECRETARY' | 'TREASURER' | 'SIGNATORY' | 'MEMBER';

export interface StandIn {
  membershipId: string;
  until: Date | string;
  endedAt?: Date | string | null;
}

export const STAND_IN_MAX_DAYS = 30;

export const MINUTES_ONLY_SECRETARY = {
  en: 'Only the secretary writes the minutes. If the secretary is away, the chair can name a stand-in.',
  sw: 'Katibu pekee ndiye huandika kumbukumbu. Katibu asipokuwepo, mwenyekiti anaweza kumteua mwakilishi.',
} as const;

/** The stand-in in force at `now`, if any (the latest one wins). */
export function activeStandIn<T extends StandIn>(list: T[], now: Date): T | null {
  const live = list.filter((s) => !s.endedAt && new Date(s.until).getTime() > now.getTime());
  return live.sort((a, b) => new Date(b.until).getTime() - new Date(a.until).getTime())[0] ?? null;
}

export function canWriteMinutes(input: {
  role: MinutesRole | null;
  myMembershipIds: string[];
  groupHasSecretary: boolean;
  standIns: StandIn[];
  now: Date;
}): boolean {
  if (!input.role) return false;
  if (input.role === 'SECRETARY') return true;
  const standIn = activeStandIn(input.standIns, input.now);
  if (standIn && input.myMembershipIds.includes(standIn.membershipId)) return true;
  if (!input.groupHasSecretary && input.role === 'CHAIRMAN') return true;
  return false;
}

/** Why naming this stand-in is refused, or null. Only the chair or the secretary may name one. */
export function standInProblem(input: {
  appointerRole: MinutesRole | null;
  membershipId: string;
  memberIds: string[];
  days: number;
}): string | null {
  if (input.appointerRole !== 'CHAIRMAN' && input.appointerRole !== 'SECRETARY') {
    return 'Only the chair or the secretary can name a stand-in for the minutes.';
  }
  if (!input.memberIds.includes(input.membershipId)) return 'Choose a member of this group.';
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > STAND_IN_MAX_DAYS) {
    return `Choose between 1 and ${STAND_IN_MAX_DAYS} days.`;
  }
  return null;
}
