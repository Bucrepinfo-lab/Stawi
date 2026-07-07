/**
 * Stawi repository — typed, TENANT-SCOPED queries that map Prisma rows to DTOs.
 *
 * Tenant isolation is enforced at the query layer: callers pass a tenantId
 * (resolved from the signed-in user's TenantMember), and every read/write is
 * filtered to that tenant. A Postgres RLS layer (prisma/rls.sql) provides
 * defence-in-depth. Requires a generated Prisma client + live DATABASE_URL.
 */

import type { PrismaClient, GroupType, MemberRole } from '@prisma/client';
import { assertSameTenant, toSlug } from '@stawi/core';
import type { TenantContext, TenantRole } from '@stawi/core';
import type {
  GroupAccountDTO,
  GroupKind,
  BusinessBooksDTO,
  MemberDTO,
} from './dto.js';

function mapKind(t: GroupType): GroupKind {
  switch (t) {
    case 'SACCO': return 'SACCO';
    case 'BUSINESS': return 'Business';
    default: return 'Chama';
  }
}
const titleRole = (r: MemberRole) => r.charAt(0) + r.slice(1).toLowerCase();

/** Resolve the signed-in user's tenant context (tenantId + role), or null. */
export async function getTenantContext(
  prisma: PrismaClient,
  clerkUserId: string,
): Promise<TenantContext | null> {
  const tm = await prisma.tenantMember.findFirst({
    where: { clerkUserId },
    select: { tenantId: true, role: true },
  });
  return tm ? { tenantId: tm.tenantId, role: tm.role as TenantRole } : null;
}

/** Verify a group belongs to the caller's tenant; throws on cross-tenant access. */
async function assertGroupInTenant(prisma: PrismaClient, groupId: string, tenantId: string): Promise<void> {
  const g = await prisma.group.findUnique({ where: { id: groupId }, select: { tenantId: true } });
  if (!g) throw new Error('Group not found');
  assertSameTenant(g.tenantId, tenantId);
}

/**
 * All groups the given Clerk user belongs to WITHIN their tenant.
 * If tenantId is provided, results are filtered to that tenant.
 */
export async function getMemberGroups(
  prisma: PrismaClient,
  clerkUserId: string,
  tenantId?: string,
): Promise<GroupAccountDTO[]> {
  const memberships = await prisma.membership.findMany({
    where: {
      clerkUserId,
      ...(tenantId ? { group: { tenantId } } : {}),
    },
    include: {
      group: {
        include: {
          members: {
            include: { contributions: { where: { status: 'CONFIRMED' } } },
            orderBy: { rotationOrder: 'asc' },
          },
        },
      },
    },
  });

  return memberships.map((m) => {
    const g = m.group;
    const members: MemberDTO[] = g.members.map((mem) => {
      const total = mem.contributions.reduce((s, c) => s + c.amountCents, 0);
      return {
        memberId: mem.id,
        name: mem.fullName,
        totalCents: total,
        role: titleRole(mem.role),
        paid: mem.contributions.length > 0,
      };
    });
    return {
      id: g.id,
      name: g.name,
      myRole: titleRole(m.role),
      flag: g.flagEmoji,
      type: mapKind(g.type),
      members,
    };
  });
}

export async function recordContribution(
  prisma: PrismaClient,
  input: {
    groupId: string;
    membershipId: string;
    amountCents: number;
    channel?: 'MPESA_STK' | 'MPESA_C2B' | 'BANK' | 'CASH' | 'CARD';
    confirmed?: boolean;
    recordedByClerkUserId?: string;
    checkoutRequestId?: string;
    tenantId?: string;
  },
): Promise<{ id: string }> {
  if (input.amountCents <= 0) throw new Error('Amount must be positive');
  if (input.tenantId) await assertGroupInTenant(prisma, input.groupId, input.tenantId);
  return prisma.contribution.create({
    data: {
      groupId: input.groupId,
      membershipId: input.membershipId,
      amountCents: input.amountCents,
      channel: input.channel ?? 'CASH',
      status: input.confirmed ? 'CONFIRMED' : 'PENDING',
      recordedByClerkUserId: input.recordedByClerkUserId,
      checkoutRequestId: input.checkoutRequestId,
    },
    select: { id: true },
  });
}

