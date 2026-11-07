# syntax=docker/dockerfile:1
# Stawi web (Next.js 15 standalone) for Fly.io — monorepo-aware.
# Build:  docker build -t stawi .
# Fly:    flyctl deploy --remote-only   (see fly.toml / DEPLOYMENT-RUNBOOK.md)
#
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so
# they are passed as build args (they are public by design — the Supabase anon
# key is meant to ship to browsers). Server secrets are runtime-only
# (`fly secrets set`), never baked into the image.

ARG NODE_VERSION=20

# ── deps: install exactly what CI installs (all workspace manifests, so the
#    lockfile resolves identically; mobile sources are not copied or built) ──
FROM node:${NODE_VERSION}-bookworm-slim AS deps
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/db/package.json packages/db/package.json
COPY apps/mobile/package.json apps/mobile/package.json
RUN npm install --no-audit --no-fund

# ── build: prisma client + next build ──
FROM node:${NODE_VERSION}-bookworm-slim AS build
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Whole deps tree: root node_modules plus any workspace-nested node_modules
# (npm keeps conflicting versions, e.g. typescript/@types, under apps/web).
COPY --from=deps /app ./
COPY package.json package-lock.json .npmrc turbo.json tsconfig.base.json ./
COPY apps/web apps/web
COPY packages/core packages/core
COPY packages/db packages/db
ARG NEXT_PUBLIC_SUPABASE_URL=""
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=""
ARG NEXT_PUBLIC_APP_URL=""
ARG NEXT_PUBLIC_ROOT_DOMAIN=""
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_ROOT_DOMAIN=$NEXT_PUBLIC_ROOT_DOMAIN \
    NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate --schema packages/db/prisma/schema.prisma
RUN npm run build --workspace @stawi/web

# ── runner: minimal standalone server + prisma CLI for the release command ──
FROM node:${NODE_VERSION}-bookworm-slim AS runner
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
# outputFileTracingRoot is the monorepo root, so the standalone tree mirrors it
# (server entry at apps/web/server.js).
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
# Prisma engines + CLI (release_command: additive `db push` + RLS re-apply).
COPY --from=build --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=build --chown=nextjs:nodejs /app/packages/db/prisma ./packages/db/prisma
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
