/**
 * Fast, standalone Play-reviewer demo member for Stawi.
 * Run (from repo root, with DATABASE_URL and PLAY_REVIEW_PHONE available):
 *   npx tsx packages/db/prisma/seed-demo.ts
 * Adds PLAY_REVIEW_PHONE as TREASURER of the demo group ONLY (so the reviewer
 * can exercise contribution recording there; no rights in any other group). With PLAY_REVIEW_CODE also set on the server, that number signs in
 * with the fixed code (no SMS). Nothing about the reviewer is hard-coded.
 */
import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { toE164 } from "@stawi/core";

// Load DATABASE_URL from a .env if it isn't already in the environment (Node 20.12+).
if (!process.env.DATABASE_URL && typeof process.loadEnvFile === "function") {
  for (const p of [".env", "packages/db/.env", "apps/web/.env", "prisma/.env"]) {
    if (existsSync(p)) {
      try {
        process.loadEnvFile(p);
      } catch {
        /* ignore */
      }
      if (process.env.DATABASE_URL) break;
    }
  }
}

const prisma = new PrismaClient();

async function main() {
  const reviewPhone = toE164(process.env.PLAY_REVIEW_PHONE ?? "");
  if (!reviewPhone) {
    console.error("Set PLAY_REVIEW_PHONE (e.g. in .env) to the reviewer's phone number first.");
    process.exit(1);
  }

  const group =
    (await prisma.group.findUnique({ where: { clerkOrgId: "org_umoja" } })) ??
    (await prisma.group.findFirst());
  if (!group) {
    console.error("No group found — run the main seed first (npm run db:seed).");
    process.exit(1);
  }

  await prisma.membership.upsert({
    where: { groupId_clerkUserId: { groupId: group.id, clerkUserId: "seed_demo_member" } },
    update: { phone: reviewPhone, fullName: "Demo Member", role: "TREASURER" },
    create: {
      groupId: group.id,
      clerkUserId: "seed_demo_member",
      fullName: "Demo Member",
      phone: reviewPhone,
      role: "TREASURER",
    },
  });

  console.log(`✅ Stawi demo reviewer ready: PLAY_REVIEW_PHONE → group "${group.name}" (TREASURER of the demo group only)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
