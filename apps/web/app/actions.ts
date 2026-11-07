'use server';

/**
 * Server actions for writes. Guarantees:
 *  1. Content safety — free-text screened with @stawi/core moderation (server-side).
 *  2. Tenant isolation — writes are scoped to the caller's tenant (assertGroupInTenant).
 *  3. Persistence — hit Postgres when DATABASE_URL is set, else no-op on seed data.
 */

import { assertClean, duplicateRosterPhones, SACCO_PLUS_DISABLED_MESSAGE } from '@stawi/core';
import { dbEnabled } from '@/lib/data';
import { saccoPlusEnabled } from '@/lib/features';

/**
 * Per-group authority, enforced here on the server (the UI only mirrors it).
 * Money (recording contributions) → treasurer; records (charter, minutes,
 * statements) → chair, secretary or treasurer. Seed/demo mode (no DATABASE_URL)
 * persists nothing, so it is not gated.
 */
async function requireGroupRole(groupId: string | undefined, allowed: 'money' | 'records'): Promise<string | null> {
  if (!dbEnabled()) return null;
  if (!groupId) return 'Missing group.';
  const { myGroupRole, MONEY_ROLES, RECORD_EDITOR_ROLES } = await import('@/lib/group-access');
  const role = await myGroupRole(groupId);
  const set = allowed === 'money' ? MONEY_ROLES : RECORD_EDITOR_ROLES;
  if (!role || !set.has(role)) {
    return allowed === 'money'
      ? 'Only the group treasurer can record contributions.'
      : 'Only group officials (chair, secretary, treasurer) can change records.';
  }
  return null;
}
import { publishEvent } from '@/lib/events';

async function tenantId(): Promise<string | undefined> {
  const { prisma, getTenantContext } = await import('@stawi/db');
  const { getUserId } = await import('@/lib/auth');
  const userId = await getUserId();
  if (!userId) return undefined;
  const ctx = await getTenantContext(prisma, userId);
  return ctx?.tenantId;
}

export async function recordContributionAction(input: {
  groupId?: string;
  membershipId: string;
  amountCents: number;
}): Promise<{ ok: boolean; persisted: boolean; error?: string }> {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) return { ok: false, persisted: false, error: 'Amount must be positive' };
  if (!dbEnabled() || !input.groupId) {
    publishEvent({ type: 'contribution', channel: 'public' });
    return { ok: true, persisted: false };
  }
  const denied = await requireGroupRole(input.groupId, 'money');
  if (denied) return { ok: false, persisted: false, error: denied };
  const { prisma, recordContribution } = await import('@stawi/db');
  const { getUserId } = await import('@/lib/auth');
  const userId = await getUserId();
  const member = await prisma.membership.findFirst({ where: { id: input.membershipId, groupId: input.groupId }, select: { id: true } });
  if (!member) return { ok: false, persisted: false, error: 'Member not found in this group.' };
  try {
    await recordContribution(prisma, {
      groupId: input.groupId,
      membershipId: input.membershipId,
      amountCents: input.amountCents,
      channel: 'CASH',
      confirmed: true,
      recordedByClerkUserId: userId ?? undefined,
      tenantId: await tenantId(),
    });
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Write failed' };
  }
  publishEvent({ type: 'contribution', channel: (await tenantId()) ?? 'public' });
  return { ok: true, persisted: true };
}

export async function addLedgerEntryAction(input: {
  businessId?: string;
  type: 'SALE' | 'PURCHASE' | 'EXPENSE';
  description: string;
  amountCents: number;
}): Promise<{ ok: boolean; persisted: boolean; error?: string }> {
  if (input.amountCents <= 0) return { ok: false, persisted: false, error: 'Amount must be positive' };
  try {
    assertClean(input.description);
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Content blocked' };
  }
  if (!dbEnabled() || !input.businessId) return { ok: true, persisted: false };
  const { prisma, addLedgerEntry } = await import('@stawi/db');
  // The books belong to one group's business: only that group's members may
  // write to them (the page only offers the caller's own groups; this is the
  // server-side check behind it).
  const biz = await prisma.business.findUnique({ where: { id: input.businessId }, select: { groupId: true } });
  if (!biz) return { ok: false, persisted: false, error: 'Business not found.' };
  const { myGroupRole } = await import('@/lib/group-access');
  if (!(await myGroupRole(biz.groupId))) return { ok: false, persisted: false, error: 'You can only add entries to your own group’s books.' };
  try {
    await addLedgerEntry(prisma, {
      businessId: input.businessId,
      type: input.type,
      description: input.description,
      amountCents: input.amountCents,
      tenantId: await tenantId(),
    });
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Write failed' };
  }
  return { ok: true, persisted: true };
}