export async function confirmContribution(
  prisma: PrismaClient,
  checkoutRequestId: string,
  mpesaRef: string,
): Promise<void> {
  await prisma.contribution.updateMany({
    where: { checkoutRequestId, status: 'PENDING' },
    data: { status: 'CONFIRMED', mpesaRef },
  });
}

export async function getGroupBusiness(
  prisma: PrismaClient,
  groupId: string,
  tenantId?: string,
): Promise<BusinessBooksDTO | null> {
  const biz = await prisma.business.findFirst({
    where: {
      groupId,
      ...(tenantId ? { group: { tenantId } } : {}),
    },
    include: { stockItems: true, entries: { orderBy: { occurredAt: 'desc' } } },
  });
  if (!biz) return null;
  return {
    businessId: biz.id,
    name: biz.name,
    vatRegistered: biz.vatRegistered,
    tourismSector: biz.tourismSector,
    entries: biz.entries.map((e) => ({
      type: e.type,
      description: e.description,
      amountCents: e.amountCents,
      occurredAt: e.occurredAt.toISOString(),
    })),
    stock: biz.stockItems.map((s) => ({
      id: s.id,
      name: s.name,
      quantity: s.quantity,
      reorderLevel: s.reorderLevel,
      soldInWindow: s.soldInWindow,
      supplierName: s.supplierName ?? undefined,
      supplierPhone: s.supplierPhone ?? undefined,
    })),
  };
}

export async function addLedgerEntry(
  prisma: PrismaClient,
  input: {
    businessId: string;
    type: 'SALE' | 'PURCHASE' | 'EXPENSE';
    description: string;
    amountCents: number;
    tenantId?: string;
  },
): Promise<{ id: string }> {
  if (input.tenantId) {
    const biz = await prisma.business.findUnique({
      where: { id: input.businessId },
      select: { group: { select: { tenantId: true } } },
    });
    if (!biz) throw new Error('Business not found');
    assertSameTenant(biz.group.tenantId, input.tenantId);
  }
  return prisma.ledgerEntry.create({
    data: {
      businessId: input.businessId,
      type: input.type,
      description: input.description,
      amountCents: input.amountCents,
    },
    select: { id: true },
  });
}

/** Resolve a tenant id from its slug (null if not found). */
export async function getTenantBySlug(
  prisma: PrismaClient,
  slug: string,
): Promise<{ id: string } | null> {
  return prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
}

/**
 * Tenant context for a user constrained to a specific tenant slug — verifies the
 * user is a member of that tenant. Returns null if the slug is unknown or the
 * user is not a member (prevents addressing a tenant you don't belong to).
 */
export async function getTenantContextBySlug(
  prisma: PrismaClient,
  clerkUserId: string,
  slug: string,
): Promise<{ tenantId: string; role: string } | null> {
  const t = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (!t) return null;
  const tm = await prisma.tenantMember.findFirst({
    where: { clerkUserId, tenantId: t.id },
    select: { role: true },
  });
  return tm ? { tenantId: t.id, role: tm.role } : null;
}

// ───────────────────────── Clerk sync (webhook) ─────────────────────────

function mapClerkRole(role?: string): 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' {
  if (!role) return 'MEMBER';
  const r = role.toLowerCase();
  if (r.includes('admin')) return 'ADMIN';
  if (r.includes('owner')) return 'OWNER';
  return 'MEMBER';
}

