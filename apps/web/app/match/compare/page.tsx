import { canConfirmIdea, canPresentIdeas, compareIdeas, ideaTally, ideasFromParams, pickAllowedId } from '@stawi/core';
import { BackLink } from '@/components/BackLink';
import { getMyGroups } from '@/lib/data';
import { ideaResearchEnabled } from '@/lib/idea-research-ai';
import { CompareIdeas, type VoteView } from './CompareIdeas';

export const dynamic = 'force-dynamic';

/**
 * Research and compare the shortlist (owner 28/11/26). The ideas travel in the
 * link (?i=title|startup|margin|risk|industry), so a member can send the same
 * page on WhatsApp. With ?vote=<id> the ideas come from the group's vote
 * instead, and members vote here (members of that group only).
 */
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ i?: string | string[]; cap?: string; group?: string; vote?: string }> }) {
  const sp = await searchParams;
  const groups = await getMyGroups().catch(() => []);
  let groupId = pickAllowedId(sp.group, groups.map((g) => g.id)) ?? null;
  let params = Array.isArray(sp.i) ? sp.i : sp.i ? [sp.i] : [];
  let linkCap = Number(sp.cap);
  let vote: VoteView | null = null;
  let openVoteId: string | null = null;

  if (process.env.DATABASE_URL && (sp.vote || groupId)) {
    const { prisma } = await import('@stawi/db');
    const { myGroupRole, myMembershipIds } = await import('@/lib/group-access');
    const list = sp.vote
      ? await prisma.ideaShortlist.findUnique({ where: { id: String(sp.vote) }, include: { votes: { select: { membershipId: true, title: true } } } })
      : null;
    if (list && groups.some((g) => g.id === list.groupId)) {
      groupId = list.groupId;
      params = (list.ideas as string[]) ?? [];
      linkCap = list.capitalCents;
      const [role, mine, memberCount, chosenBy] = await Promise.all([
        myGroupRole(list.groupId),
        myMembershipIds(list.groupId),
        prisma.membership.count({ where: { groupId: list.groupId, leftAt: null } }),
        list.chosenByMembershipId ? prisma.membership.findUnique({ where: { id: list.chosenByMembershipId }, select: { fullName: true, role: true } }) : null,
      ]);
      const titles = ideasFromParams(params).map((i) => i.title);
      vote = {
        id: list.id,
        open: !list.closedAt,
        chosenTitle: list.chosenTitle,
        chosenOn: list.chosenAt ? list.chosenAt.toISOString().slice(0, 10) : null,
        chosenBy: chosenBy ? chosenBy.fullName : null,
        replaced: !!list.closedAt && !list.chosenTitle,
        tally: ideaTally(titles, list.votes, memberCount),
        myTitle: list.votes.find((v) => mine.includes(v.membershipId))?.title ?? null,
        canConfirm: canConfirmIdea(role),
      };
    } else if (groupId) {
      const open = await prisma.ideaShortlist.findFirst({ where: { groupId, closedAt: null }, orderBy: { createdAt: 'desc' }, select: { id: true } });
      openVoteId = open?.id ?? null;
    }
  }

  const ideas = ideasFromParams(params);
  const active = groups.find((g) => g.id === groupId);
  // The group's real savings when the viewer is in it; otherwise the amount in the link.
  const capitalCents = active
    ? active.members.reduce((t, m) => t + m.totalCents, 0)
    : Number.isSafeInteger(linkCap) && linkCap > 0 && linkCap < 1e13 ? linkCap : 0;
  const comparison = compareIdeas(ideas, capitalCents);
  let canPresent = false;
  if (groupId && !vote && process.env.DATABASE_URL) {
    const { myGroupRole } = await import('@/lib/group-access');
    canPresent = canPresentIdeas(await myGroupRole(groupId));
  }
  return (
    <main className="pillar-2" style={{ maxWidth: 920, margin: '0 auto', padding: '28px max(16px, 3vw) 80px' }}>
      <BackLink fallback={`/match${groupId ? `?group=${encodeURIComponent(groupId)}` : ''}`} />
      <CompareIdeas
        comparison={comparison}
        params={ideas.map((v) => [v.title, v.startupCents, v.marginPct, v.risk, v.industry].join('|'))}
        capitalCents={capitalCents}
        groupId={groupId}
        groupName={active?.name ?? null}
        webResearch={ideaResearchEnabled()}
        vote={vote}
        canPresent={canPresent}
        openVoteId={openVoteId}
      />
    </main>
  );
}
