'use server';

/**
 * Supplier side of restock requests (owner 28/11/26). A supplier sees and
 * answers only requests sent to the phone number they signed in with; the
 * check is here on the server. The shop's owner gets a phone alert for each
 * answer. Nothing is paid here.
 */
import { revalidatePath } from 'next/cache';
import { assertClean, phoneKey, restockMoveProblem, RESTOCK_STATUS, type RestockStatus } from '@stawi/core';
import { dbEnabled } from '@/lib/data';

type Result = { ok: boolean; error?: string };

export async function myPhoneKey(): Promise<string | null> {
  const { getUserPhone } = await import('@/lib/auth');
  const phone = await getUserPhone().catch(() => null);
  const key = phone ? phoneKey(phone) : '';
  return key || null;
}

export async function answerRestockAction(input: { requestId: string; to: RestockStatus; note?: string; deliverOn?: string }): Promise<Result> {
  if (!dbEnabled()) return { ok: false, error: 'Orders open when the live records are connected.' };
  const key = await myPhoneKey();
  if (!key) return { ok: false, error: 'Sign in with your phone number to answer orders.' };
  const { prisma } = await import('@stawi/db');
  const req = await prisma.bizRestockRequest.findFirst({ where: { id: input.requestId, supplierPhoneKey: key } });
  if (!req) return { ok: false, error: 'This order was not sent to your phone number.' };
  const problem = restockMoveProblem(req.status as RestockStatus, input.to, 'SUPPLIER');
  if (problem) return { ok: false, error: problem };
  const note = input.note?.trim().slice(0, 200) || null;
  if (note) { try { assertClean(note); } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Please change the words.' }; } }
  const deliverOn = input.deliverOn && /^\d{4}-\d{2}-\d{2}$/.test(input.deliverOn) ? input.deliverOn : null;
  await prisma.bizRestockRequest.update({ where: { id: req.id }, data: { status: input.to, supplierNote: note ?? req.supplierNote, deliverOn: deliverOn ?? req.deliverOn, seenAt: req.seenAt ?? new Date() } });
  const when = deliverOn ? ` Delivery ${deliverOn.slice(8, 10)}/${deliverOn.slice(5, 7)}/${deliverOn.slice(2, 4)}.` : '';
  const { alertBusinessOfficials } = await import('@/lib/group-alerts');
  void alertBusinessOfficials(req.groupId, {
    title: `${req.supplierName}: ${RESTOCK_STATUS[input.to].en}`,
    body: `${req.branchLabel}.${when}${note ? ` "${note.slice(0, 80)}"` : ''}`,
    url: `/business?group=${encodeURIComponent(req.groupId)}&tab=restock`,
    tag: `restock-${req.id}`,
  });
  revalidatePath('/orders');
  return { ok: true };
}