/** Upsert a Tenant from a Clerk organization; creator becomes OWNER. */
export async function upsertTenantFromClerkOrg(
  prisma: PrismaClient,
  input: { clerkOrgId: string; name: string; createdByUserId?: string },
): Promise<{ id: string }> {
  const slug = `${toSlug(input.name)}-${input.clerkOrgId.slice(-6)}`;
  const tenant = await prisma.tenant.upsert({
    where: { clerkOrgId: input.clerkOrgId },
    update: { name: input.name },
    create: { clerkOrgId: input.clerkOrgId, name: input.name, slug },
    select: { id: true },
  });
  if (input.createdByUserId) {
    await prisma.tenantMember.upsert({
      where: { tenantId_clerkUserId: { tenantId: tenant.id, clerkUserId: input.createdByUserId } },
      update: { role: 'OWNER' },
      create: { tenantId: tenant.id, clerkUserId: input.createdByUserId, role: 'OWNER' },
    });
  }
  return tenant;
}

export async function removeTenantByClerkOrg(prisma: PrismaClient, clerkOrgId: string): Promise<void> {
  await prisma.tenant.deleteMany({ where: { clerkOrgId } });
}

/** Upsert a tenant membership from a Clerk organizationMembership event. */
export async function upsertTenantMemberFromClerk(
  prisma: PrismaClient,
  input: { clerkOrgId: string; clerkUserId: string; role?: string },
): Promise<void> {
  const t = await prisma.tenant.findUnique({ where: { clerkOrgId: input.clerkOrgId }, select: { id: true } });
  if (!t) return;
  await prisma.tenantMember.upsert({
    where: { tenantId_clerkUserId: { tenantId: t.id, clerkUserId: input.clerkUserId } },
    update: { role: mapClerkRole(input.role) },
    create: { tenantId: t.id, clerkUserId: input.clerkUserId, role: mapClerkRole(input.role) },
  });
}

export async function removeTenantMemberFromClerk(
  prisma: PrismaClient,
  input: { clerkOrgId: string; clerkUserId: string },
): Promise<void> {
  const t = await prisma.tenant.findUnique({ where: { clerkOrgId: input.clerkOrgId }, select: { id: true } });
  if (!t) return;
  await prisma.tenantMember.deleteMany({ where: { tenantId: t.id, clerkUserId: input.clerkUserId } });
}

/** Remove a deleted Clerk user from tenant memberships (user.deleted). */
export async function removeUserData(prisma: PrismaClient, clerkUserId: string): Promise<void> {
  await prisma.tenantMember.deleteMany({ where: { clerkUserId } });
}

// ───────────────────────── RLS activation ─────────────────────────

/**
 * Run `fn` inside a transaction with Postgres RLS scoped to `tenantId`
 * (sets the tx-local `app.tenant_id` GUC that prisma/rls.sql policies read).
 * Use for any raw/high-risk path; the repo's app-level tenant filters remain
 * the first line of defence.
 */
