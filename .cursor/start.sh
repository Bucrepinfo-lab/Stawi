#!/usr/bin/env bash
# Stawi — Cloud Agent start phase (per-boot, idempotent).
#
# Environment builds do NOT re-run install on boot, so anything that needs a
# live process (here: PostgreSQL) is (re)started here. The data directory is
# baked into the snapshot by install.sh, so this only starts the server and
# reconciles schema/seed as a safety net.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DB_URL="postgresql://stawi:stawi@localhost:5432/stawi?schema=public"

echo "==> Starting PostgreSQL cluster"
sudo pg_ctlcluster 16 main start 2>/dev/null || true
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q 2>/dev/null; then break; fi
  sleep 1
done

# Reconcile schema in case the snapshot predates a schema change.
DATABASE_URL="$DB_URL" npm run --workspace @stawi/db push >/dev/null 2>&1 || true

# Seed only if empty (guards against duplicate-key errors on re-seed).
COUNT="$(PGPASSWORD=stawi psql -h localhost -U stawi -d stawi -tAc 'SELECT count(*) FROM "Tenant";' 2>/dev/null || echo 0)"
if [ "${COUNT:-0}" = "0" ]; then
  DATABASE_URL="$DB_URL" npm run --workspace @stawi/db seed || true
fi

echo "==> PostgreSQL ready on localhost:5432 (db=stawi)"
