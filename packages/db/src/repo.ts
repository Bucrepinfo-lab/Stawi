/**
 * Stawi repository — typed, TENANT-SCOPED queries that map Prisma rows to DTOs.
 *
 * Tenant isolation is enforced at the query layer: callers pass a tenantId
 * (resolved from the signed-in user's TenantMember), and every read/write is
 * filtered to that tenant. A Postgres RLS layer (prisma/rls.sql) provides
 * defence-in-depth. Requires a generated Prisma client + live DATABASE_URL.
 */

import type { PrismaClient, GroupType, MemberRole } from '@prisma/client';
import { assertSameTenant, type TenantContext, type TenantRole } from './index.js';
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
