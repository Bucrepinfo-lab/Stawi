import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Owner 14/11/26: the "TELPEN" SMS sender ID is approved for TRANSACTIONAL use
 * only. Promotion goes to members through in-app messaging, never by SMS.
 */
const web = join(__dirname, '../../../apps/web');
function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

describe('SMS is transactional only (owner 14/11/26)', () => {
  it('both senders require a purpose of otp or transactional', () => {
    for (const f of ['lib/sms.ts', 'lib/notify.ts']) {
      expect(readFileSync(join(web, f), 'utf8')).toMatch(/purpose: SmsPurpose/);
    }
    expect(readFileSync(join(web, 'lib/sms.ts'), 'utf8')).toMatch(/export type SmsPurpose = 'otp' \| 'transactional';/);
  });

  it('every SMS sent names its purpose and nothing promotional sends SMS', () => {
    let seen = 0;
    for (const f of files(web)) {
      if (/lib[\\/](sms|notify)\.ts$/.test(f)) continue;
      const src = readFileSync(f, 'utf8');
      const calls = src.match(/sendSms\([\s\S]*?\);/g) ?? [];
      seen += calls.length;
      for (const c of calls) expect(c, f).toMatch(/'(otp|transactional)',?\s*\);$/);
      if (calls.length) expect(src, f).not.toMatch(/newsletter|promo|campaign|broadcast/i);
    }
    expect(seen).toBeGreaterThanOrEqual(2);
  });
});
