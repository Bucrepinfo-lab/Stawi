-- Stawi — Postgres Row-Level Security (defence-in-depth for tenant isolation).
--
-- Apply AFTER `prisma migrate deploy`:
--   psql "$DATABASE_URL" -f packages/db/prisma/rls.sql
--
-- The app sets the active tenant per request/connection with:
--   SELECT set_config('app.tenant_id', '<tenantId>', true);   -- true = tx-local
-- (e.g. via prisma.$executeRaw at the start of a tenant-scoped transaction).
-- Rows are then visible only when their tenantId matches the session tenant.
-- The repo also filters by tenantId in application code, so this is a second layer.

-- Helper: current tenant from the session GUC (NULL if unset).
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '');
$$ LANGUAGE sql STABLE;

-- Groups are the tenant anchor.
ALTER TABLE "Group" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS group_tenant_isolation ON "Group";
CREATE POLICY group_tenant_isolation ON "Group"
  USING ("tenantId" IS NULL OR "tenantId" = app_current_tenant());

-- Tenant + membership tables.
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_self ON "Tenant";
CREATE POLICY tenant_self ON "Tenant"
  USING (id = app_current_tenant());

ALTER TABLE "TenantMember" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenantmember_isolation ON "TenantMember";
CREATE POLICY tenantmember_isolation ON "TenantMember"
  USING ("tenantId" = app_current_tenant());

-- Child rows inherit the tenant through their Group.
-- (Run for each tenant-owned child table; example for Contribution.)
ALTER TABLE "Contribution" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contribution_tenant_isolation ON "Contribution";
CREATE POLICY contribution_tenant_isolation ON "Contribution"
  USING (
    app_current_tenant() IS NULL OR EXISTS (
      SELECT 1 FROM "Group" g
      WHERE g.id = "Contribution"."groupId"
        AND (g."tenantId" IS NULL OR g."tenantId" = app_current_tenant())
    )
  );

-- NOTE: replicate the Contribution-style policy for Membership, Cycle, Business,
-- LedgerEntry, StockItem, SavedVenture, and Subscription via their group/business
-- chain. Keep the bypass for superuser/migrations (BYPASSRLS role) for ops.
