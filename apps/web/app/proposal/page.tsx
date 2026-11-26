import { getMyGroups } from '@/lib/data';
import { BackLink } from '@/components/BackLink';
import { ProposalClient } from './ProposalClient';

export const dynamic = 'force-dynamic';

/**
 * "Write the proposal for me" (owner 26/11/26): from the business the group
 * chose in Business Matching (or typed here), its own savings and a few
 * answers, Stawi writes a complete, formal funding proposal for a bank, SACCO
 * or fund — budget, repayment plan, risks and signature included.
 */
export default async function ProposalPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const groups = (await getMyGroups().catch(() => [])).filter((g) => ['Chairman', 'Secretary', 'Treasurer'].includes(g.myRole));
  const startCents = Number(q.startup);
  return (
    <main className="pillar-2" style={{ maxWidth: 820, margin: '0 auto', padding: '24px 18px 110px' }}>
      <BackLink fallback="/match" />
      <p className="hist-kicker no-print">Write the proposal for me</p>
      <h1 className="display no-print" style={{ fontWeight: 600, fontSize: 30, marginTop: 6 }}>A funding proposal, ready to present</h1>
      <p className="no-print" style={{ color: 'var(--ink-2)', marginTop: 6 }}>
        Stawi takes your group&rsquo;s own records &mdash; members, officials and every shilling saved &mdash; and the business you chose, and writes the full proposal: summary, budget, repayment plan, risks and signatures. Download it as a PDF or Word file and present it to a bank, SACCO or fund.
      </p>
      {groups.length === 0 ? (
        <p className="mr-empty" style={{ marginTop: 18 }}>Only a group&rsquo;s Chairperson, Secretary or Treasurer can write its funding proposal.</p>
      ) : (
        <ProposalClient
          groups={groups.map((g) => ({ id: g.id, name: g.name, savedCents: g.members.reduce((s, m) => s + m.totalCents, 0) }))}
          initialGroup={groups.some((g) => g.id === q.group) ? q.group! : groups[0]!.id}
          business={{
            title: q.title ?? '',
            industry: q.industry ?? 'services',
            description: q.desc ?? '',
            startupCents: Number.isFinite(startCents) && startCents > 0 ? startCents : 0,
            marginPct: Number(q.margin) || 25,
            risk: q.risk ?? 'Moderate',
          }}
          fromMatch={!!q.title}
        />
      )}
    </main>
  );
}
