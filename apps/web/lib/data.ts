/**
 * Server-side data provider — single seam between the UI and storage.
 *
 * DB mode: resolves the active tenant from the request (the middleware sets
 * `x-stawi-tenant-slug` from the subdomain or /t/{slug}); if absent, defaults to
 * the user's own tenant. All queries are tenant-scoped. Seed mode: bundled demo.
 */

import { MY_GROUPS, type GroupAccount } from './groups';
import { GROUP_BUSINESS } from './books';

export interface WebBooks {
  businessId?: string;
  name: string;
  vatRegistered: boolean;
  tourismSector: boolean;
  entries: { type: 'SALE' | 'PURCHASE' | 'EXPENSE'; description: string; amountCents: number; occurredAt: string }[];
  stock: { id: string; name: string; quantity: number; reorderLevel: number; soldInWindow: number; supplierName?: string; supplierPhone?: string }[];
}

export const dbEnabled = () => !!process.env.DATABASE_URL;

// Sentinel that matches no tenant — used when a user addresses a tenant they
// don't belong to, so queries return nothing instead of leaking their own data.
const DENY = '__deny__';

async function tenantCtx() {
  if (!dbEnabled()) return null;
  const db = await import('@stawi/db');
  const { auth } = await import('@clerk/nextjs/server');
  const { headers } = await import('next/headers');
  const { userId } = await auth();
  if (!userId) return null;

  const slug = (await headers()).get('x-stawi-tenant-slug');
  let tenantId: string | undefined;
  if (slug) {
    const ctx = await db.getTenantContextBySlug(db.prisma, userId, slug);
    tenantId = ctx?.tenantId ?? DENY; // not a member → deny
  } else {
    const ctx = await db.getTenantContext(db.prisma, userId);
    tenantId = ctx?.tenantId;
  }
  return { db, userId, tenantId };
}

export async function getMyGroups(): Promise<GroupAccount[]> {
  const c = await tenantCtx();
  if (!c) return MY_GROUPS;
  const dtos = await c.db.getMemberGroups(c.db.prisma, c.userId, c.tenantId);
  return dtos as unknown as GroupAccount[];
}

export async function getBusinessMap(
  groupIds: string[],
): Promise<Record<string, WebBooks | null>> {
  const out: Record<string, WebBooks | null> = {};
  const c = await tenantCtx();

  if (!c) {
    const now = Date.now();
    for (const id of groupIds) {
      const b = GROUP_BUSINESS[id];
      out[id] = b
        ? {
            name: b.name,
            vatRegistered: b.vatRegistered,
            tourismSector: b.tourismSector,
            entries: b.entries.map((e) => ({
              type: e.type, description: e.description, amountCents: e.amountCents,
              occurredAt: new Date(now - e.dayOffset * 86_400_000).toISOString(),
            })),
            stock: b.stock.map((s) => ({
              id: s.id, name: s.name, quantity: s.quantity, reorderLevel: s.reorderLevel,
              soldInWindow: s.soldInWindow, supplierName: s.supplierName, supplierPhone: s.supplierPhone,
            })),
          }
        : null;
    }
    return out;
  }

  for (const id of groupIds) {
    out[id] = (await c.db.getGroupBusiness(c.db.prisma, id, c.tenantId)) as WebBooks | null;
  }
  return out;
}
