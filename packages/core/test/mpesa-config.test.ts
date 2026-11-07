import { describe, it, expect } from 'vitest';
import { resolveDarajaConfig, darajaTimestampEAT, callbackTokenMatches, DARAJA_BASE_URLS } from '../src/mpesa-config';

const base = {
  MPESA_CONSUMER_KEY: 'ck',
  MPESA_CONSUMER_SECRET: 'cs',
  MPESA_SHORTCODE: '600000',
  MPESA_PASSKEY: 'pk',
  MPESA_CALLBACK_URL: 'https://stawi.fly.dev/api/mpesa/callback',
};

describe('resolveDarajaConfig', () => {
  it('defaults to sandbox and the sandbox base URL', () => {
    const r = resolveDarajaConfig({ ...base, MPESA_SHORTCODE: '174379' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.env).toBe('sandbox');
      expect(r.config.baseUrl).toBe(DARAJA_BASE_URLS.sandbox);
    }
  });

  it('switches to the production base URL with MPESA_ENV=production', () => {
    const r = resolveDarajaConfig({ ...base, MPESA_ENV: 'production' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.baseUrl).toBe('https://api.safaricom.co.ke');
      expect(r.config.shortcode).toBe('600000');
    }
  });

  it('refuses the sandbox shortcode 174379 in production', () => {
    const r = resolveDarajaConfig({ ...base, MPESA_ENV: 'production', MPESA_SHORTCODE: '174379' });
    expect(r.ok).toBe(false);
  });

  it('refuses a non-https or localhost callback in production', () => {
    expect(resolveDarajaConfig({ ...base, MPESA_ENV: 'production', MPESA_CALLBACK_URL: 'http://stawi.fly.dev/cb' }).ok).toBe(false);
    expect(resolveDarajaConfig({ ...base, MPESA_ENV: 'production', MPESA_CALLBACK_URL: 'https://localhost/cb' }).ok).toBe(false);
  });

  it('reports missing credentials by name and rejects unknown environments', () => {
    const r = resolveDarajaConfig({ MPESA_ENV: 'sandbox' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/MPESA_PASSKEY/);
    expect(resolveDarajaConfig({ ...base, MPESA_ENV: 'staging' }).ok).toBe(false);
  });

  it('appends the callback token when MPESA_CALLBACK_TOKEN is set', () => {
    const r = resolveDarajaConfig({ ...base, MPESA_CALLBACK_TOKEN: 'abc123' });
    expect(r.ok && r.config.callbackUrl).toBe('https://stawi.fly.dev/api/mpesa/callback?token=abc123');
  });
});

describe('darajaTimestampEAT', () => {
  it('formats in Kenyan time regardless of the server time zone', () => {
    expect(darajaTimestampEAT(new Date('2026-11-07T21:30:05Z'))).toBe('20261108003005');
  });
});

describe('callbackTokenMatches', () => {
  it('is not enforced when unset, exact when set', () => {
    expect(callbackTokenMatches(undefined, null)).toBe(true);
    expect(callbackTokenMatches('s3cret', 's3cret')).toBe(true);
    expect(callbackTokenMatches('s3cret', 's3cre')).toBe(false);
    expect(callbackTokenMatches('s3cret', null)).toBe(false);
  });
});
