'use server';

/**
 * Server actions for writes. When no DATABASE_URL is configured they are safe
 * no-ops (the UI keeps its optimistic local state), so the app works in both
 * seed and persisted modes.
 */

import { dbEnabled } from '@/lib/data';

export async function recordContributionAction(input: {
  groupId?: string;
  membershipId: string;
  amountCents: number;
}): Promise<{ ok: boolean; persisted: boolean }> {
  if (input.amountCents <= 0) return { ok: false, persisted: false };
  if (!dbEnabled() || !input.groupId) return { ok: true, persisted: false };
  const { prisma, recordContribution } = await import('@stawi/db');
  const { auth } = await import('@clerk/nextjs/server');
  const { userId } = await auth();
  await recordContribution(prisma, {
    groupId: input.groupId,
    membershipId: input.membershipId,
    amountCents: input.amountCents,
    channel: 'CASH',
    confirmed: true,
    recordedByClerkUserId: userId ?? undefined,
  });
  return { ok: true, persisted: true };
}

export async function addLedgerEntryAction(input: {
  businessId?: string;
  type: 'SALE' | 'PURCHASE' | 'EXPENSE';
  description: string;
  amountCents: number;
}): Promise<{ ok: boolean; persisted: boolean }> {
  if (input.amountCents <= 0) return { ok: false, persisted: false };
  if (!dbEnabled() || !input.businessId) return { ok: true, persisted: false };
  const { prisma, addLedgerEntry } = await import('@stawi/db');
  await addLedgerEntry(prisma, {
    businessId: input.businessId,
    type: input.type,
    description: input.description,
    amountCents: input.amountCents,
  });
  return { ok: true, persisted: true };
}
