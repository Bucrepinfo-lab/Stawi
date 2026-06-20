/**
 * Server-side data provider — single seam between the UI and storage.
 *
 * DB mode (DATABASE_URL set): resolves the signed-in user's tenant, then runs
 * TENANT-SCOPED queries via @stawi/db. Seed mode: returns bundled demo data.
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

/** Resolve { prisma, tenantId, userId } in DB mode, or null in seed mode. */
async function tenantCtx() {
  if (!dbEnabled()) return null;
  const db = await import('@stawi/db');
  const { auth } = await import('@clerk/nextjs/server');
  const { userId } = await auth();
  if (!userId) return null;
  const ctx = await db.getTenantContext(db.prisma, userId);
  return { db, userId, tenantId: ctx?.tenantId };
}

/** All groups the signed-in member belongs to, scoped to their tenant. */
export async function getMyGroups(): Promise<GroupAccount[]> {
  const c = await tenantCtx();
  if (!c) return MY_GROUPS;
  const dtos = await c.db.getMemberGroups(c.db.prisma, c.userId, c.tenantId);
  return dtos as unknown as GroupAccount[];
}

/** Business books for each given group id (tenant-scoped). */
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
              type: e.type,
              description: e.description,
              amountCents: e.amountCents,
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
