'use server';

/**
 * "Write the proposal for me" (owner 26/11/26). Officials only. Builds the
 * whole funding proposal from the group's own records (members, officials,
 * every confirmed contribution) plus the business chosen in Business Matching
 * and a few answers. With ANTHROPIC_API_KEY set, Claude polishes the wording;
 * it is kept only if every heading and every KES figure survives unchanged.
 * Nothing is sent to any lender; the group downloads and presents it.
 */
import type { Industry, ProposalInput, ProposalSection } from '@stawi/core';

export interface ProposalAsk {
  groupId: string;
  business: { title: string; industry: string; description: string; startupCents: number; marginPct: number; risk: string };
  ownContributionCents: number;
  lender: string;
  purpose: string;
  months: number;
  annualRatePct: number;
  expectedMonthlySalesCents: number | null;
  security: string;
  confirmTrue: boolean;
}

export type ProposalResult =
  | { ok: false; error: string }
  | {
      ok: true;
      title: string;
      groupName: string;
      registeredNumber: string | null;
      date: string;
      sections: ProposalSection[];
      polished: boolean;
      signedBy: { name: string; post: string };
      otherSigners: { post: string; name: string }[];
      totals: { totalCents: number; ownCents: number; loanCents: number; instalmentCents: number };
    };

const POSTS: Record<string, string> = { CHAIRMAN: 'Chairperson', SECRETARY: 'Secretary', TREASURER: 'Treasurer' };
const INDUSTRIES = new Set(['agri', 'retail', 'services', 'manufacturing', 'digital', 'transport']);

