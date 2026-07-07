/**
 * Seed a fresh Stawi database with demo data (one Tenant owning three Groups).
 * Run: `npm run -w @stawi/db seed` (requires DATABASE_URL).
 *
 * Demo member "Amina" (clerkUserId "user_demo_amina") is the Tenant OWNER and
 * belongs to all three groups — mirroring the multi-group switcher in the UI.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const AMINA = 'user_demo_amina';
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function main() {
  // Tenant (billing & isolation boundary) + owner.
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Umoja Federation',
      slug: 'umoja',
      countryCode: 'KE',
      planTier: 'GROWTH',
      members: { create: [{ clerkUserId: AMINA, role: 'OWNER' }] },
    },
  });

  const umoja = await prisma.group.create({
    data: {
      clerkOrgId: 'org_umoja', tenantId: tenant.id, name: 'Umoja Women Group', type: 'CHAMA',
      members: {
        create: [
          { clerkUserId: AMINA, fullName: 'Amina Wanjiru', role: 'TREASURER', rotationOrder: 0 },
          { clerkUserId: 'user_joseph', fullName: 'Joseph Kamau', role: 'CHAIRMAN', rotationOrder: 1 },
          { clerkUserId: 'user_grace', fullName: 'Grace Otieno', role: 'SECRETARY', rotationOrder: 2 },
          { clerkUserId: 'user_david', fullName: 'David Mwangi', role: 'MEMBER', rotationOrder: 3 },
        ],
      },
    },
    include: { members: true },
  });
  const amounts: Record<string, number> = { 'Amina Wanjiru': 4_200_000, 'Joseph Kamau': 3_800_000, 'Grace Otieno': 3_100_000, 'David Mwangi': 2_400_000 };
  for (const m of umoja.members) {
    await prisma.contribution.create({ data: { groupId: umoja.id, membershipId: m.id, amountCents: amounts[m.fullName] ?? 0, channel: 'MPESA_STK', status: 'CONFIRMED' } });
  }
  await prisma.business.create({
    data: {
      groupId: umoja.id, name: 'Umoja Liquid Soap', vatRegistered: false, tourismSector: false,
      stockItems: { create: [
        { name: '5L liquid soap', quantity: 22, reorderLevel: 8, soldInWindow: 64, supplierName: 'ChemSupplies', supplierPhone: '254700777888' },
        { name: 'Bottles (empty)', quantity: 6, reorderLevel: 20, soldInWindow: 90, supplierName: 'PlastPack', supplierPhone: '254700999000' },
        { name: 'Fragrance oil', quantity: 4, reorderLevel: 3, soldInWindow: 12 },
      ] },
      entries: { create: [
        { type: 'SALE', description: 'Soap sales', amountCents: 480_000, occurredAt: daysAgo(0) },
        { type: 'PURCHASE', description: 'Raw materials', amountCents: 210_000, occurredAt: daysAgo(0) },
        { type: 'SALE', description: 'Bulk order (school)', amountCents: 620_000, occurredAt: daysAgo(3) },
        { type: 'EXPENSE', description: 'Packaging', amountCents: 45_000, occurredAt: daysAgo(1) },
      ] },
    },
  });

  const vijana = await prisma.group.create({
    data: {
      clerkOrgId: 'org_vijana', tenantId: tenant.id, name: 'Vijana Investment SACCO', type: 'SACCO',
      members: { create: [
        { clerkUserId: AMINA, fullName: 'Amina Wanjiru', role: 'SIGNATORY', rotationOrder: 0 },
        { clerkUserId: 'user_peter', fullName: 'Peter Mutua', role: 'CHAIRMAN', rotationOrder: 1 },
        { clerkUserId: 'user_lucy', fullName: 'Lucy Achieng', role: 'TREASURER', rotationOrder: 2 },
      ] },
    },
    include: { members: true },
  });
  for (const m of vijana.members) {
    await prisma.contribution.create({ data: { groupId: vijana.id, membershipId: m.id, amountCents: 6_500_000, channel: 'BANK', status: 'CONFIRMED' } });
  }

  const mboga = await prisma.group.create({
    data: {
      clerkOrgId: 'org_mboga', tenantId: tenant.id, name: 'Mama Mboga Hub', type: 'BUSINESS',
      members: { create: [
        { clerkUserId: AMINA, fullName: 'Amina Wanjiru', role: 'MEMBER', rotationOrder: 0 },
        { clerkUserId: 'user_esther', fullName: 'Esther Wairimu', role: 'CHAIRMAN', rotationOrder: 1 },
      ] },
    },
  });
  await prisma.business.create({
    data: {
      groupId: mboga.id, name: 'Mama Mboga Hub', vatRegistered: true, tourismSector: true,
      stockItems: { create: [
        { name: 'Cooking oil 1L', quantity: 40, reorderLevel: 12, soldInWindow: 214, supplierName: 'Bidco', supplierPhone: '254700111222' },
        { name: 'Sugar 1kg', quantity: 3, reorderLevel: 12, soldInWindow: 42, supplierName: 'Mumias', supplierPhone: '254700555666' },
        { name: 'Shoe polish', quantity: 30, reorderLevel: 5, soldInWindow: 0 },
      ] },
      entries: { create: [
        { type: 'SALE', description: 'Daily sales', amountCents: 2_845_000, occurredAt: daysAgo(0) },
        { type: 'PURCHASE', description: 'Restock', amountCents: 1_900_000, occurredAt: daysAgo(0) },
      ] },
    },
  });

  // Pillar 4 — Umoja opted in to SACCO+ (fast-tracked: registered group).
  const sacco = await prisma.saccoAccount.create({
    data: {
      tenantId: tenant.id,
      entityType: 'REGISTERED_GROUP',
      ownerGroupId: umoja.id,
      displayName: 'Umoja Chama — SACCO+',
      countryCode: 'KE',
      balanceCents: 12_800_000,
      shareCapitalCents: 3_200_000,
      kycComplete: true,
      txns: { create: [
        { type: 'DEPOSIT', amountCents: 12_800_000, channel: 'MPESA_STK', status: 'CONFIRMED', reference: 'SEED-OPENING' },
      ] },
    },
  });

  console.log('Seeded tenant', tenant.slug, 'with groups:', { umoja: umoja.id, vijana: vijana.id, mboga: mboga.id, sacco: sacco.id });
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
