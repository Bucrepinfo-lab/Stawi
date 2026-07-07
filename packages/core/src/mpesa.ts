/**
 * M-Pesa Daraja — pure, testable helpers (no network).
 *
 * The actual HTTP calls live in the web app (apps/web/lib/mpesa.ts); everything
 * here is deterministic so it can be unit-tested without hitting Safaricom.
 *
 * Reference: Lipa na M-Pesa Online (STK Push), Daraja 3.0 (2026).
 */

/** Daraja timestamp format: yyyyMMddHHmmss (server local time). */
export function darajaTimestamp(d: Date = new Date()): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return (
    `${d.getFullYear()}` +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    p(d.getHours()) +
    p(d.getMinutes()) +
    p(d.getSeconds())
  );
}

/**
 * Lipa na M-Pesa password = base64(Shortcode + Passkey + Timestamp).
 * `encodeBase64` is injected so this stays runtime-agnostic (Buffer in Node,
 * btoa in edge).
 */
export function stkPassword(
  shortcode: string,
  passkey: string,
  timestamp: string,
  encodeBase64: (s: string) => string,
): string {
  return encodeBase64(`${shortcode}${passkey}${timestamp}`);
}

/**
 * Normalise a Kenyan phone number to the 2547XXXXXXXX / 2541XXXXXXXX format
 * Daraja requires. Accepts 07.., 01.., +2547.., 2547.., 7...
 */
export function normalizeMsisdn(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return `254${digits.slice(1)}`;
  if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('1'))) {
    return `254${digits}`;
  }
  return digits;
}

/** STK amount must be a whole number of shillings (no cents). */
export function stkAmountFromCents(cents: number): number {
  if (cents <= 0) throw new Error('Amount must be positive');
  return Math.round(cents / 100);
}

export interface StkPushParams {
  shortcode: string;
  passkey: string;
  amountCents: number;
  payerPhone: string;
  callbackUrl: string;
  accountReference: string; // e.g. group name / cycle
  description: string;
  timestamp?: string;
  encodeBase64: (s: string) => string;
}

export interface StkPushPayload {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  TransactionType: 'CustomerPayBillOnline';
  Amount: number;
  PartyA: string;
  PartyB: string;
  PhoneNumber: string;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
}

/** Build the exact JSON body Daraja's STK Push endpoint expects. */
export function buildStkPushPayload(p: StkPushParams): StkPushPayload {
  const timestamp = p.timestamp ?? darajaTimestamp();
  const phone = normalizeMsisdn(p.payerPhone);
  return {
    BusinessShortCode: p.shortcode,
    Password: stkPassword(p.shortcode, p.passkey, timestamp, p.encodeBase64),
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: stkAmountFromCents(p.amountCents),
    PartyA: phone,
    PartyB: p.shortcode,
    PhoneNumber: phone,
    CallBackURL: p.callbackUrl,
    AccountReference: p.accountReference.slice(0, 12),
    TransactionDesc: p.description.slice(0, 13),
  };
}

// ─────────────────────────── Callback parsing ───────────────────────────

export interface StkCallbackResult {
  ok: boolean;
  resultCode: number;
  resultDesc: string;
  checkoutRequestId: string;
  merchantRequestId: string;
  amount?: number;
  mpesaReceipt?: string;
  phone?: string;
  transactionDate?: string;
}

/** Shape of the Daraja STK callback (the bits we use). */
interface RawCallback {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: { Item?: Array<{ Name: string; Value?: string | number }> };
    };
  };
}

/**
 * Parse a Daraja STK callback into a flat, typed result.
 * ResultCode 0 = success; anything else = failure (cancelled, timeout, etc).
 */
export function parseStkCallback(raw: RawCallback): StkCallbackResult {
  const cb = raw?.Body?.stkCallback;
  if (!cb) throw new Error('Not an STK callback');
  const code = Number(cb.ResultCode ?? -1);
  const items = cb.CallbackMetadata?.Item ?? [];
  const find = (name: string) => items.find((i) => i.Name === name)?.Value;

  return {
    ok: code === 0,
    resultCode: code,
    resultDesc: String(cb.ResultDesc ?? ''),
    checkoutRequestId: String(cb.CheckoutRequestID ?? ''),
    merchantRequestId: String(cb.MerchantRequestID ?? ''),
    amount: find('Amount') != null ? Number(find('Amount')) : undefined,
    mpesaReceipt: find('MpesaReceiptNumber') as string | undefined,
    phone: find('PhoneNumber') != null ? String(find('PhoneNumber')) : undefined,
    transactionDate:
      find('TransactionDate') != null ? String(find('TransactionDate')) : undefined,
  };
}
