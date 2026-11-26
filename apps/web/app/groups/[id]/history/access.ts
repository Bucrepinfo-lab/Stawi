/** Whose history this caller may see: their own; an official may pick any member of the group. */
export async function historyFor(groupId: string, requested: string | null | undefined): Promise<{ ids: string[]; official: boolean } | null> {
  const { myMembershipIds, myGroupRole, RECORD_EDITOR_ROLES } = await import('@/lib/group-access');
  const [mine, role] = await Promise.all([myMembershipIds(groupId), myGroupRole(groupId)]);
  if (mine.length === 0) return null;
  const official = !!role && RECORD_EDITOR_ROLES.has(role);
  if (requested && !mine.includes(requested)) {
    if (!official) return { ids: mine, official };
    const { prisma } = await import('@stawi/db');
    const m = await prisma.membership.findFirst({ where: { id: requested, groupId }, select: { id: true } });
    return m ? { ids: [m.id], official } : { ids: mine, official };
  }
  return { ids: requested ? [requested] : mine, official };
}
