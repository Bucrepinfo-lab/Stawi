/**
 * Payment receipt model — Pillar 1.
 *
 * Builds the data for a downloadable contribution receipt. Rendering (HTML/PDF)
 * lives in the app; this is the pure, testable model.
 */

import { formatMoney } from './capital';

export interface ReceiptInput {
  groupName: string;
  memberName: string;
  amountCents: number;
  /** Member's running capital after this payment. */
  runningCapitalCents: number;
  dateISO: string;
  channel: 'MPESA_STK' | 'MPESA_C2B' | 'BANK' | 'CASH';
  /** M-Pesa code or bank reference. */
  reference?: string;
  /** Stable id used to derive the receipt number. */
  contributionId: string;
}

export interface ReceiptModel {
  receiptNo: string;
  groupName: string;
  memberName: string;
  amountDisplay: string; // "KES 5,000"
  runningCapitalDisplay: string;
  dateDisplay: string; // human date
  channelLabel: string;
  reference: string;
}

const CHANNEL_LABEL: Record<ReceiptInput['channel'], string> = {
  MPESA_STK: 'M-Pesa (STK Push)',
  MPESA_C2B: 'M-Pesa (Paybill)',
  BANK: 'Bank transfer',
  CASH: 'Cash',
};

/** Deterministic, human-friendly receipt number from the contribution id. */
export function receiptNumber(contributionId: string): string {
  let h = 0;
  for (let i = 0; i < contributionId.length; i++) {
    h = (h * 31 + contributionId.charCodeAt(i)) >>> 0;
  }
  return 'STW-' + h.toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
}

export function buildReceiptModel(input: ReceiptInput): ReceiptModel {
  const d = new Date(input.dateISO);
  return {
    receiptNo: receiptNumber(input.contributionId),
    groupName: input.groupName,
    memberName: input.memberName,
    amountDisplay: `KES ${formatMoney(input.amountCents)}`,
    runningCapitalDisplay: `KES ${formatMoney(input.runningCapitalCents)}`,
    dateDisplay: isNaN(d.getTime())
      ? input.dateISO
      : d.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }),
    channelLabel: CHANNEL_LABEL[input.channel],
    reference: input.reference ?? '—',
  };
}
