import { createHmac } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  STAWI_PADDLE_PRICES,
  paddleConfig,
  paidItemFromPaddleEvent,
  stawiPaddleKey,
  verifyPaddleSignature,
} from '../src/paddle';

const hmac = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest('hex');

const env = {
  PADDLE_ENABLED: 'true',
  PADDLE_CLIENT_TOKEN: 'test_client',
  PADDLE_WEBHOOK_SECRET: 'whsec',
  PADDLE_PRICE_SMALL_MONTH: 'pri_sm',
  PADDLE_PRICE_SMALL_YEAR: 'pri_sy',
  PADDLE_PRICE_GROUP_MONTH: 'pri_gm',
  PADDLE_PRICE_GROUP_YEAR: 'pri_gy',
};

function event(priceId: string, overrides: Record<string, unknown> = {}) {
  return {
    event_type: 'transaction.completed',
    data: {
      id: 'txn_1',
      status: 'completed',
      custom_data: { tenantRef: 'tenant-1' },
      items: [{ price: { id: priceId } }],
      currency_code: 'USD',
      details: { totals: { grand_total: '299' } },
      ...overrides,
    },
  };
}

describe('Paddle card checkout (owner 19/11/26)', () => {
  it('stays off unless enabled with every key set', () => {
    expect(paddleConfig({}, STAWI_PADDLE_PRICES)).toBeNull();
    expect(paddleConfig({ ...env, PADDLE_ENABLED: 'no' }, STAWI_PADDLE_PRICES)).toBeNull();
    expect(paddleConfig({ ...env, PADDLE_PRICE_GROUP_YEAR: '' }, STAWI_PADDLE_PRICES)).toBeNull();
    expect(paddleConfig(env, STAWI_PADDLE_PRICES)?.environment).toBe('sandbox');
    expect(paddleConfig({ ...env, PADDLE_ENV: 'production' }, STAWI_PADDLE_PRICES)?.environment).toBe('production');
  });

  it('accepts only a fresh, correctly signed notification', () => {
    const body = '{"a":1}';
    const now = 1_800_000_000_000;
    const ts = String(now / 1000);
    const h1 = hmac('whsec', `${ts}:${body}`);
    expect(verifyPaddleSignature(body, `ts=${ts};h1=${h1}`, 'whsec', hmac, now)).toBe(true);
    expect(verifyPaddleSignature(`${body} `, `ts=${ts};h1=${h1}`, 'whsec', hmac, now)).toBe(false);
    expect(verifyPaddleSignature(body, `ts=${ts};h1=${h1}`, 'other', hmac, now)).toBe(false);
    expect(verifyPaddleSignature(body, `ts=${ts};h1=${h1}`, 'whsec', hmac, now + 600_000)).toBe(false);
    expect(verifyPaddleSignature(body, null, 'whsec', hmac, now)).toBe(false);
  });

  it('the bought price decides group size and period; the tenant comes from custom data', () => {
    const { prices } = paddleConfig(env, STAWI_PADDLE_PRICES)!;
    expect(paidItemFromPaddleEvent(event('pri_gy'), prices, 'tenantRef')).toEqual({
      transactionId: 'txn_1',
      key: 'GROUP_YEAR',
      customId: 'tenant-1',
      amount: 2.99,
      currency: 'USD',
    });
    expect(stawiPaddleKey(true, 'MONTH')).toBe('SMALL_MONTH');
  });

  it('ignores other events, other prices, unpaid or tenant-less transactions', () => {
    const { prices } = paddleConfig(env, STAWI_PADDLE_PRICES)!;
    expect(paidItemFromPaddleEvent({ ...event('pri_sm'), event_type: 'transaction.created' }, prices, 'tenantRef')).toBeNull();
    expect(paidItemFromPaddleEvent(event('pri_other'), prices, 'tenantRef')).toBeNull();
    expect(paidItemFromPaddleEvent(event('pri_sm', { status: 'billed' }), prices, 'tenantRef')).toBeNull();
    expect(paidItemFromPaddleEvent(event('pri_sm', { custom_data: null }), prices, 'tenantRef')).toBeNull();
  });
});
