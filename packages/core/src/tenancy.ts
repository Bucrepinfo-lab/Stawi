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
  slug: string;
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

const RESERVED = new Set(['www', 'app', 'api', 'admin', 'static', 'cdn', 'assets', 'mail']);

/**
 * Resolve the tenant slug for a request from either:
 *  - a subdomain:  `umoja.stawi.app`  → "umoja"
 *  - a path prefix: `/t/umoja/...`     → "umoja"
 * Returns null when no tenant is addressed (the marketing/root site).
 */
export function resolveTenantSlug(input: {
  host?: string | null;
  pathname?: string | null;
  rootDomain?: string; // e.g. "stawi.app"
}): string | null {
  const { host, pathname, rootDomain = 'stawi.app' } = input;

  // Path form: /t/{slug}
  if (pathname) {
    const m = pathname.match(/^\/t\/([a-z0-9-]+)(?:\/|$)/i);
    if (m) return m[1]!.toLowerCase();
  }

  // Subdomain form: {slug}.{rootDomain}
  if (host) {
    const h = host.split(':')[0]!.toLowerCase(); // strip port
    if (h.endsWith(`.${rootDomain}`)) {
      const sub = h.slice(0, -(rootDomain.length + 1));
      const label = sub.split('.')[0]!; // leftmost label
      if (label && !RESERVED.has(label)) return label;
    }
  }
  return null;
}

/** Tenant isolation guard returning a Prisma-style where fragment. */
export function tenantScope(tenantId: string | undefined): { tenantId: string } {
  if (!tenantId) throw new Error('Tenant context required (no tenantId)');
  return { tenantId };
}

/** Row-level isolation check: a row's tenantId MUST match the caller's tenant. */
export function assertSameTenant(
  rowTenantId: string | null | undefined,
  ctxTenantId: string | undefined,
): void {
  if (!ctxTenantId) throw new Error('Tenant context required');
  if (rowTenantId !== ctxTenantId) throw new Error('Cross-tenant access denied');
}

const RANK: Record<TenantRole, number> = { OWNER: 3, ADMIN: 2, MANAGER: 1, MEMBER: 0 };
export function tenantRoleAtLeast(role: TenantRole, required: TenantRole): boolean {
  return RANK[role] >= RANK[required];
}