export async function writeProposalAction(ask: ProposalAsk): Promise<ProposalResult> {
  if (!process.env.DATABASE_URL) return { ok: false, error: 'Proposals are written from your live group records.' };
  if (!ask.confirmTrue) return { ok: false, error: 'Tick to confirm the details are true before Stawi signs it in your name.' };
  const { myGroupRole, myMembershipIds, RECORD_EDITOR_ROLES } = await import('@/lib/group-access');
  const role = await myGroupRole(ask.groupId);
  if (!role || !RECORD_EDITOR_ROLES.has(role)) return { ok: false, error: 'Only the Chairperson, Secretary or Treasurer can write the group’s funding proposal.' };
  const { prisma } = await import('@stawi/db');
  const { getUserId } = await import('@/lib/auth');
  const { assertClean, proposalProblem, proposalNumbers, proposalSections, proposalPrompt, parsePolished } = await import('@stawi/core');
  for (const t of [ask.business.title, ask.business.description, ask.lender, ask.purpose, ask.security]) {
    try { assertClean(t); } catch { return { ok: false, error: 'Please keep the wording respectful.' }; }
  }

  const [group, mine, contributions] = await Promise.all([
    prisma.group.findUnique({ where: { id: ask.groupId }, select: { name: true, countryCode: true, charter: { select: { registeredNumber: true, mission: true, vision: true, motto: true, schedule: true, members: true } }, members: { select: { id: true, fullName: true, role: true } } } }),
    myMembershipIds(ask.groupId),
    prisma.contribution.findMany({ where: { groupId: ask.groupId, status: 'CONFIRMED' }, select: { amountCents: true, membershipId: true, createdAt: true }, orderBy: { createdAt: 'asc' } }),
  ]);
  if (!group) return { ok: false, error: 'Group not found.' };
  const charter = (group.charter ?? null) as unknown as { registeredNumber?: string | null; mission?: string; vision?: string; motto?: string; schedule?: { venue?: string; days?: string[] }; members?: { fullName: string; designation: string }[] } | null;

  const p = (n: number) => String(n).padStart(2, '0');
  const dmy = (d: Date) => `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
  const total = contributions.reduce((s, c) => s + c.amountCents, 0);
  const first = contributions[0]?.createdAt ?? null;
  const last = contributions[contributions.length - 1]?.createdAt ?? null;
  const months = first && last ? Math.max(1, Math.round((last.getTime() - first.getTime()) / (30.44 * 86_400_000)) + 1) : 0;
  const contributors = new Set(contributions.filter((c) => c.amountCents > 0).map((c) => c.membershipId)).size;

  // Officials: from the charter roster if written, else from the members' roles.
  const officials = (charter?.members ?? []).filter((m) => ['Chairperson', 'Secretary', 'Treasurer'].includes(m.designation)).map((m) => ({ post: m.designation, name: m.fullName }));
  const fromRoles = group.members.filter((m) => POSTS[m.role]).map((m) => ({ post: POSTS[m.role]!, name: m.fullName }));
  const offs = officials.length ? officials : fromRoles;
  const me = group.members.find((m) => mine.includes(m.id) && POSTS[m.role]) ?? group.members.find((m) => mine.includes(m.id));
  const myName = me?.fullName && me.fullName !== 'Group founder' ? me.fullName : (offs.find((o) => o.post === POSTS[role]!)?.name ?? '');
  if (!myName) return { ok: false, error: 'Add your name first (My profile), so the proposal can be signed in your name.' };

  const input: ProposalInput = {
    group: { name: group.name, registeredNumber: charter?.registeredNumber ?? null, country: group.countryCode, venue: charter?.schedule?.venue ?? null, meetingDays: charter?.schedule?.days ?? [], mission: charter?.mission || null, vision: charter?.vision || null, motto: charter?.motto || null },
    members: { count: group.members.length, officials: offs },
    savings: { totalCents: total, contributors, firstDate: first ? dmy(first) : null, lastDate: last ? dmy(last) : null, months },
    business: {
      title: ask.business.title.trim().slice(0, 80),
      industry: (INDUSTRIES.has(ask.business.industry) ? ask.business.industry : 'services') as Industry,
      description: ask.business.description.trim().slice(0, 300) || 'A business chosen by the members.',
      startupCents: Math.round(ask.business.startupCents),
      marginPct: Math.max(0, Math.min(90, Math.round(ask.business.marginPct))),
      risk: (['Low', 'Moderate', 'Higher'].includes(ask.business.risk) ? ask.business.risk : 'Moderate') as 'Low' | 'Moderate' | 'Higher',
    },
    ask: {
      ownContributionCents: Math.round(ask.ownContributionCents),
      lender: ask.lender.trim().slice(0, 80) || 'the lender',
      purpose: ask.purpose.trim().slice(0, 400),
      months: Math.round(ask.months),
      annualRatePct: ask.annualRatePct,
      expectedMonthlySalesCents: ask.expectedMonthlySalesCents && ask.expectedMonthlySalesCents > 0 ? Math.round(ask.expectedMonthlySalesCents) : null,
      security: ask.security.trim().slice(0, 200),
    },
    preparedBy: { name: myName, post: POSTS[role] ?? 'Official' },
    date: dmy(new Date()),
  };
  const problem = proposalProblem(input);
  if (problem) return { ok: false, error: problem };
  const n = proposalNumbers(input);
  let sections = proposalSections(input, n);
  let polished = false;

  const { formalAiEnabled, writeWithAi } = await import('@/lib/formal-writer-ai');
  if (formalAiEnabled()) {
    const userId = (await getUserId()) ?? 'unknown';
    const reply = await writeWithAi(userId, proposalPrompt(sections));
    if (typeof reply === 'string') {
      const better = parsePolished(reply, sections);
      if (better) {
        try { assertClean(better.flatMap((s) => s.body).join(' ')); sections = better; polished = true; } catch { /* keep the plain version */ }
      }
    }
  }

  return {
    ok: true,
    title: `Funding proposal: ${input.business.title}`,
    groupName: group.name,
    registeredNumber: input.group.registeredNumber ?? null,
    date: input.date,
    sections,
    polished,
    signedBy: input.preparedBy,
    otherSigners: offs.filter((o) => o.name !== myName),
    totals: { totalCents: n.totalCents, ownCents: n.ownCents, loanCents: n.loanCents, instalmentCents: n.instalmentCents },
  };
}
