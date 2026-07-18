import { describe, it, expect } from 'vitest';
import {
  darajaTimestamp,
  stkPassword,
  normalizeMsisdn,
  stkAmountFromCents,
  buildStkPushPayload,
  parseStkCallback,
} from '../src/mpesa';

const b64 = (s: string) => Buffer.from(s).toString('base64');

describe('darajaTimestamp', () => {
  it('formats yyyyMMddHHmmss', () => {
    // 2026-06-20 09:05:03
    const ts = darajaTimestamp(new Date(2026, 5, 20, 9, 5, 3));
    expect(ts).toBe('20260620090503');
  });
});

describe('stkPassword', () => {
  it('is base64(shortcode + passkey + timestamp)', () => {
    const ts = '20260620090503';
    expect(stkPassword('174379', 'PASSKEY', ts, b64)).toBe(b64('174379PASSKEY' + ts));
  });
});

describe('normalizeMsisdn', () => {
  it.each([
    ['0712345678', '254712345678'],
    ['+254712345678', '254712345678'],
    ['254712345678', '254712345678'],
    ['712345678', '254712345678'],
    ['0112345678', '254112345678'],
  ])('normalises %s -> %s', (input, expected) => {
    expect(normalizeMsisdn(input)).toBe(expected);
  });
});

describe('stkAmountFromCents', () => {
  it('converts cents to whole shillings', () => {
    expect(stkAmountFromCents(500_000)).toBe(5000);
  });
  it('rejects non-positive', () => {
    expect(() => stkAmountFromCents(0)).toThrow();
  });
});

describe('buildStkPushPayload', () => {
  const payload = buildStkPushPayload({
    shortcode: '174379',
    passkey: 'PASSKEY',
    amountCents: 500_000,
    payerPhone: '0712345678',
    callbackUrl: 'https://app/api/mpesa/callback',
    accountReference: 'Umoja Women Group',
    description: 'Cycle 7 contribution',
    timestamp: '20260620090503',
    encodeBase64: b64,
  });

  it('produces a valid CustomerPayBillOnline body', () => {
    expect(payload.TransactionType).toBe('CustomerPayBillOnline');
    expect(payload.Amount).toBe(5000);
    expect(payload.PhoneNumber).toBe('254712345678');
    expect(payload.PartyB).toBe('174379');
  });
  it('truncates reference and description to Daraja limits', () => {
    expect(payload.AccountReference.length).toBeLessThanOrEqual(12);
    expect(payload.TransactionDesc.length).toBeLessThanOrEqual(13);
  });
});

describe('parseStkCallback', () => {
  it('parses a successful payment', () => {
    const r = parseStkCallback({
      Body: {
        stkCallback: {
          MerchantRequestID: 'm-1',
          CheckoutRequestID: 'c-1',
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 5000 },
              { Name: 'MpesaReceiptNumber', Value: 'SGR7XYZ123' },
              { Name: 'PhoneNumber', Value: 254712345678 },
              { Name: 'TransactionDate', Value: 20260620090530 },
            ],
          },
        },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.amount).toBe(5000);
    expect(r.mpesaReceipt).toBe('SGR7XYZ123');
    expect(r.checkoutRequestId).toBe('c-1');
  });

  it('parses a cancelled/failed payment', () => {
    const r = parseStkCallback({
      Body: {
        stkCallback: {
          MerchantRequestID: 'm-2',
          CheckoutRequestID: 'c-2',
          ResultCode: 1032,
          ResultDesc: 'Request cancelled by user',
        },
      },
    });
    expect(r.ok).toBe(false);
    expect(r.resultCode).toBe(1032);
    expect(r.mpesaReceipt).toBeUndefined();
  });

  it('throws on a non-STK body', () => {
    expect(() => parseStkCallback({})).toThrow(/Not an STK callback/);
  });
});
