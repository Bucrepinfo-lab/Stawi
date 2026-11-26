/**
 * Fast, standalone Play-reviewer demo member for Stawi.
 * Run (from repo root, with DATABASE_URL and PLAY_REVIEW_PHONE available):
 *   npx tsx packages/db/prisma/seed-demo.ts
 * Adds PLAY_REVIEW_PHONE as TREASURER of the demo group ONLY (so the reviewer
 * can exercise contribution recording there; no rights in any other group). With PLAY_REVIEW_PIN also set on the server, that number signs in
 * with that fixed PIN on the phone + PIN screen (no SMS). Nothing about the reviewer is hard-coded.
 */
import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

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

/** Kenyan-default E.164, inlined so this runs inside the production image (no @stawi/core there). */
function toE164(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "254" + d.slice(1);
  else if (!d.startsWith("254")) d = "254" + d;
  return /^[1-9]\d{7,14}$/.test(d) ? "+" + d : null;
}

async function main() {
  const reviewPhone = toE164(process.env.PLAY_REVIEW_PHONE ?? "");
  if (!reviewPhone) {
    console.error("Set PLAY_REVIEW_PHONE (e.g. in .env) to the reviewer's phone number first.");
    process.exit(1);
  }

  // Only ever the demo group: never fall back to a real customer's group.
  const group = await prisma.group.findUnique({ where: { clerkOrgId: "org_umoja" } });
  if (!group) {
    console.error("No demo group (org_umoja) found. Nothing was changed.");
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
