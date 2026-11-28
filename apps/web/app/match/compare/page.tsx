import { compareIdeas, ideasFromParams, pickAllowedId } from '@stawi/core';
import { BackLink } from '@/components/BackLink';
import { getMyGroups } from '@/lib/data';
import { ideaResearchEnabled } from '@/lib/idea-research-ai';
import { CompareIdeas } from './CompareIdeas';

export const dynamic = 'force-dynamic';

/**
 * Research and compare the shortlist (owner 28/11/26). The ideas travel in the
 * link (?i=title|startup|margin|risk|industry), so a member can send the same
 * page to the whole group on WhatsApp and everyone sees the same comparison.
 */
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ i?: string | string[]; cap?: string; group?: string }> }) {
  const sp = await searchParams;
  const params = Array.isArray(sp.i) ? sp.i : sp.i ? [sp.i] : [];
  const ideas = ideasFromParams(params);
  const groups = await getMyGroups().catch(() => []);
  const groupId = pickAllowedId(sp.group, groups.map((g) => g.id)) ?? null;
  const active = groups.find((g) => g.id === groupId);
  // The group's real savings when the viewer is in it; otherwise the amount in the link.
  const linkCap = Number(sp.cap);
  const capitalCents = active
    ? active.members.reduce((t, m) => t + m.totalCents, 0)
    : Number.isSafeInteger(linkCap) && linkCap > 0 && linkCap < 1e13 ? linkCap : 0;
  const comparison = compareIdeas(ideas, capitalCents);
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
      />
    </main>
  );
}
