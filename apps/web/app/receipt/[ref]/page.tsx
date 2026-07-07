import { buildReceiptModel } from '@stawi/core';
import { ReceiptView } from './ReceiptView';

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined, d = '') => (Array.isArray(v) ? v[0] ?? d : v ?? d);

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<SP>;
}) {
  const { ref } = await params;
  const sp = await searchParams;
  const channel = one(sp.channel, 'CASH') as 'MPESA_STK' | 'MPESA_C2B' | 'BANK' | 'CASH';

  const model = buildReceiptModel({
    contributionId: ref,
    groupName: one(sp.group, 'Stawi Group'),
    memberName: one(sp.member, 'Member'),
    amountCents: parseInt(one(sp.amount, '0'), 10) || 0,
    runningCapitalCents: parseInt(one(sp.capital, '0'), 10) || 0,
    dateISO: one(sp.date, new Date().toISOString()),
    channel,
    reference: one(sp.mref) || undefined,
  });

  return <ReceiptView model={model} />;
}
