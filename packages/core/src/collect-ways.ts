/**
 * How a group receives its members' money, and how a payment made outside the
 * app is written in (owner 20/11/26).
 *
 * Best: a Till or Pochi la Biashara, so payments land somewhere they can be
 * seen. Many groups have neither — getting a Till needs papers they may not
 * have. Those groups still use Stawi: the treasurer writes each payment in by
 * hand, saying how it came (cash, M-Pesa to the group's Till or Pochi, M-Pesa
 * to an official's own phone, bank), with the M-Pesa code when there is one.
 * Every member sees the group total and each member's share as it changes;
 * the record keeps who wrote each entry.
 *
 * Facts below were read from Safaricom's own pages on 20/11/26.
 * Pure: no I/O.
 */

export type CollectWay = 'CASH' | 'MPESA_TILL' | 'MPESA_PHONE' | 'BANK';

type Words = { en: string; sw: string };

export const COLLECT_WAYS: { id: CollectWay; icon: string; label: Words; channel: 'CASH' | 'MPESA_C2B' | 'BANK' }[] = [
  { id: 'CASH', icon: '💵', label: { en: 'Cash at the meeting', sw: 'Pesa taslimu mkutanoni' }, channel: 'CASH' },
  { id: 'MPESA_TILL', icon: '🏪', label: { en: 'M-Pesa to our Till or Pochi', sw: 'M-Pesa kwa Till au Pochi yetu' }, channel: 'MPESA_C2B' },
  { id: 'MPESA_PHONE', icon: '📱', label: { en: 'M-Pesa to an official’s phone', sw: 'M-Pesa kwa simu ya kiongozi' }, channel: 'MPESA_C2B' },
  { id: 'BANK', icon: '🏦', label: { en: 'Bank deposit', sw: 'Kuweka benki' }, channel: 'BANK' },
];

export function collectWay(input: unknown): CollectWay {
  return COLLECT_WAYS.some((w) => w.id === input) ? (input as CollectWay) : 'CASH';
}

/** M-Pesa codes are 10 letters and digits (e.g. SKL4AB12CD). Bank slips vary. */
export type RefCheck = { ok: true; ref: string | null } | { ok: false; error: Words };

export function checkPaymentRef(way: CollectWay, raw: unknown): RefCheck {
  const ref = typeof raw === 'string' ? raw.trim().toUpperCase().replace(/\s+/g, '') : '';
  if (way === 'CASH') return { ok: true, ref: null };
  if (!ref) {
    // A code makes the record checkable; it is asked for, not forced, because some members pay without one to hand.
    return { ok: true, ref: null };
  }
  if (way === 'BANK') {
    return /^[A-Z0-9\-/]{3,30}$/.test(ref) ? { ok: true, ref } : { ok: false, error: { en: 'The bank reference should be letters and numbers only.', sw: 'Namba ya benki iwe herufi na namba tu.' } };
  }
  return /^[A-Z0-9]{10}$/.test(ref)
    ? { ok: true, ref }
    : { ok: false, error: { en: 'An M-Pesa code has 10 letters and numbers, like SKL4AB12CD.', sw: 'Namba ya M-Pesa ina herufi na namba 10, kama SKL4AB12CD.' } };
}

/** The same M-Pesa code written twice is the same money: refuse the second. */
export function isDuplicateRef(ref: string | null, existing: readonly (string | null | undefined)[]): boolean {
  if (!ref) return false;
  return existing.some((e) => (e ?? '').toUpperCase() === ref);
}

// ── Encouragement: verifiable, kind, no pressure ─────────────────────────

export interface CollectTip {
  id: 'pochi' | 'till' | 'meanwhile';
  icon: string;
  title: Words;
  body: Words;
  steps?: Words;
  source?: { label: string; url: string };
}

export const COLLECT_TIPS: CollectTip[] = [
  {
    id: 'pochi', icon: '👛',
    title: { en: 'Start simple: Pochi la Biashara', sw: 'Anza kwa urahisi: Pochi la Biashara' },
    body: {
      en: 'It works on the M-Pesa line you already have — no new number, no till. Group money is kept apart from your own money, and members pay it the way they already pay.',
      sw: 'Inafanya kazi kwenye laini ya M-Pesa uliyonayo — hakuna namba mpya wala till. Pesa ya kikundi inakaa mbali na pesa yako, na wanachama wanalipa kama wanavyolipa kawaida.',
    },
    steps: { en: 'Dial *334#, choose Pochi la Biashara, and follow the steps.', sw: 'Piga *334#, chagua Pochi la Biashara, ufuate hatua.' },
    source: { label: 'Safaricom, Pochi la Biashara', url: 'https://safaricom.co.ke/faqs-footer/pochi-la-biashara' },
  },
  {
    id: 'till', icon: '🏪',
    title: { en: 'When you are ready: a Till number', sw: 'Mkiwa tayari: namba ya Till' },
    body: {
      en: 'A Till shows every payment on one statement. Payments up to KES 500 cost the group nothing to receive, and members pay nothing to send. Safaricom asks a person for the form, a national ID and one week of daily receipts.',
      sw: 'Till inaonyesha kila malipo kwenye taarifa moja. Malipo hadi KES 500 hayaigharimu kikundi kitu kupokea, na wanachama hawalipi kutuma. Safaricom huomba fomu, kitambulisho na risiti za kila siku za wiki moja.',
    },
    source: { label: 'Safaricom, Buy Goods requirements', url: 'https://safaricom.co.ke/images/Downloads/Resources_Downloads/buy_goods_requirements.pdf' },
  },
  {
    id: 'meanwhile', icon: '✍️',
    title: { en: 'No Till yet? That is fine', sw: 'Bado hamna Till? Hakuna shida' },
    body: {
      en: 'The treasurer writes each payment here as it comes, with the M-Pesa code when there is one. Every member sees the group total and each member’s share change as it is written — money everyone can see is money that stays safe.',
      sw: 'Mweka hazina anaandika kila malipo hapa yanapoingia, pamoja na namba ya M-Pesa ikiwepo. Kila mwanachama anaona jumla ya kikundi na sehemu ya kila mwanachama ikibadilika inapoandikwa — pesa inayoonekana na wote ndiyo inakaa salama.',
    },
  },
];
