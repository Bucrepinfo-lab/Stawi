/**
 * READ-ONLY check: list duplicate membership rows (same group + same phone, or
 * same group + same linked login). Owner, 07/11/26. It only runs SELECTs —
 * nothing is deleted, merged or updated. The owner decides any clean-up after
 * reading the output.
 *
 * Run from the repo root (needs the generated Prisma client and DATABASE_URL):
 *   npm run check:duplicates --workspace @stawi/db
 * Output: group id, kind (phone|user), a masked key, and the membership ids.
 * No names or full phone numbers are printed. Exit code 0 always (it is a report).
 */
import { PrismaClient } from '@prisma/client';
import { findDuplicateMemberships } from '../src/duplicates';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set — nothing checked.');
    return;
  }
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.membership.findMany({ select: { id: true, groupId: true, clerkUserId: true, phone: true } });
    const dups = findDuplicateMemberships(rows);
    console.log(`Checked ${rows.length} membership rows. Duplicate sets: ${dups.length}.`);
    for (const d of dups) {
      console.log(`group ${d.groupId} · ${d.kind} ${d.keyHint} · ${d.membershipIds.length} rows: ${d.membershipIds.join(', ')}`);
    }
    if (dups.length === 0) console.log('No duplicates found.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Check failed:', e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
