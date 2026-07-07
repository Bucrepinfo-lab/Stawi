-- Stawi — Postgres Row-Level Security (defence-in-depth for tenant isolation).
--
-- Apply AFTER `prisma migrate deploy`:
--   psql "$DATABASE_URL" -f packages/db/prisma/rls.sql
--
-- The app sets the active tenant per transaction with:
--   SELECT set_config('app.tenant_id', '<tenantId>', true);   -- true = tx-local
-- (the repo helper `withTenantRls` does this via prisma.$transaction).
-- Rows are then visible only when their tenantId matches the session tenant.
-- The repo also filters by tenantId in application code, so this is a second layer.
-- Keep a BYPASSRLS role for migrations/ops.

-- Helper: current tenant from the session GUC (NULL if unset).
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '');
$$ LANGUAGE sql STABLE;

-- ── Tenant anchors ────────────────────────────────────────────────────────
ALTER TABLE "Group" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS group_tenant_isolation ON "Group";
CREATE POLICY group_tenant_isolation ON "Group"
  USING ("tenantId" IS NULL OR "tenantId" = app_current_tenant());

ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_self ON "Tenant";
CREATE POLICY tenant_self ON "Tenant"
  USING (id = app_current_tenant());

ALTER TABLE "TenantMember" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenantmember_isolation ON "TenantMember";
CREATE POLICY tenantmember_isolation ON "TenantMember"
  USING ("tenantId" = app_current_tenant());

-- ── Group-chained children (tenant inherited via Group) ──────────────────
-- Same policy body for every table with a direct groupId column.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Membership','Cycle','Contribution','Subscription','Business','SavedVenture']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %s_tenant_isolation ON %I', lower(t), t);
    EXECUTE format($f$
      CREATE POLICY %s_tenant_isolation ON %I
        USING (
          app_current_tenant() IS NULL OR EXISTS (
            SELECT 1 FROM "Group" g
            WHERE g.id = %I."groupId"
              AND (g."tenantId" IS NULL OR g."tenantId" = app_current_tenant())
          )
        )$f$, lower(t), t, t);
  END LOOP;
END $$;

-- ── Business-chained children (tenant inherited via Business → Group) ────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['StockItem','LedgerEntry']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %s_tenant_isolation ON %I', lower(t), t);
    EXECUTE format($f$
      CREATE POLICY %s_tenant_isolation ON %I
        USING (
          app_current_tenant() IS NULL OR EXISTS (
            SELECT 1 FROM "Business" b JOIN "Group" g ON g.id = b."groupId"
            WHERE b.id = %I."businessId"
              AND (g."tenantId" IS NULL OR g."tenantId" = app_current_tenant())
          )
        )$f$, lower(t), t, t);
  END LOOP;
END $$;

-- ── SACCO+ (Pillar 4) ─────────────────────────────────────────────────────
-- SaccoAccount carries tenantId directly.
ALTER TABLE "SaccoAccount" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS saccoaccount_tenant_isolation ON "SaccoAccount";
CREATE POLICY saccoaccount_tenant_isolation ON "SaccoAccount"
  USING (app_current_tenant() IS NULL OR "tenantId" = app_current_tenant());

-- SaccoTxn / Loan chain through SaccoAccount.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['SaccoTxn','Loan']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %s_tenant_isolation ON %I', lower(t), t);
    EXECUTE format($f$
      CREATE POLICY %s_tenant_isolation ON %I
        USING (
          app_current_tenant() IS NULL OR EXISTS (
            SELECT 1 FROM "SaccoAccount" a
            WHERE a.id = %I."accountId"
              AND a."tenantId" = app_current_tenant()
          )
        )$f$, lower(t), t, t);
  END LOOP;
END $$;

-- LoanGuarantor / LoanRepayment chain through Loan → SaccoAccount.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['LoanGuarantor','LoanRepayment']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %s_tenant_isolation ON %I', lower(t), t);
    EXECUTE format($f$
      CREATE POLICY %s_tenant_isolation ON %I
        USING (
          app_current_tenant() IS NULL OR EXISTS (
            SELECT 1 FROM "Loan" l JOIN "SaccoAccount" a ON a.id = l."accountId"
            WHERE l.id = %I."loanId"
              AND a."tenantId" = app_current_tenant()
          )
        )$f$, lower(t), t, t);
  END LOOP;
END $$;
