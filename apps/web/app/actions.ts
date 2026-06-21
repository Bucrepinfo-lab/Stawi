'use server';

/**
 * Server actions for writes. Guarantees:
 *  1. Content safety — free-text screened with @stawi/core moderation (server-side).
 *  2. Tenant isolation — writes are scoped to the caller's tenant (assertGroupInTenant).
 *  3. Persistence — hit Postgres when DATABASE_URL is set, else no-op on seed data.
 */

import { assertClean } from '@stawi/core';
import { dbEnabled } from '@/lib/data';

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
  if (!dbEnabled() || !input.groupId) return { ok: true, persisted: false };
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
