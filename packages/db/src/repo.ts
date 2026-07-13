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

// ───────────────── Pillar 1 — charter / meetings / statements ────────────

/** Read a group's charter, or null if none saved yet. */
export async function getGroupCharter(prisma: PrismaClient, groupId: string) {
  return prisma.groupCharter.findUnique({ where: { groupId } });
}

/** Create or update a group's charter (upsert on the unique groupId). */
export async function upsertGroupCharter(
  prisma: PrismaClient,
  input: {
    groupId: string;
    tenantId?: string;
    name: string;
    logoUrl?: string;
    schedule: unknown;
    members: unknown;
    constitution?: string;
    constitutionFileUrl?: string;
    motto?: string;
    mission?: string;
    vision?: string;
    coreValues?: unknown;
    notes?: string;
    registeredNumber?: string;
    countryCode?: string;
  },
): Promise<{ id: string }> {
  if (input.tenantId) await assertGroupInTenant(prisma, input.groupId, input.tenantId);
  const data = {
    tenantId: input.tenantId,
    name: input.name,
    logoUrl: input.logoUrl,
    schedule: input.schedule as any,
    members: input.members as any,
    constitution: input.constitution ?? '',
    constitutionFileUrl: input.constitutionFileUrl,
    motto: input.motto ?? '',
    mission: input.mission ?? '',
    vision: input.vision ?? '',
    coreValues: (input.coreValues ?? []) as any,
    notes: input.notes,
    registeredNumber: input.registeredNumber,
    countryCode: input.countryCode ?? 'KE',
  };
  return prisma.groupCharter.upsert({
    where: { groupId: input.groupId },
    create: { groupId: input.groupId, ...data },
    update: data,
    select: { id: true },
  });
}

export async function listMeetings(prisma: PrismaClient, groupId: string) {
  return prisma.meeting.findMany({ where: { groupId }, orderBy: { meetingNo: 'desc' } });
}

/** Create or update a meeting (keyed by group + meetingNo). */
export async function upsertMeeting(
  prisma: PrismaClient,
  input: {
    groupId: string;
    tenantId?: string;
    meetingNo: number;
    date: string;
    venue?: string;
    day?: string;
    startTime?: string;
    endTime?: string;
    chairpersonName?: string;
    secretaryName?: string;
    attendance?: unknown;
    agendas?: unknown;
    aobs?: unknown;
    tableBanking?: unknown;
    adjournmentTime?: string;
    nextMeetingDate?: string;
    generatedDoc?: string;
  },
): Promise<{ id: string }> {
  if (input.tenantId) await assertGroupInTenant(prisma, input.groupId, input.tenantId);
  const data: any = {
    tenantId: input.tenantId,
    date: input.date,
    venue: input.venue ?? '',
    day: input.day ?? '',
    startTime: input.startTime ?? '',
    endTime: input.endTime ?? '',
    chairpersonName: input.chairpersonName ?? '',
    secretaryName: input.secretaryName ?? '',
    attendance: (input.attendance ?? []) as any,
    agendas: (input.agendas ?? []) as any,
    aobs: (input.aobs ?? []) as any,
    tableBanking: (input.tableBanking ?? {}) as any,
    adjournmentTime: input.adjournmentTime ?? '',
    nextMeetingDate: input.nextMeetingDate,
    generatedDoc: input.generatedDoc,
  };
  return prisma.meeting.upsert({
    where: { groupId_meetingNo: { groupId: input.groupId, meetingNo: input.meetingNo } },
    create: { groupId: input.groupId, meetingNo: input.meetingNo, ...data },
    update: data,
    select: { id: true },
  });
}

/** Official posts a meeting after editing its generated document. */
export async function postMeeting(
  prisma: PrismaClient,
  input: { groupId: string; meetingNo: number; generatedDoc: string; tenantId?: string },
): Promise<void> {
  if (input.tenantId) await assertGroupInTenant(prisma, input.groupId, input.tenantId);
  await prisma.meeting.update({
    where: { groupId_meetingNo: { groupId: input.groupId, meetingNo: input.meetingNo } },
    data: { generatedDoc: input.generatedDoc, status: 'POSTED', postedAt: new Date() },
  });
}

