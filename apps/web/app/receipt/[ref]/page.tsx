import { notFound } from 'next/navigation';
import { buildReceiptModel, canViewReceipt, formatDateTime } from '@stawi/core';
import { ReceiptView } from './ReceiptView';

export const dynamic = 'force-dynamic';

/**
 * A contribution receipt (owner, 07/11/26). Built ONLY from the stored,
 * confirmed contribution with this id — query values are never read, so a
 * forged URL cannot produce a receipt. Scoped to the caller's tenant and
 * visible only to the member who paid or the group's officials. Anything else
 * (unknown or foreign id, pending payment, not signed in, no database) is 404.
 */
export default async function ReceiptPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  if (!process.env.DATABASE_URL || !ref) notFound();

  const { getUserId, getUserPhone } = await import('@/lib/auth');
  const userId = await getUserId();
  if (!userId) notFound();

  const { prisma, getTenantContext } = await import('@stawi/db');
  const row = await prisma.contribution.findUnique({
    where: { id: ref },
    select: {
      id: true, amountCents: true, channel: true, status: true, mpesaRef: true, createdAt: true,
      groupId: true, membershipId: true,
      group: { select: { name: true, tenantId: true } },
      member: { select: { fullName: true, clerkUserId: true, phone: true } },
    },
  });
  if (!row) notFound();

  const phone = await getUserPhone().catch(() => null);
  const { groupRoleFor } = await import('@/lib/group-access');
  const [ctx, groupRole] = await Promise.all([
    getTenantContext(prisma, userId),
    groupRoleFor(row.groupId, { userId, phone }),
  ]);
  const allowed = canViewReceipt(
    { status: row.status, groupTenantId: row.group.tenantId, memberUserId: row.member.clerkUserId, memberPhone: row.member.phone },
    { userId, phone, tenantId: ctx?.tenantId ?? null, groupRole },
  );
  if (!allowed) notFound();

  // The member's confirmed capital up to and including this payment.
  const running = await prisma.contribution.aggregate({
    where: { membershipId: row.membershipId, status: 'CONFIRMED', createdAt: { lte: row.createdAt } },
    _sum: { amountCents: true },
  });

  const dateISO = row.createdAt.toISOString();
  const model = buildReceiptModel({
    contributionId: row.id,
    groupName: row.group.name,
    memberName: row.member.fullName,
    amountCents: row.amountCents,
    runningCapitalCents: running._sum.amountCents ?? row.amountCents,
    dateISO,
    channel: row.channel,
    reference: row.mpesaRef ?? undefined,
  });

  // Display only: day-first on the Nairobi clock, whatever the viewer's locale.
  return <ReceiptView model={{ ...model, dateDisplay: formatDateTime(dateISO, {}, model.dateDisplay) }} />;
}
