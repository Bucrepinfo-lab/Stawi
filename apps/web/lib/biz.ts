/**
 * Business books (owner 28/11/26): load one business's books for the person
 * looking, with least-privilege access applied on the server. A staff member
 * receives only their own branch's entries; the owner and officials receive
 * everything. Older records (the first "Books" screen) are shown as entries of
 * the main branch so nothing written before is lost.
 */
import { bizAccess, bizToday, COUNTRY_TIME_ZONE, type BizAccess, type BizBranch, type BizEntry, type BizLevel, type BizSupplier, type RestockItem, type RestockStatus } from '@stawi/core';
import { myGroupRole, myMembershipIds } from './group-access';

export interface BizBooksView {
  groupId: string;
  businessId: string;
  name: string;
  level: BizLevel;
  vatRegistered: boolean;
  today: string;
  access: BizAccess;
  branches: BizBranch[];
  items: RestockItem[];
  entries: BizEntry[];
  suppliers: BizSupplier[];
  restocks: { id: string; supplierId: string; supplierName: string; branchId: string; lines: { itemId: string; name: string; unit: string; qty: number | null }[]; status: RestockStatus; deliverOn: string | null; supplierNote: string | null; createdAt: string }[];
  country: string;
  closes: { branchId: string; day: string; closedByName: string }[];
  staff: { membershipId: string; name: string; phone: string | null; branchId: string }[];
  myName: string;
}

const LEVELS: BizLevel[] = ['SIMPLE', 'GROWING', 'BUSY'];

/** Make sure a business has its first branch ("Main"); returns the branches. */
export async function ensureBranches(businessId: string, groupId: string): Promise<BizBranch[]> {
  const { prisma } = await import('@stawi/db');
  let rows = await prisma.bizBranch.findMany({ where: { businessId, archivedAt: null }, orderBy: { createdAt: 'asc' } });
  if (rows.length === 0) {
    await prisma.bizBranch.create({ data: { businessId, groupId, name: 'Main' } }).catch(() => undefined);
    rows = await prisma.bizBranch.findMany({ where: { businessId, archivedAt: null }, orderBy: { createdAt: 'asc' } });
  }
  return rows.map((b) => ({ id: b.id, name: b.name, town: b.town ?? undefined }));
}

/** The person's access to this group's business, or null. Server-side only. */
export async function bizAccessFor(groupId: string, businessId: string, branchIds: string[]): Promise<{ access: BizAccess; membershipIds: string[] } | null> {
  const [role, membershipIds] = await Promise.all([myGroupRole(groupId), myMembershipIds(groupId)]);
  if (!role || membershipIds.length === 0) return null;
  const { prisma } = await import('@stawi/db');
  const staff = await prisma.bizStaff.findMany({ where: { businessId, membershipId: { in: membershipIds } }, select: { branchId: true } });
  const access = bizAccess(role, staff.map((s) => s.branchId), branchIds);
  return access ? { access, membershipIds } : null;
}

