# Stawi — Multi-Tenant SaaS Architecture

Stawi is a **multi-tenant SaaS**: many independent organizations (Tenants) share
one deployment with isolated data and per-tenant billing.

## Hierarchy
```
Platform (super-admin)
└── Tenant            ← billing & isolation boundary (org / federation / enterprise)
    ├── TenantMember  ← OWNER / ADMIN / MANAGER / MEMBER
    └── Group(s)      ← chama / SHG / SACCO / business
        ├── Membership ← CHAIRMAN / SECRETARY / TREASURER / SIGNATORY / MEMBER
        ├── Contributions, Cycles
        ├── Subscription (plan tier)
        └── Business → ledger, stock, ventures
```

## Isolation
- Every Group (and its data) belongs to a `Tenant` via `tenantId`.
- `@stawi/core` `tenancy.ts` provides `tenantScope(tenantId)` — a guard every
  query must apply; it throws if no tenant is in context.
- Roles cascade and are checked with `tenantRoleAtLeast(role, required)`.
- Recommended hardening for production: Postgres Row-Level Security keyed on
  `tenantId`, plus a request-scoped tenant resolver (subdomain `slug.stawi.app`
  or path `/t/{slug}`) set from Clerk’s active organization.

## Plans & billing (`plans.ts`)
| Tier | Price (USD/mo) | Members | Groups | Trial |
|------|----------------|---------|--------|-------|
| Free | 0 | 10 | 1 | — |
| Starter | $10 | 50 | 3 | 1 month free |
| Growth | $49 | 250 | 15 | 1 month free |
| Enterprise | custom | ∞ | ∞ | 1 month free |

- Prices are base-USD, localized per country via the compliance registry.
- `amountDueUsdCents(tier, monthsActive)` enforces first-month-free.
- `withinMemberLimit` / `withinGroupLimit` gate tenant growth against the plan.

## Data model additions
`Tenant`, `TenantMember`, `Group.tenantId`, `Subscription.planTier` + `currency` +
`termsAcceptedAt`, and a `ModerationLog` for trust-and-safety auditing (see schema).

## Onboarding a tenant (flow)
1. Owner signs up → a `Tenant` is created (slug from name) + Owner `TenantMember`.
2. Owner accepts Subscription Terms (`termsAcceptedAt`) and picks a plan.
3. Owner creates Groups under the tenant; members are invited.
4. All reads/writes are tenant-scoped from then on.

## Enforcement status (implemented)
- Query-layer isolation is **live** in `@stawi/db` repo: `getTenantContext` resolves
  the caller's tenant; `getMemberGroups` / `getGroupBusiness` / `recordContribution`
  / `addLedgerEntry` all filter/guard by `tenantId` (`assertGroupInTenant` /
  `assertSameTenant`). `lib/data.ts` resolves the tenant once and threads it through.
- `prisma/rls.sql` provides Postgres Row-Level Security (defence-in-depth) keyed on
  the `app.tenant_id` session GUC — apply after `migrate deploy`.
- Seed creates a `Tenant` ("Umoja Federation") owning all three demo groups.
- Still to wire for full prod: subdomain/path tenant resolver + setting
  `app.tenant_id` per DB transaction.
