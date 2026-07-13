'use server';

/**
 * Server actions for writes. Guarantees:
 *  1. Content safety — free-text screened with @stawi/core moderation (server-side).
 *  2. Tenant isolation — writes are scoped to the caller's tenant (assertGroupInTenant).
 *  3. Persistence — hit Postgres when DATABASE_URL is set, else no-op on seed data.
 */

import { assertClean } from '@stawi/core';
import { dbEnabled } from '@/lib/data';
import { publishEvent } from '@/lib/events';

async function tenantId(): Promise<string | undefined> {
  const { prisma, getTenantContext } = await import('@stawi/db');
  const { auth } = await import('@clerk/nextjs/server');
  const { userId } = await auth();
  if (!userId) return undefined;
  const ctx = await getTenantContext(prisma, userId);
  return ctx?.tenantId;
}

export async function recordContributionAction(input: {
  groupId?: string;
  membershipId: string;
  amountCents: number;
}): Promise<{ ok: boolean; persisted: boolean; error?: string }> {
  if (input.amountCents <= 0) return { ok: false, persisted: false, error: 'Amount must be positive' };
  if (!dbEnabled() || !input.groupId) {
    publishEvent({ type: 'contribution', channel: 'public' });
    return { ok: true, persisted: false };
  }
  const { prisma, recordContribution } = await import('@stawi/db');
  const { auth } = await import('@clerk/nextjs/server');
  const { userId } = await auth();
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

export async function openSaccoAccountAction(input: {
  entityType: 'REGISTERED_GROUP' | 'BUSINESS' | 'INDIVIDUAL' | 'INSTITUTION';
  displayName: string;
  countryCode?: string;
  ownerGroupId?: string;
}): Promise<{ ok: boolean; persisted: boolean; id?: string; error?: string }> {
  const clean = assertClean(input.displayName, 'sacco_account');
  if (!clean.ok) return { ok: false, persisted: false, error: clean.reason };
  if (!dbEnabled()) return { ok: true, persisted: false };
  try {
    const { prisma, openSaccoAccount } = await import('@stawi/db');
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
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

export async function saccoTxnAction(input: {
  accountId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'SHARE_PURCHASE' | 'REMITTANCE_OUT' | 'REMITTANCE_IN';
  amountCents: number;
  reference?: string;
}): Promise<{ ok: boolean; persisted: boolean; balanceCents?: number; error?: string }> {
  if (input.amountCents <= 0) return { ok: false, persisted: false, error: 'Amount must be positive' };
  if (!dbEnabled()) return { ok: true, persisted: false };
  try {
    const { prisma, postSaccoTxn } = await import('@stawi/db');
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
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
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
    const tid = await tenantId();
    const g = await prisma.group.create({
      data: { name, type: input.type ?? 'CHAMA', countryCode: input.countryCode ?? 'KE', tenantId: tid, clerkOrgId: `manual-${Date.now()}` },
      select: { id: true },
    });
    if (userId) {
      await prisma.membership.create({ data: { groupId: g.id, clerkUserId: userId, fullName: 'You', role: 'CHAIRMAN' } }).catch(() => {});
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
  try {
    const { prisma, upsertGroupCharter } = await import('@stawi/db');
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
  try {
    const { prisma, saveMonthlyStatement } = await import('@stawi/db');
    await saveMonthlyStatement(prisma, { groupId: input.groupId, tenantId: await tenantId(), year: input.year, month: input.month, payload: input.payload, post: input.post });
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
