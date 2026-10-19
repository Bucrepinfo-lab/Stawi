---
name: tenant-isolation-guard
description: Use when adding or editing any query, Prisma model, or table in Stawi to enforce multi-tenant isolation — every query uses tenantScope/assertSameTenant, every tenant-owned table has an RLS policy in rls.sql keyed on app.tenant_id, and app.tenant_id is set per transaction.
---

# Tenant Isolation Guard

**Purpose:** Stawi is multi-tenant SaaS (Platform → Tenant → Group → Membership).
A cross-tenant leak is a catastrophic failure. Isolation is enforced twice: at the
query layer (application code) and by Postgres Row-Level Security (defence-in-depth).
Both must cover every tenant-owned row.

## When to use
- Writing/editing any read or write in `packages/db` (`repo.ts`, `lib/data.ts`).
- Adding or changing a Prisma model in `packages/db/prisma/schema.prisma`.
- Reviewing a feature that touches tenant-owned data.

## Ground-truth files (read before editing)
- `TENANCY.md` — hierarchy, isolation model, enforcement status.
- `packages/core/src/tenancy.ts` — `tenantScope(tenantId)` (throws if no tenant),
  `assertSameTenant(rowTenantId, ctxTenantId)`, `resolveTenantSlug` (subdomain
  `slug.stawi.app` or path `/t/{slug}`), `tenantRoleAtLeast`.
- `packages/db/src/repo.ts` — `getTenantContext`, `assertGroupInTenant`, and the
  pattern where every query filters by `tenantId`.
- `packages/db/prisma/rls.sql` — RLS policies keyed on the `app.tenant_id` GUC via
  `app_current_tenant()`; tenant anchors (`Group`, `Tenant`, `TenantMember`),
  group-chained children, business-chained children, SACCO+ tables.
- Test: `packages/core/test/tenancy.test.ts`.

## The query-layer rule
Every query must be scoped:
- Resolve the caller's tenant once with `getTenantContext(prisma, userId)`.
- Reads: include `tenantScope(tenantId)` / filter `{ tenantId }` (directly, or via
  `group: { tenantId }` for group-chained rows).
- Any row fetched by id that carries a tenant: call `assertSameTenant(row.tenantId,
  ctx.tenantId)` (or `assertGroupInTenant` for group children) before using it.
- Never trust a client-supplied tenantId; derive it from the signed-in
  `TenantMember`. The request-scoped slug resolver (`resolveTenantSlug`) sets the
  tenant from subdomain/path.

## The RLS rule
- Every tenant-owned table needs a policy in `rls.sql`, keyed on `app_current_tenant()`.
- The app sets the tenant **per transaction**:
  `SELECT set_config('app.tenant_id', '<tenantId>', true);` (true = tx-local), via
  the repo's `withTenantRls` / `prisma.$transaction`. This is the post-deploy
  hardening step still being wired (PRE-DEPLOY-CHECKLIST) — set it at the start of
  every tenant-scoped transaction.
- Apply RLS after migrations: `psql "$DATABASE_URL" -f packages/db/prisma/rls.sql`.
- Keep a BYPASSRLS role for migrations/ops only.

## Checklist — adding a new tenant-owned model
1. Decide how it inherits tenant: direct `tenantId` column, or via `groupId` /
   `businessId` (group-chained / business-chained).
2. Add the model + relation to `schema.prisma`.
3. Add an RLS policy in `rls.sql`: direct-tenant tables get a `tenantId =
   app_current_tenant()` policy; group/business-chained tables join up to `Group`
   and reuse the `FOREACH t IN ARRAY [...]` block (add the table name to the array).
4. Every repo query for the model filters/guards by tenant (`tenantScope` /
   `assertSameTenant` / `assertGroupInTenant`).
5. Ensure writes happen inside a transaction that has `app.tenant_id` set.
6. Add a tenancy test asserting a second tenant cannot read/write the row.

## Guardrails
- No query ships without tenant scoping, and no tenant-owned table ships without an
  RLS policy — these are acceptance criteria, not optional hardening.
- `tenantScope(undefined)` throws by design; never swallow it or default a tenant.
- RLS is defence-in-depth, not a substitute for query-layer filtering — keep both.
- COMPLIANCE.md: RLS must be activated per transaction; verify it is wired before a
  production launch.
