/**
 * Multi-tenancy primitives.
 *
 * A Tenant is the top-level billing & isolation boundary (an organization,
 * federation, or enterprise). Each Tenant owns many Groups/Businesses; every
 * data row is scoped by tenantId. Roles cascade: platform → tenant → group.
 */

import type { PlanTier } from './plans.js';
import type { CountryCode } from './compliance.js';

export type TenantRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';

export interface Tenant {
  id: string;
  name: string;
  slug: string;           // subdomain / path key, e.g. "umoja"
  countryCode: CountryCode;
  planTier: PlanTier;
  createdAtISO: string;
}

export interface TenantContext {
  tenantId: string;
  role: TenantRole;
}

/** Make a URL-safe, unique-ish slug from a tenant name. */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'tenant';
}

/**
 * Tenant isolation guard: every query must be scoped to the caller's tenant.
 * Returns a Prisma-style `where` fragment; throws if no tenant in context.
 */
export function tenantScope(tenantId: string | undefined): { tenantId: string } {
  if (!tenantId) throw new Error('Tenant context required (no tenantId)');
  return { tenantId };
}

/**
 * Row-level isolation check: a row's tenantId MUST match the caller's tenant.
 * Throws on mismatch — used before returning or mutating any tenant-owned row.
 */
export function assertSameTenant(
  rowTenantId: string | null | undefined,
  ctxTenantId: string | undefined,
): void {
  if (!ctxTenantId) throw new Error('Tenant context required');
  if (rowTenantId !== ctxTenantId) {
    throw new Error('Cross-tenant access denied');
  }
}

/** Does `role` meet or exceed `required` in the tenant hierarchy? */
const RANK: Record<TenantRole, number> = { OWNER: 3, ADMIN: 2, MANAGER: 1, MEMBER: 0 };
export function tenantRoleAtLeast(role: TenantRole, required: TenantRole): boolean {
  return RANK[role] >= RANK[required];
}
