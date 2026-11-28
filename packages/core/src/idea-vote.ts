/**
 * The group votes on its shortlisted business ideas (owner 28/11/26).
 *
 * An official (chairperson, secretary or treasurer) puts the 2–3 researched
 * ideas to the vote. Every member who has not left gets one vote, and can
 * change it until the choice is confirmed. The chairperson or secretary then
 * confirms the group's choice: usually the leader, but the group may agree
 * otherwise at a meeting, and the page says so. Pure rules; enforced on the
 * server.
 */

export const PRESENT_IDEA_ROLES = ['CHAIRMAN', 'SECRETARY', 'TREASURER'] as const;
export const CONFIRM_IDEA_ROLES = ['CHAIRMAN', 'SECRETARY'] as const;

export const canPresentIdeas = (role: string | null | undefined) => !!role && (PRESENT_IDEA_ROLES as readonly string[]).includes(role);
export const canConfirmIdea = (role: string | null | undefined) => !!role && (CONFIRM_IDEA_ROLES as readonly string[]).includes(role);

export interface IdeaVoteRow {
  membershipId: string;
  title: string;
}

export interface IdeaTally {
  rows: { title: string; votes: number; pct: number }[];
  voted: number;
  memberCount: number;
  /** Share of members who voted, 0–100. */
  turnoutPct: number;
  /** The idea with the most votes; null when nobody voted or it is a tie. */
  leader: string | null;
  tie: boolean;
  /** The leader has more than half of the votes cast. */
  majority: boolean;
  /** More than half of the members have voted. */
  quorum: boolean;
}

/** Count one vote per member (the latest row wins), only for ideas on the list. */
export function ideaTally(titles: string[], votes: IdeaVoteRow[], memberCount: number): IdeaTally {
  const mine = new Map<string, string>();
  for (const v of votes) if (titles.includes(v.title)) mine.set(v.membershipId, v.title);
  const voted = mine.size;
  const count = new Map(titles.map((t) => [t, 0]));
  for (const t of mine.values()) count.set(t, (count.get(t) ?? 0) + 1);
  const rows = titles.map((title) => ({ title, votes: count.get(title) ?? 0, pct: voted ? Math.round(((count.get(title) ?? 0) / voted) * 100) : 0 }));
  const top = Math.max(0, ...rows.map((r) => r.votes));
  const leaders = rows.filter((r) => r.votes === top && top > 0);
  const members = Math.max(memberCount, voted);
  return {
    rows,
    voted,
    memberCount: members,
    turnoutPct: members ? Math.round((voted / members) * 100) : 0,
    leader: leaders.length === 1 ? leaders[0]!.title : null,
    tie: leaders.length > 1,
    majority: leaders.length === 1 && top * 2 > voted,
    quorum: voted * 2 > members,
  };
}

/** Why a vote cannot be cast, or null. */
export function castVoteProblem(input: { open: boolean; title: string; titles: string[]; isMember: boolean }): string | null {
  if (!input.isMember) return 'Only members of this group can vote.';
  if (!input.open) return 'This vote is closed.';
  if (!input.titles.includes(input.title)) return 'That idea is not on this list.';
  return null;
}

/** Why the choice cannot be confirmed, or null. */
export function confirmIdeaProblem(input: { role: string | null; open: boolean; title: string; titles: string[] }): string | null {
  if (!canConfirmIdea(input.role)) return 'Only the chairperson or the secretary confirms the group’s choice.';
  if (!input.open) return 'This choice is already confirmed.';
  if (!input.titles.includes(input.title)) return 'That idea is not on this list.';
  return null;
}

/** Plain words on the confirm button's card, so nobody is surprised. */
export function confirmNote(t: IdeaTally, title: string): string {
  if (t.voted === 0) return 'Nobody has voted yet. Confirm only if the group agreed at a meeting.';
  if (t.leader !== title) return 'This is not the idea with the most votes. Confirm only if the group agreed at a meeting, and write the reasons in the minutes.';
  if (!t.quorum) return `Only ${t.voted} of ${t.memberCount} members have voted. Wait for more votes, or confirm if the meeting agreed.`;
  if (!t.majority) return 'It leads, but has less than half of the votes cast.';
  return `${t.rows.find((r) => r.title === title)?.votes ?? 0} of ${t.voted} votes. The group has spoken.`;
}
