import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Owner 20/11/26: Stawi sends no SMS at all. Sign-in is phone number + PIN,
 * with a joining code from a group official the first time; alerts and
 * receipts go through the app's own Messages (M-Pesa texts its own
 * confirmation). Replaces the older "SMS is transactional only" guard, which
 * this rule is stricter than.
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

describe('no SMS anywhere in the web app (owner 20/11/26)', () => {
  it('has no SMS sender and no SMS sign-in routes', () => {
    for (const f of ['lib/sms.ts', 'lib/notify.ts', 'app/api/auth/send-sms/route.ts', 'app/api/auth/otp/send/route.ts', 'app/api/auth/otp/verify/route.ts']) {
      expect(existsSync(join(web, f)), f).toBe(false);
    }
  });

  it('never calls an SMS gateway or Supabase phone codes', () => {
    for (const f of files(web)) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/africastalking\.com\/version1\/messaging/);
      expect(src, f).not.toMatch(/sendSms\(/);
      expect(src, f).not.toMatch(/signInWithOtp|verifyOtp\(/);
    }
  });

  it('signs in with phone + PIN and joining codes', () => {
    expect(existsSync(join(web, 'app/api/auth/pin/sign-in/route.ts'))).toBe(true);
    expect(existsSync(join(web, 'app/api/auth/join/route.ts'))).toBe(true);
    expect(existsSync(join(web, 'app/api/groups/[id]/join-code/route.ts'))).toBe(true);
    const issue = readFileSync(join(web, 'app/api/groups/[id]/join-code/route.ts'), 'utf8');
    // Officials only, checked on the server.
    expect(issue).toMatch(/RECORD_EDITOR_ROLES\.has\(role\)/);
  });
});