export async function loadBizBooks(groupId: string): Promise<BizBooksView | null> {
  const { prisma } = await import('@stawi/db');
  const biz = await prisma.business.findUnique({ where: { groupId }, select: { id: true, name: true, level: true, vatRegistered: true, group: { select: { countryCode: true } } } });
  if (!biz) return null;
  const branches = await ensureBranches(biz.id, groupId);
  const who = await bizAccessFor(groupId, biz.id, branches.map((b) => b.id));
  if (!who) return null;
  const { access, membershipIds } = who;
  const seen = access.seeAll ? undefined : { in: access.branchIds };

  const none = '__staff_none__';
  const [items, rows, old, closes, staffRows, me, suppliers, restocks] = await Promise.all([
    prisma.bizItem.findMany({ where: { businessId: biz.id, archivedAt: null }, orderBy: { name: 'asc' } }),
    prisma.bizEntry.findMany({ where: { businessId: biz.id, ...(seen ? { branchId: seen } : {}) }, orderBy: [{ day: 'asc' }, { recordedAt: 'asc' }] }),
    // Staff never receive the older whole-business records (they belong to no branch).
    prisma.ledgerEntry.findMany({ where: { businessId: access.seeAll ? biz.id : '__staff_none__' }, orderBy: { occurredAt: 'asc' } }),
    prisma.bizDayClose.findMany({ where: { businessId: biz.id, ...(seen ? { branchId: seen } : {}) }, select: { branchId: true, day: true, closedByName: true } }),
    prisma.bizStaff.findMany({ where: { businessId: access.seeAll ? biz.id : '__staff_none__' } }),
    prisma.membership.findFirst({ where: { id: { in: membershipIds } }, select: { fullName: true } }),
    // Suppliers and restock requests belong to the owner side only.
    prisma.bizSupplier.findMany({ where: { businessId: access.seeAll ? biz.id : none, archivedAt: null }, orderBy: { name: 'asc' } }),
    prisma.bizRestockRequest.findMany({ where: { businessId: access.seeAll ? biz.id : none }, orderBy: { createdAt: 'desc' }, take: 60 }),
  ]);
  const staffMembers = staffRows.length ? await prisma.membership.findMany({ where: { id: { in: staffRows.map((s) => s.membershipId) } }, select: { id: true, fullName: true, phone: true } }) : [];
  const main = branches[0]!.id;
  const tz = COUNTRY_TIME_ZONE[(biz.group.countryCode ?? 'KE').toUpperCase()] ?? 'Africa/Nairobi';

  const entries: BizEntry[] = [
    // The first "Books" screen's records, kept: sales, purchases (as stock bought) and costs.
    ...old.map((o): BizEntry => ({
      id: `old-${o.id}`,
      kind: o.type === 'SALE' ? 'SALE' : o.type === 'PURCHASE' ? 'STOCK_IN' : 'EXPENSE',
      amountCents: o.amountCents,
      channel: 'CASH',
      day: bizToday(o.occurredAt, tz),
      branchId: main,
      category: o.type === 'EXPENSE' ? 'OTHER' : undefined,
      note: o.description,
      recordedBy: 'Earlier records',
      recordedAt: o.createdAt.toISOString(),
    })),
    ...rows.map((r): BizEntry => ({
      id: r.id,
      kind: r.kind as BizEntry['kind'],
      amountCents: r.amountCents,
      channel: r.channel as BizEntry['channel'],
      toChannel: (r.toChannel ?? undefined) as BizEntry['toChannel'],
      day: r.day,
      branchId: r.branchId,
      itemId: r.itemId ?? undefined,
      qty: r.qty ?? undefined,
      costCents: access.seeAll ? r.costCents ?? undefined : undefined,
      party: r.party ?? undefined,
      category: (r.category ?? undefined) as BizEntry['category'],
      opening: (r.opening ?? undefined) as BizEntry['opening'],
      note: r.note ?? undefined,
      etims: r.etims,
      reverses: r.reversesId ?? undefined,
      recordedBy: r.recordedByName,
      recordedAt: r.recordedAt.toISOString(),
    })),
  ];

  return {
    groupId,
    businessId: biz.id,
    name: biz.name,
    level: (LEVELS as string[]).includes(biz.level) ? (biz.level as BizLevel) : 'SIMPLE',
    vatRegistered: biz.vatRegistered,
    today: bizToday(new Date(), tz),
    access,
    branches: access.seeAll ? branches : branches.filter((b) => access.branchIds.includes(b.id)),
    items: items.map((i) => ({ id: i.id, name: i.name, unit: i.unit, priceCents: i.priceCents, reorderAt: i.reorderAt, service: i.service, supplierId: access.seeAll ? i.supplierId : null })),
    entries,
    suppliers: suppliers.map((s) => ({ id: s.id, name: s.name, phone: s.phone, leadDays: s.leadDays })),
    restocks: restocks.map((r) => ({
      id: r.id, supplierId: r.supplierId, supplierName: r.supplierName, branchId: r.branchId,
      lines: (r.lines as { itemId: string; name: string; unit: string; qty: number | null }[]) ?? [],
      status: r.status as RestockStatus, deliverOn: r.deliverOn, supplierNote: r.supplierNote, createdAt: r.createdAt.toISOString(),
    })),
    country: (biz.group.countryCode ?? 'KE').toUpperCase(),
    closes,
    staff: staffRows.map((s) => {
      const m = staffMembers.find((x) => x.id === s.membershipId);
      return { membershipId: s.membershipId, name: m?.fullName ?? 'Staff', phone: m?.phone ?? null, branchId: s.branchId };
    }),
    myName: me?.fullName ?? 'Me',
  };
}

/** Businesses this person owns that are closed (owner 28/11/26), for "Reopen". */
export async function myClosedBusinesses(): Promise<{ groupId: string; name: string }[]> {
  if (!process.env.DATABASE_URL) return [];
  const { getUserId } = await import('./auth');
  const userId = await getUserId();
  if (!userId) return [];
  const { prisma } = await import('@stawi/db');
  const rows = await prisma.membership.findMany({
    where: { clerkUserId: userId, role: 'CHAIRMAN', leftAt: null, group: { closedAt: { not: null }, business: { isNot: null } } },
    select: { group: { select: { id: true, name: true } } },
    take: 50,
  });
  return rows.map((r) => ({ groupId: r.group.id, name: r.group.name }));
}