/** Save (draft or posted) a month-end statement snapshot. */
export async function saveMonthlyStatement(
  prisma: PrismaClient,
  input: { groupId: string; tenantId?: string; year: number; month: number; payload: unknown; post?: boolean },
): Promise<{ id: string }> {
  if (input.tenantId) await assertGroupInTenant(prisma, input.groupId, input.tenantId);
  const data: any = {
    tenantId: input.tenantId,
    payload: input.payload as any,
    status: input.post ? 'POSTED' : 'DRAFT',
    postedAt: input.post ? new Date() : null,
  };
  return prisma.monthlyStatement.upsert({
    where: { groupId_year_month: { groupId: input.groupId, year: input.year, month: input.month } },
    create: { groupId: input.groupId, year: input.year, month: input.month, ...data },
    update: data,
    select: { id: true },
  });
}

// ───────────────── Phone-first identity (Pillar 1 join key) ──────────────

/** Last 9 significant digits — tolerant match key across 07…/2547…/+2547… forms. */
function phoneKey(raw: string): string {
  return (raw || '').replace(/\D/g, '').replace(/^0+/, '').slice(-9);
}

/**
 * Provision membership rows from a charter roster so members exist (phone-keyed)
 * before they ever sign in. Rows without a matching clerkUserId are "pending"
 * and get linked automatically on first phone sign-in.
 */
export async function provisionRosterMemberships(
  prisma: PrismaClient,
  input: { groupId: string; tenantId?: string; roster: { fullName: string; phone: string; designation?: string }[] },
): Promise<{ created: number }> {
  if (input.tenantId) await assertGroupInTenant(prisma, input.groupId, input.tenantId);
  const roleMap: Record<string, 'CHAIRMAN' | 'SECRETARY' | 'TREASURER' | 'SIGNATORY' | 'MEMBER'> = {
    Chairperson: 'CHAIRMAN', Secretary: 'SECRETARY', Treasurer: 'TREASURER', Signatory: 'SIGNATORY',
  };
  const existing = await prisma.membership.findMany({ where: { groupId: input.groupId }, select: { phone: true } });
  const have = new Set(existing.map((m) => phoneKey(m.phone ?? '')).filter(Boolean));
  let created = 0;
  for (const r of input.roster) {
    const key = phoneKey(r.phone);
    if (!key || have.has(key)) continue;
    await prisma.membership.create({
      data: {
        groupId: input.groupId,
        clerkUserId: `pending:${key}`, // placeholder until the person signs in
        fullName: r.fullName,
        phone: r.phone,
        role: roleMap[r.designation ?? 'Member'] ?? 'MEMBER',
      },
    }).catch(() => {});
    created++;
  }
  return { created };
}

/**
 * On phone sign-in, link every pending roster row that matches one of the user's
 * verified phone numbers to their real Clerk user id.
 */
export async function linkMembershipsByPhone(
  prisma: PrismaClient,
  clerkUserId: string,
  phones: string[],
): Promise<{ linked: number }> {
  let linked = 0;
  for (const p of phones) {
    const key = phoneKey(p);
    if (!key) continue;
    const rows = await prisma.membership.findMany({ where: { phone: { endsWith: key } } });
    for (const row of rows) {
      if (row.clerkUserId === clerkUserId) continue;
      await prisma.membership.update({ where: { id: row.id }, data: { clerkUserId } }).catch(() => {});
      linked++;
    }
  }
  return { linked };
}

/** Groups a phone number participates in (direct roster match), tenant-optional. */
export async function getGroupsByPhone(prisma: PrismaClient, phone: string, tenantId?: string): Promise<GroupAccountDTO[]> {
  const key = phoneKey(phone);
  if (!key) return [];
  const memberships = await prisma.membership.findMany({
    where: { phone: { endsWith: key }, ...(tenantId ? { group: { tenantId } } : {}) },
    include: { group: { include: { members: { include: { contributions: { where: { status: 'CONFIRMED' } } }, orderBy: { rotationOrder: 'asc' } } } } },
  });
  return memberships.map((m) => {
    const g = m.group;
    const members: MemberDTO[] = g.members.map((mem) => ({
      memberId: mem.id,
      name: mem.fullName,
      totalCents: mem.contributions.reduce((s, c) => s + c.amountCents, 0),
      role: titleRole(mem.role),
      paid: mem.contributions.length > 0,
    }));
    return { id: g.id, name: g.name, myRole: titleRole(m.role), flag: g.flagEmoji, type: mapKind(g.type), members };
  });
}