/** Generic content check usable by any composer (messages, venture notes, names). */
export async function moderateAction(text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    assertClean(text);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Content blocked' };
  }
}

// ───────────────────────── SACCO+ (Pillar 4) actions ─────────────────────────
// Every action below refuses when SACCO_PLUS_ENABLED is off (the default), and
// the @stawi/db repo refuses again underneath — so nothing is scored, lent,
// accrued or debited by a v1 deployment, whatever the client sends.

export async function openSaccoAccountAction(input: {
  entityType: 'REGISTERED_GROUP' | 'BUSINESS' | 'INDIVIDUAL' | 'INSTITUTION';
  displayName: string;
  countryCode?: string;
  ownerGroupId?: string;
}): Promise<{ ok: boolean; persisted: boolean; id?: string; error?: string }> {
  if (!saccoPlusEnabled()) return { ok: false, persisted: false, error: SACCO_PLUS_DISABLED_MESSAGE };
  try {
    assertClean(input.displayName);
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Content blocked' };
  }
  if (!dbEnabled()) return { ok: true, persisted: false };
  try {
    const { prisma, openSaccoAccount } = await import('@stawi/db');
    const { getUserId } = await import('@/lib/auth');
    const userId = await getUserId();
    const tid = await tenantId();
    if (!userId || !tid) return { ok: false, persisted: false, error: 'Not signed in to a tenant' };
    const r = await openSaccoAccount(prisma, {
      tenantId: tid,
      entityType: input.entityType,
      displayName: input.displayName,
      countryCode: input.countryCode,
      ownerClerkId: input.ownerGroupId ? undefined : userId,
      ownerGroupId: input.ownerGroupId,
    });
    return { ok: true, persisted: true, id: r.id };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Write failed' };
  }
}

/**
 * One-tap SACCO+ activation for a group already enrolled through Pillar 1.
 * Opens the group's Stawi SACCO+ account (KYC fast-tracked from the charter)
 * and seeds it with the group's proven pooled savings so credit eligibility is
 * live immediately. Degrades to a no-op success in seed mode (no DATABASE_URL).
 */
export async function activateSaccoFromPillar1Action(input: {
  groupId: string;
  displayName: string;
  countryCode?: string;
  openingDepositCents?: number;
}): Promise<{ ok: boolean; persisted: boolean; accountId?: string; seededCents?: number; error?: string }> {
  if (!saccoPlusEnabled()) return { ok: false, persisted: false, error: SACCO_PLUS_DISABLED_MESSAGE };
  try {
    assertClean(input.displayName);
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Content blocked' };
  }
  if (!dbEnabled()) return { ok: true, persisted: false, seededCents: input.openingDepositCents ?? 0 };
  try {
    const { prisma, openSaccoAccount, postSaccoTxn } = await import('@stawi/db');
    const { getUserId } = await import('@/lib/auth');
    const userId = await getUserId();
    const tid = await tenantId();
    if (!userId || !tid) return { ok: false, persisted: false, error: 'Not signed in to a tenant' };
    const acct = await openSaccoAccount(prisma, {
      tenantId: tid,
      entityType: 'REGISTERED_GROUP',
      displayName: input.displayName,
      countryCode: input.countryCode,
      ownerGroupId: input.groupId,
    });
    let seededCents = 0;
    if (input.openingDepositCents && input.openingDepositCents > 0) {
      try {
        await postSaccoTxn(prisma, {
          tenantId: tid,
          accountId: acct.id,
          type: 'DEPOSIT',
          amountCents: input.openingDepositCents,
          reference: 'Pillar 1 pooled savings (activation)',
        });
        seededCents = input.openingDepositCents;
      } catch {
        // Account is open even if the seeding deposit needs a manual retry.
      }
    }
    publishEvent({ type: 'sacco_txn', channel: tid });
    return { ok: true, persisted: true, accountId: acct.id, seededCents };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Write failed' };
  }
}

