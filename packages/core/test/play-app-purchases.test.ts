import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PLAY_APP_COOKIE, isPlayAppSignal, planPurchasesAllowed, shouldMarkPlayApp } from '../src/android';

const root = join(__dirname, '..', '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('Play payments policy: no Stawi plan purchases in the Play app (17/11/26)', () => {
  it('recognises the Play app by its launch referrer or the remembered cookie', () => {
    expect(isPlayAppSignal({ referrer: 'android-app://ke.stawi.app/' })).toBe(true);
    expect(isPlayAppSignal({ cookie: '1' })).toBe(true);
    expect(isPlayAppSignal({ referrer: 'https://getstawi.com/' })).toBe(false);
    expect(isPlayAppSignal({})).toBe(false);
  });

  it('allows plan purchases on the web only', () => {
    expect(planPurchasesAllowed({ referrer: 'https://getstawi.com/subscribe' })).toBe(true);
    expect(planPurchasesAllowed({ cookie: '1' })).toBe(false);
  });

  it('marks the session once, on the Play app launch', () => {
    expect(shouldMarkPlayApp('android-app://ke.stawi.app/', null)).toBe(true);
    expect(shouldMarkPlayApp('android-app://ke.stawi.app/', '1')).toBe(false);
    expect(shouldMarkPlayApp(null, null)).toBe(false);
  });

  it('is enforced on the server (checkout API) and on the subscribe page, and remembered by the middleware', () => {
    expect(read('apps/web/app/api/billing/checkout/route.ts')).toContain('planPurchasesAllowed(');
    expect(read('apps/web/app/subscribe/page.tsx')).toContain('planPurchasesAllowed(');
    expect(read('apps/web/middleware.ts')).toContain('PLAY_APP_COOKIE');
    expect(PLAY_APP_COOKIE).toBe('stawi_play_app');
  });
});
