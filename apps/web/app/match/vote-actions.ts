'use server';

/**
 * The group votes on its shortlist (owner 28/11/26). Officials put the ideas
 * to the vote, every member votes once (and may change it), the chairperson or
 * secretary confirms the choice. Every rule is checked here on the server.
 * Members get an in-app alert (no SMS). No money moves.
 */
import { revalidatePath } from 'next/cache';

type Result = { ok: true; id?: string } | { ok: false; error: string };

async function ctx(groupId: string) {
  const { myGroupRole, myMembershipIds } = await import('@/lib/group-access');
  const { getUserId } = await import('@/lib/auth');
  const [role, mine, userId] = await Promise.all([myGroupRole(groupId), myMembershipIds(groupId), getUserId()]);
  return { role, membershipId: mine[0] ?? null, userId };
}

export async function presentIdeasForVoteAction(groupId: string, params: string[], capitalCents: number): Promise<Result> {
  if (!process.env.DATABASE_URL) return { ok: false, error: 'Voting opens when your group’s live records are connected.' };
  const { canPresentIdeas, ideasFromParams, ideaToParam } = await import('@stawi/core');
  const { role, membershipId, userId } = await ctx(String(groupId));
  if (!membershipId) return { ok: false, error: 'Only members of this group can do this.' };
  if (!canPresentIdeas(role)) return { ok: false, error: 'Only the chairperson, secretary or treasurer can open a vote.' };
  const ideas = ideasFromParams(Array.isArray(params) ? params.map(String) : []);
  if (ideas.length < 2) return { ok: false, error: 'Save at least two ideas to put to the vote.' };
  const cap = Number.isSafeInteger(capitalCents) && capitalCents > 0 && capitalCents < 1e13 ? capitalCents : 0;
  const { prisma } = await import('@stawi/db');
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
  if (!group) return { ok: false, error: 'Group not found.' };
  // One open vote at a time: a new list replaces any open one that has no choice yet.
  const created = await prisma.$transaction(async (tx) => {
    await tx.ideaShortlist.updateMany({ where: { groupId, closedAt: null }, data: { closedAt: new Date() } });
    return tx.ideaShortlist.create({ data: { groupId, ideas: ideas.map(ideaToParam), capitalCents: cap, createdByMembershipId: membershipId }, select: { id: true } });
  });
  const { alertGroupMembers } = await import('@/lib/group-alerts');
  void alertGroupMembers(groupId, {
    title: `${group.name}: vote on our business`,
    body: `${ideas.map((i) => i.title).join(', ')}. Read why each one ranks where it does, then tap your choice.`,
    url: `/match/compare?vote=${created.id}&group=${groupId}`,
    tag: `idea-vote-${groupId}`,
  }, userId);
  revalidatePath('/match');
  return { ok: true, id: created.id };
}

async function loadOpen(shortlistId: string) {
  const { prisma } = await import('@stawi/db');
  return prisma.ideaShortlist.findUnique({ where: { id: String(shortlistId) }, select: { id: true, groupId: true, ideas: true, closedAt: true, chosenTitle: true } });
}

export async function castIdeaVoteAction(shortlistId: string, title: string): Promise<Result> {
  if (!process.env.DATABASE_URL) return { ok: false, error: 'Voting opens when your group’s live records are connected.' };
  const list = await loadOpen(shortlistId);
  if (!list) return { ok: false, error: 'This vote was not found.' };
  const { castVoteProblem, ideasFromParams } = await import('@stawi/core');
  const { membershipId } = await ctx(list.groupId);
  const titles = ideasFromParams((list.ideas as string[]) ?? []).map((i) => i.title);
  const problem = castVoteProblem({ open: !list.closedAt, title: String(title), titles, isMember: !!membershipId });
  if (problem) return { ok: false, error: problem };
  const { prisma } = await import('@stawi/db');
  await prisma.ideaVote.upsert({
    where: { shortlistId_membershipId: { shortlistId: list.id, membershipId: membershipId! } },
    create: { shortlistId: list.id, groupId: list.groupId, membershipId: membershipId!, title: String(title) },
    update: { title: String(title) },
  });
  revalidatePath('/match/compare');
  return { ok: true };
}

export async function confirmIdeaChoiceAction(shortlistId: string, title: string): Promise<Result> {
  if (!process.env.DATABASE_URL) return { ok: false, error: 'Voting opens when your group’s live records are connected.' };
  const list = await loadOpen(shortlistId);
  if (!list) return { ok: false, error: 'This vote was not found.' };
  const { confirmIdeaProblem, ideasFromParams } = await import('@stawi/core');
  const { role, membershipId, userId } = await ctx(list.groupId);
  if (!membershipId) return { ok: false, error: 'Only members of this group can do this.' };
  const titles = ideasFromParams((list.ideas as string[]) ?? []).map((i) => i.title);
  const problem = confirmIdeaProblem({ role, open: !list.closedAt, title: String(title), titles });
  if (problem) return { ok: false, error: problem };
  const { prisma } = await import('@stawi/db');
  // Only the still-open row changes, so two officials tapping at once cannot both confirm.
  const done = await prisma.ideaShortlist.updateMany({
    where: { id: list.id, closedAt: null },
    data: { chosenTitle: String(title), chosenAt: new Date(), chosenByMembershipId: membershipId, closedAt: new Date() },
  });
  if (done.count === 0) return { ok: false, error: 'This choice is already confirmed.' };
  const group = await prisma.group.findUnique({ where: { id: list.groupId }, select: { name: true } });
  const { alertGroupMembers } = await import('@/lib/group-alerts');
  void alertGroupMembers(list.groupId, {
    title: `${group?.name ?? 'Your group'} chose ${String(title)}`,
    body: 'Next: checks on the ground, the papers, and the funding proposal. See the steps.',
    url: `/match/compare?vote=${list.id}&group=${list.groupId}`,
    tag: `idea-vote-${list.groupId}`,
  }, userId);
  revalidatePath('/match/compare');
  return { ok: true };
}

export async function closeIdeaVoteAction(shortlistId: string): Promise<Result> {
  if (!process.env.DATABASE_URL) return { ok: false, error: 'Voting opens when your group’s live records are connected.' };
  const list = await loadOpen(shortlistId);
  if (!list) return { ok: false, error: 'This vote was not found.' };
  const { closeVoteProblem } = await import('@stawi/core');
  const { role, membershipId, userId } = await ctx(list.groupId);
  if (!membershipId) return { ok: false, error: 'Only members of this group can do this.' };
  const problem = closeVoteProblem({ role, open: !list.closedAt });
  if (problem) return { ok: false, error: problem };
  const { prisma } = await import('@stawi/db');
  // Votes cast stay in the record; only the list is closed, with no choice.
  const done = await prisma.ideaShortlist.updateMany({ where: { id: list.id, closedAt: null }, data: { closedAt: new Date() } });
  if (done.count === 0) return { ok: false, error: 'This vote is already closed.' };
  const group = await prisma.group.findUnique({ where: { id: list.groupId }, select: { name: true } });
  const { alertGroupMembers } = await import('@/lib/group-alerts');
  void alertGroupMembers(list.groupId, {
    title: `${group?.name ?? 'Your group'}: the business vote was closed`,
    body: 'It closed without a choice. An official can open a new vote when the group is ready.',
    url: `/match?group=${list.groupId}`,
    tag: `idea-vote-${list.groupId}`,
  }, userId);
  revalidatePath('/match');
  revalidatePath('/match/compare');
  return { ok: true };
}