export async function saccoTxnAction(input: {
  accountId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'SHARE_PURCHASE' | 'REMITTANCE_OUT' | 'REMITTANCE_IN';
  amountCents: number;
  reference?: string;
}): Promise<{ ok: boolean; persisted: boolean; balanceCents?: number; error?: string }> {
  if (!saccoPlusEnabled()) return { ok: false, persisted: false, error: SACCO_PLUS_DISABLED_MESSAGE };
  if (input.amountCents <= 0) return { ok: false, persisted: false, error: 'Amount must be positive' };
  if (!dbEnabled()) return { ok: true, persisted: false };
  try {
    const { prisma, postSaccoTxn } = await import('@stawi/db');
    const { getUserId } = await import('@/lib/auth');
    const userId = await getUserId();
    const tid = await tenantId();
    if (!userId || !tid) return { ok: false, persisted: false, error: 'Not signed in to a tenant' };
    const r = await postSaccoTxn(prisma, {
      tenantId: tid,
      accountId: input.accountId,
      type: input.type,
      amountCents: input.amountCents,
      reference: input.reference,
      // Debits carry the caller as the approving officer; the repo enforces
      // that debits cannot post without an approver identity on record.
      approvedByClerkId:
        input.type === 'WITHDRAWAL' || input.type === 'REMITTANCE_OUT' ? userId : undefined,
    });
    publishEvent({ type: 'sacco_txn', channel: tid });
    return { ok: true, persisted: true, balanceCents: r.balanceCents };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Write failed' };
  }
}

export async function applyLoanAction(input: {
  accountId: string;
  product: 'DEVELOPMENT' | 'EMERGENCY' | 'BUSINESS_BOOST';
  principalCents: number;
  termMonths: number;
  monthsActive: number;
  savingStreakMonths: number;
  onTimeRepaymentRate?: number;
  guarantorCoverageCents?: number;
}): Promise<{
  ok: boolean;
  persisted: boolean;
  qualified?: boolean;
  tier?: string;
  monthlyRatePct?: number;
  reasons?: string[];
  error?: string;
}> {
  if (!saccoPlusEnabled()) return { ok: false, persisted: false, error: SACCO_PLUS_DISABLED_MESSAGE };
  if (input.principalCents <= 0) return { ok: false, persisted: false, error: 'Amount must be positive' };
  if (!dbEnabled()) return { ok: true, persisted: false };
  try {
    const { prisma, applyForLoan } = await import('@stawi/db');
    const tid = await tenantId();
    if (!tid) return { ok: false, persisted: false, error: 'Not signed in to a tenant' };
    const r = await applyForLoan(prisma, {
      tenantId: tid,
      accountId: input.accountId,
      product: input.product,
      principalCents: input.principalCents,
      termMonths: input.termMonths,
      monthsActive: input.monthsActive,
      savingStreakMonths: input.savingStreakMonths,
      onTimeRepaymentRate: input.onTimeRepaymentRate ?? 1,
      guarantorCoverageCents: input.guarantorCoverageCents,
    });
    publishEvent({ type: 'loan', channel: tid });
    return {
      ok: true,
      persisted: true,
      qualified: r.qualified,
      tier: r.tier,
      monthlyRatePct: r.monthlyRatePct,
      reasons: r.reasons,
    };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Write failed' };
  }
}

// ───────────────── Pillar 1 — cockpit writes (charter / minutes) ─────────

/** Create a new group. Officials only (enforced in the page via viewer role). */
export async function createGroupAction(input: {
  name: string;
  type?: 'CHAMA' | 'SELF_HELP_GROUP' | 'SACCO' | 'BUSINESS';
  countryCode?: string;
}): Promise<{ ok: boolean; groupId?: string; persisted: boolean; error?: string }> {
  const name = input.name?.trim();
  if (!name || name.length < 2) return { ok: false, persisted: false, error: 'Enter a group name.' };
  const clean = await assertCleanSafe(name);
  if (!clean.ok) return { ok: false, persisted: false, error: clean.error };
  if (!dbEnabled()) {
    // Demo: derive a stable-ish slug so the workspace opens.
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'group';
    publishEvent({ type: 'group', channel: 'public' });
    return { ok: true, persisted: false, groupId: slug };
  }
  try {
    const { prisma } = await import('@stawi/db');
    const { getUserId } = await import('@/lib/auth');
    const userId = await getUserId();
    const tid = await tenantId();
    const g = await prisma.group.create({
      data: { name, type: input.type ?? 'CHAMA', countryCode: input.countryCode ?? 'KE', tenantId: tid, clerkOrgId: `manual-${Date.now()}` },
      select: { id: true },
    });
    if (userId) {
      const { getUserPhone } = await import('@/lib/auth');
      const phone = await getUserPhone().catch(() => null);
      await prisma.membership.create({ data: { groupId: g.id, clerkUserId: userId, fullName: 'Group founder', phone, role: 'CHAIRMAN' } }).catch(() => {});
    }
    publishEvent({ type: 'group', channel: tid ?? 'public' });
    return { ok: true, persisted: true, groupId: g.id };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Create failed' };
  }
}

