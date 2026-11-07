#!/bin/sh
# Fly.io release command (runs once per deploy, before new machines start).
#  1. Additive schema sync: `prisma db push` WITHOUT --accept-data-loss — any
#     destructive diff (drop/rename/narrow) makes Prisma refuse, the release
#     fails and the previous version keeps serving. Never add that flag here.
#  2. Re-apply rls.sql (idempotent: DROP POLICY IF EXISTS + CREATE POLICY).
# Without DATABASE_URL (seed/demo deployment) it does nothing.
set -eu
SCHEMA=packages/db/prisma/schema.prisma
PRISMA="node node_modules/prisma/build/index.js"
if [ -z "${DATABASE_URL:-}" ]; then
  echo "release: DATABASE_URL not set — skipping schema sync (seed mode)."
  exit 0
fi
echo "release: prisma db push (additive only)"
$PRISMA db push --skip-generate --schema "$SCHEMA"
echo "release: applying row-level security policies"
$PRISMA db execute --file packages/db/prisma/rls.sql --schema "$SCHEMA"
echo "release: done"
