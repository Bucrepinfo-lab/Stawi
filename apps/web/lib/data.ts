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
  // Primary: groups where this Clerk user is a linked member.
  const byUser = await c.db.getMemberGroups(c.db.prisma, c.userId, c.tenantId);
  // Phone-first: also surface groups whose roster carries the user's phone number
  // (covers the window before the sign-in webhook links pending roster rows).
  let byPhone: unknown[] = [];
  try {
    const { currentUser } = await import('@clerk/nextjs/server');
    const u = await currentUser();
    const phone = u?.primaryPhoneNumber?.phoneNumber
      ?? u?.phoneNumbers?.[0]?.phoneNumber;
    if (phone) byPhone = await c.db.getGroupsByPhone(c.db.prisma, phone, c.tenantId ?? undefined);
  } catch { /* phone lookup is best-effort */ }
  const merged = new Map<string, GroupAccount>();
  for (const g of [...(byUser as GroupAccount[]), ...(byPhone as GroupAccount[])]) merged.set(g.id, g);
  return [...merged.values()];
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

// ───────────────────────── SACCO+ (Pillar 4) ─────────────────────────

export interface WebSaccoAccount {
  id: string;
  entityType: 'REGISTERED_GROUP' | 'BUSINESS' | 'INDIVIDUAL' | 'INSTITUTION';
  displayName: string;
  countryCode: string;
  balanceCents: number;
  shareCapitalCents: number;
  pledgedCents: number;
  kycComplete: boolean;
}

const SEED_SACCO: WebSaccoAccount[] = [
  {
    id: 'seed-sacco-umoja',
    entityType: 'REGISTERED_GROUP',
    displayName: 'Umoja Chama',
    countryCode: 'KE',
    balanceCents: 12_800_000, // KES 128,000
    shareCapitalCents: 3_200_000,
    pledgedCents: 0,
    kycComplete: true,
  },
];

/** SACCO+ accounts for the signed-in caller (seed fallback without a DB). */
export async function getSaccoAccountsData(): Promise<WebSaccoAccount[]> {
  const c = await tenantCtx();
  if (!c || !c.tenantId) return SEED_SACCO;
  const { getSaccoAccounts } = c.db;
  return getSaccoAccounts(c.db.prisma, c.tenantId, c.userId);
}

// ───────────────────────── Viewer role (visibility grading) ─────────────────

export type ViewerRole = 'MEMBER' | 'OFFICIAL' | 'SUPER_ADMIN';

/**
 * Who is looking? Grades what the UI reveals (e.g. prudential ratios on the
 * institution ladder are officials+ only). SUPER_ADMIN = clerk user ids in
 * SUPER_ADMIN_CLERK_IDS (comma-separated). Tenant OWNER/ADMIN/MANAGER =
 * OFFICIAL. Seed mode defaults to OFFICIAL so demos show the full view.
 */
export async function getViewerRole(): Promise<ViewerRole> {
  if (!dbEnabled()) return 'OFFICIAL';
  const { auth } = await import('@clerk/nextjs/server');
  const { userId } = await auth();
  if (!userId) return 'MEMBER';
  const supers = (process.env.SUPER_ADMIN_CLERK_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (supers.includes(userId)) return 'SUPER_ADMIN';
  const db = await import('@stawi/db');
  const ctx = await db.getTenantContext(db.prisma, userId);
  if (!ctx) return 'MEMBER';
  return ctx.role === 'OWNER' || ctx.role === 'ADMIN' || ctx.role === 'MANAGER' ? 'OFFICIAL' : 'MEMBER';
}