export async function saveCharterAction(input: {
  groupId: string;
  charter: unknown;
}): Promise<{ ok: boolean; persisted: boolean; error?: string }> {
  const c = input.charter as any;
  if (!c?.name?.trim()) return { ok: false, persisted: false, error: 'Charter needs a group name.' };
  // Each person once on the roster — a phone entered twice would create two
  // membership rows and list the same member twice in every picker.
  if (Array.isArray(c.members) && duplicateRosterPhones(c.members).length) {
    return { ok: false, persisted: false, error: 'The same phone number is on the roster more than once. Each member should appear once.' };
  }
  // Screen the free-text governance fields.
  for (const field of [c.constitution, c.motto, c.mission, c.vision, c.notes]) {
    if (field) {
      const clean = await assertCleanSafe(String(field));
      if (!clean.ok) return { ok: false, persisted: false, error: clean.error };
    }
  }
  if (!dbEnabled()) {
    publishEvent({ type: 'charter', channel: 'public' });
    return { ok: true, persisted: false };
  }
  const deniedCharter = await requireGroupRole(input.groupId, 'records');
  if (deniedCharter) return { ok: false, persisted: false, error: deniedCharter };
  try {
    const { prisma, upsertGroupCharter, provisionRosterMemberships } = await import('@stawi/db');
    await upsertGroupCharter(prisma, {
      groupId: input.groupId,
      tenantId: await tenantId(),
      name: c.name,
      logoUrl: c.logoUrl,
      schedule: c.schedule,
      members: c.members,
      constitution: c.constitution ?? '',
      constitutionFileUrl: c.constitutionFileUrl,
      motto: c.motto ?? '',
      mission: c.mission ?? '',
      vision: c.vision ?? '',
      coreValues: c.coreValues ?? [],
      notes: c.notes,
      registeredNumber: c.registeredNumber,
      countryCode: c.countryCode ?? 'KE',
    });
    // Phone-first: seed membership rows from the roster so members are linked on sign-in.
    try {
      const roster = (Array.isArray(c.members) ? c.members : [])
        .filter((m: any) => m?.phone && m?.fullName)
        .map((m: any) => ({ fullName: m.fullName, phone: m.phone, designation: m.designation }));
      if (roster.length) await provisionRosterMemberships(prisma, { groupId: input.groupId, tenantId: await tenantId(), roster });
    } catch { /* non-fatal */ }
    publishEvent({ type: 'charter', channel: (await tenantId()) ?? 'public' });
    return { ok: true, persisted: true };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Save failed' };
  }
}

export async function saveMeetingAction(input: {
  groupId: string;
  meeting: unknown;
}): Promise<{ ok: boolean; persisted: boolean; error?: string }> {
  const m = input.meeting as any;
  if (!m?.meetingNo) return { ok: false, persisted: false, error: 'Meeting number missing.' };
  if (!dbEnabled()) {
    publishEvent({ type: 'meeting', channel: 'public' });
    return { ok: true, persisted: false };
  }
  const deniedMeeting = await requireGroupRole(input.groupId, 'records');
  if (deniedMeeting) return { ok: false, persisted: false, error: deniedMeeting };
  const { checkMeetingWrite } = await import('@/lib/meeting-guard');
  const refused = await checkMeetingWrite(input.groupId, m);
  if (refused) return { ok: false, persisted: false, error: refused.error };
  try {
    const { prisma, upsertMeeting } = await import('@stawi/db');
    await upsertMeeting(prisma, { groupId: input.groupId, tenantId: await tenantId(), ...m });
    publishEvent({ type: 'meeting', channel: (await tenantId()) ?? 'public' });
    return { ok: true, persisted: true };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Save failed' };
  }
}

/** Official posts a meeting after editing its generated professional document. */
export async function postMeetingAction(input: {
  groupId: string;
  meetingNo: number;
  generatedDoc: string;
}): Promise<{ ok: boolean; persisted: boolean; error?: string }> {
  if (!dbEnabled()) {
    publishEvent({ type: 'meeting', channel: 'public' });
    return { ok: true, persisted: false };
  }
  const deniedPost = await requireGroupRole(input.groupId, 'records');
  if (deniedPost) return { ok: false, persisted: false, error: deniedPost };
  const { checkMeetingPost } = await import('@/lib/meeting-guard');
  const refusedPost = await checkMeetingPost(input.groupId, input.meetingNo);
  if (refusedPost) return { ok: false, persisted: false, error: refusedPost.error };
  try {
    const { prisma, postMeeting } = await import('@stawi/db');
    await postMeeting(prisma, { groupId: input.groupId, meetingNo: input.meetingNo, generatedDoc: input.generatedDoc, tenantId: await tenantId() });
    publishEvent({ type: 'meeting', channel: (await tenantId()) ?? 'public' });
    return { ok: true, persisted: true };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Post failed' };
  }
}

