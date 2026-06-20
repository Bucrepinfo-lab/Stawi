/**
 * Server-side data provider — single seam between the UI and storage.
 *
 * If DATABASE_URL is set it loads from Postgres via @stawi/db (dynamic import,
 * so the Prisma client is only pulled in when a DB is configured). Otherwise it
 * falls back to the bundled seed data, so the app runs without a database.
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

/** All groups the signed-in member belongs to. */
export async function getMyGroups(): Promise<GroupAccount[]> {
  if (!dbEnabled()) return MY_GROUPS;
  const { prisma, getMemberGroups } = await import('@stawi/db');
  const { auth } = await import('@clerk/nextjs/server');
  const { userId } = await auth();
  if (!userId) return [];
  const dtos = await getMemberGroups(prisma, userId);
  return dtos as unknown as GroupAccount[]; // structurally identical to GroupAccount
}

/** Business books for each given group id (null = no business yet). */
export async function getBusinessMap(
  groupIds: string[],
): Promise<Record<string, WebBooks | null>> {
  const out: Record<string, WebBooks | null> = {};

  if (!dbEnabled()) {
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
              id: s.id,
              name: s.name,
              quantity: s.quantity,
              reorderLevel: s.reorderLevel,
              soldInWindow: s.soldInWindow,
              supplierName: s.supplierName,
              supplierPhone: s.supplierPhone,
            })),
          }
        : null;
    }
    return out;
  }

  const { prisma, getGroupBusiness } = await import('@stawi/db');
  for (const id of groupIds) {
    out[id] = (await getGroupBusiness(prisma, id)) as WebBooks | null;
  }
  return out;
}