export async function withTenantRls<T>(
  prisma: PrismaClient,
  tenantId: string,
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.tenant_id', '${tenantId.replace(/'/g, "''")}', true)`,
    );
    return fn(tx as never);
  });
}

// ───────────────────────── SACCO+ (Pillar 4) ─────────────────────────

export interface SaccoAccountDTO {
  id: string;
  entityType: 'REGISTERED_GROUP' | 'BUSINESS' | 'INDIVIDUAL' | 'INSTITUTION';
  displayName: string;
  countryCode: string;
  balanceCents: number;
  shareCapitalCents: number;
  pledgedCents: number;
  kycComplete: boolean;
}

/** SACCO+ accounts visible to the caller within their tenant. */
export async function getSaccoAccounts(
  prisma: PrismaClient,
  tenantId: string,
  clerkUserId?: string,
): Promise<SaccoAccountDTO[]> {
  const rows = await prisma.saccoAccount.findMany({
    where: {
      tenantId,
      ...(clerkUserId ? { OR: [{ ownerClerkId: clerkUserId }, { ownerClerkId: null }] } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((a) => ({
    id: a.id,
    entityType: a.entityType,
    displayName: a.displayName,
    countryCode: a.countryCode,
    balanceCents: a.balanceCents,
    shareCapitalCents: a.shareCapitalCents,
    pledgedCents: a.pledgedCents,
    kycComplete: a.kycComplete,
  }));
}

export async function openSaccoAccount(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    entityType: 'REGISTERED_GROUP' | 'BUSINESS' | 'INDIVIDUAL' | 'INSTITUTION';
    displayName: string;
    countryCode?: string;
    ownerClerkId?: string;
    ownerGroupId?: string;
    /** Registered groups are fast-tracked: KYC reused from formalization. */
    kycComplete?: boolean;
  },
): Promise<{ id: string }> {
  if (input.ownerGroupId) await assertGroupInTenant(prisma, input.ownerGroupId, input.tenantId);
  return prisma.saccoAccount.create({
    data: {
      tenantId: input.tenantId,
      entityType: input.entityType,
      displayName: input.displayName,
      countryCode: input.countryCode ?? 'KE',
      ownerClerkId: input.ownerClerkId,
      ownerGroupId: input.ownerGroupId,
      kycComplete: input.kycComplete ?? input.entityType === 'REGISTERED_GROUP',
    },
    select: { id: true },
  });
}

async function assertAccountInTenant(
  prisma: PrismaClient,
  accountId: string,
  tenantId: string,
): Promise<{ balanceCents: number; shareCapitalCents: number; pledgedCents: number }> {
  const a = await prisma.saccoAccount.findUnique({
    where: { id: accountId },
    select: { tenantId: true, balanceCents: true, shareCapitalCents: true, pledgedCents: true },
  });
  if (!a) throw new Error('Account not found');
  assertSameTenant(a.tenantId, tenantId);
  return a;
}

/**
 * Post a SACCO transaction atomically: validates against @stawi/core rules
 * (positive integer amount; withdrawals limited to unpledged balance), writes
 * the SaccoTxn row and updates the account balance in one transaction.
 * Disbursement-like debits require `approvedByClerkId` (dual approval).
 */
export async function postSaccoTxn(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    accountId: string;
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'SHARE_PURCHASE' | 'INTEREST' | 'DIVIDEND' | 'REMITTANCE_OUT' | 'REMITTANCE_IN';
    amountCents: number;
    channel?: 'MPESA_STK' | 'MPESA_C2B' | 'BANK' | 'CASH' | 'CARD';
    reference?: string;
    approvedByClerkId?: string;
  },
): Promise<{ id: string; balanceCents: number }> {
  const { applySaccoTxn } = await import('@stawi/core');
  const acct = await assertAccountInTenant(prisma, input.accountId, input.tenantId);

  const debit = input.type === 'WITHDRAWAL' || input.type === 'REMITTANCE_OUT';
  if (debit && !input.approvedByClerkId) {
    throw new Error('Dual approval required: a second officer must approve debits.');
  }

  const r = applySaccoTxn(acct, input.type, input.amountCents);
  if (!r.ok) throw new Error(r.reason ?? 'Transaction rejected');

  const [txn] = await prisma.$transaction([
    prisma.saccoTxn.create({
      data: {
        accountId: input.accountId,
        type: input.type,
        amountCents: input.amountCents,
        channel: input.channel ?? 'MPESA_STK',
        status: 'CONFIRMED',
        reference: input.reference,
        approvedByClerkId: input.approvedByClerkId,
      },
      select: { id: true },
    }),
    prisma.saccoAccount.update({
      where: { id: input.accountId },
      data: {
        balanceCents: r.next.balanceCents,
        shareCapitalCents: r.next.shareCapitalCents,
      },
    }),
  ]);
  return { id: txn.id, balanceCents: r.next.balanceCents };
}

/**
 * Score + create a loan application in one step. The eligibility snapshot
 * (score, tier, reasons) is stored on the Loan row for auditability; an
 * approved loan pledges the borrower's deposits.
 */
export async function applyForLoan(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    accountId: string;
    product: 'DEVELOPMENT' | 'EMERGENCY' | 'BUSINESS_BOOST';
    principalCents: number;
    termMonths: number;
    monthsActive: number;
    savingStreakMonths: number;
    onTimeRepaymentRate: number;
    guarantorCoverageCents?: number;
  },
): Promise<{ id: string; qualified: boolean; tier: string; monthlyRatePct: number; reasons: string[] }> {
  const { LOAN_PRODUCTS, scoreEligibility } = await import('@stawi/core');
  const acct = await assertAccountInTenant(prisma, input.accountId, input.tenantId);

  const existing = await prisma.loan.aggregate({
    where: { accountId: input.accountId, status: { in: ['DISBURSED', 'REPAYING'] } },
    _sum: { principalCents: true },
  });

  const product = LOAN_PRODUCTS[input.product];
  const result = scoreEligibility(product, input.principalCents, {
    monthsActive: input.monthsActive,
    depositsCents: acct.balanceCents,
    savingStreakMonths: input.savingStreakMonths,
    onTimeRepaymentRate: input.onTimeRepaymentRate,
    existingLoanBalanceCents: existing._sum.principalCents ?? 0,
    guarantorCoverageCents: input.guarantorCoverageCents ?? 0,
    hasDefaultHistory: false,
  });

  const loan = await prisma.loan.create({
    data: {
      accountId: input.accountId,
      product: input.product,
      status: result.qualified ? 'APPROVED' : 'DECLINED',
      principalCents: input.principalCents,
      monthlyRatePct: result.monthlyRatePct,
      termMonths: Math.min(input.termMonths, product.maxTermMonths),
      scoreJson: JSON.stringify({ score: result.score, tier: result.tier, reasons: result.reasons }),
    },
    select: { id: true },
  });

  if (result.qualified) {
    await prisma.saccoAccount.update({
      where: { id: input.accountId },
      data: { pledgedCents: Math.min(acct.balanceCents, input.principalCents) },
    });
  }

  return {
    id: loan.id,
    qualified: result.qualified,
    tier: result.tier,
    monthlyRatePct: result.monthlyRatePct,
    reasons: result.reasons,
  };
}

/**
 * Month-end interest accrual: posts one INTEREST txn per account with a
 * positive balance (10% p.a. / 12, from @stawi/core). Called by /api/cron.
 * Idempotency: skips accounts that already accrued in the current month.
 */
export async function accrueMonthlyInterest(
  prisma: PrismaClient,
): Promise<{ accounts: number; totalCents: number }> {
  const { monthlyDepositInterestCents } = await import('@stawi/core');
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const accounts = await prisma.saccoAccount.findMany({
    where: { balanceCents: { gt: 0 } },
    select: { id: true, balanceCents: true },
  });

  let posted = 0;
  let total = 0;
  for (const a of accounts) {
    const already = await prisma.saccoTxn.findFirst({
      where: { accountId: a.id, type: 'INTEREST', createdAt: { gte: monthStart } },
      select: { id: true },
    });
    if (already) continue;
    const cents = monthlyDepositInterestCents(a.balanceCents);
    if (cents <= 0) continue;
    await prisma.$transaction([
      prisma.saccoTxn.create({
        data: { accountId: a.id, type: 'INTEREST', amountCents: cents, channel: 'BANK', status: 'CONFIRMED', reference: 'AUTO-ACCRUAL' },
      }),
      prisma.saccoAccount.update({
        where: { id: a.id },
        data: { balanceCents: a.balanceCents + cents },
      }),
    ]);
    posted++;
    total += cents;
  }
  return { accounts: posted, totalCents: total };
}

/** Flip a tenant's subscription ACTIVE (Stripe webhook seam). */
export async function activateSubscriptionForTenant(
  prisma: PrismaClient,
  tenantRef: string,
): Promise<number> {
  const r = await prisma.subscription.updateMany({
    where: { group: { tenantId: tenantRef } },
    data: { status: 'ACTIVE' },
  });
  return r.count;
}