export async function saveStatementAction(input: {
  groupId: string;
  year: number;
  month: number;
  payload: unknown;
  post?: boolean;
}): Promise<{ ok: boolean; persisted: boolean; error?: string }> {
  if (!dbEnabled()) return { ok: true, persisted: false };
  const deniedStatement = await requireGroupRole(input.groupId, 'records');
  if (deniedStatement) return { ok: false, persisted: false, error: deniedStatement };
  // Only a month the picker offers (has meetings, not in the future); the
  // figures are recomputed from the stored meetings, never taken from the client.
  const narrative = (input.payload as any)?.narrative;
  if (Array.isArray(narrative)) {
    for (const p of narrative) {
      const clean = await assertCleanSafe(String(p ?? ''));
      if (!clean.ok) return { ok: false, persisted: false, error: clean.error };
    }
  }
  const { buildServerStatement } = await import('@/lib/meeting-guard');
  const built = await buildServerStatement(input.groupId, input.year, input.month, narrative);
  if ('error' in built) return { ok: false, persisted: false, error: built.error };
  try {
    const { prisma, saveMonthlyStatement } = await import('@stawi/db');
    await saveMonthlyStatement(prisma, { groupId: input.groupId, tenantId: await tenantId(), year: input.year, month: input.month, payload: built.statement, post: input.post });
    return { ok: true, persisted: true };
  } catch (e) {
    return { ok: false, persisted: false, error: e instanceof Error ? e.message : 'Save failed' };
  }
}

/** Moderation wrapper that never throws — returns a friendly error instead. */
async function assertCleanSafe(text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    assertClean(text);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Content not allowed' };
  }
}

/**
 * Plain-language explanation of one member's month-end figures.
 *
 * Read-only and propose-only: it rephrases figures the statement already shows,
 * never moves money and gives no financial advice. The optional AI pass
 * (MEMBER_EXPLANATION_PROVIDER=anthropic + key) runs only for a signed-in user,
 * once per click; everyone else — and any failure — gets the free template.
 */
export async function explainMemberStatementAction(input: {
  groupName: string;
  periodLabel: string;
  meetingsHeld: number;
  member: {
    memberId: string;
    name: string;
    meetingsPresent: number;
    meetingsApology: number;
    meetingsAbsent: number;
    attendancePct: number;
    contributedCents: number;
    finesCents: number;
  };
  closingCents: number;
}): Promise<{ ok: boolean; text?: string; usedModel?: boolean; error?: string }> {
  const { explainMemberStatement } = await import('@stawi/core');
  const { createMemberStatementGenerate } = await import('@/lib/member-statement-ai');
  const { getUserId } = await import('@/lib/auth');

  const whole = (n: number) => (Number.isFinite(n) && n >= 0 ? Math.round(n) : 0);
  const text = (s: string, max: number) => String(s ?? '').slice(0, max);
  if (!input?.member) return { ok: false, error: 'Missing member' };

  const signedIn = Boolean(await getUserId());
  try {
    const result = await explainMemberStatement(
      {
        groupName: text(input.groupName, 120),
        periodLabel: text(input.periodLabel, 40),
        meetingsHeld: whole(input.meetingsHeld),
        member: {
          memberId: text(input.member.memberId, 80),
          name: text(input.member.name, 80),
          meetingsPresent: whole(input.member.meetingsPresent),
          meetingsApology: whole(input.member.meetingsApology),
          meetingsAbsent: whole(input.member.meetingsAbsent),
          attendancePct: Math.min(100, whole(input.member.attendancePct)),
          contributedCents: whole(input.member.contributedCents),
          finesCents: whole(input.member.finesCents),
        },
        finance: {
          openingCents: 0,
          contributionsCents: 0,
          finesCents: 0,
          otherInCents: 0,
          payoutsCents: 0,
          otherOutCents: 0,
          totalInCents: 0,
          totalOutCents: 0,
          closingCents: whole(input.closingCents),
        },
      },
      // AI only for a signed-in user; anonymous viewers get the free template.
      signedIn ? createMemberStatementGenerate() : undefined,
    );
    return { ok: true, text: result.text, usedModel: result.usedModel };
  } catch {
    return { ok: false, error: 'Could not prepare the explanation' };
  }
}
