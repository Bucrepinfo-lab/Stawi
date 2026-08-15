/**
 * Fast, standalone Play-reviewer demo member for Stawi.
 * Run (from repo root, with DATABASE_URL available):
 *   npx tsx packages/db/prisma/seed-demo.ts
 * Login: phone 0700000002 → confirm → the member's profile + the demo group.
 * Uses a canonical E.164 phone so it matches toE164() from the sign-in form (the
 * main seed's local-format phones like 0712345678 won't match phone-login).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const group =
    (await prisma.group.findUnique({ where: { clerkOrgId: "org_umoja" } })) ??
    (await prisma.group.findFirst());
  if (!group) {
    console.error("No group found — run the main seed first (npm run db:seed).");
    process.exit(1);
  }

  await prisma.membership.upsert({
    where: { groupId_clerkUserId: { groupId: group.id, clerkUserId: "seed_demo_member" } },
    update: { phone: "+254700000002", fullName: "Demo Member" },
    create: {
      groupId: group.id,
      clerkUserId: "seed_demo_member",
      fullName: "Demo Member",
      phone: "+254700000002",
      role: "MEMBER",
    },
  });

  console.log(`✅ Stawi demo reviewer ready: phone 0700000002 → group "${group.name}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
