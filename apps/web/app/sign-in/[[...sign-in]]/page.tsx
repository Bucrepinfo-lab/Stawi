import { Suspense } from 'react';
import { PhoneAuth } from '@/components/phone-auth';

/**
 * Sign in with the phone number on the group's roster, then the person's own
 * 4-digit PIN — no SMS (owner 20/11/26). First time or forgotten PIN: the
 * joining code a group official gave.
 */
export default function SignInPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bone)' }}>
      <div style={{ textAlign: 'center', maxWidth: 380, width: '100%' }}>
        <div className="display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--forest-deep)' }}>Welcome back to Stawi</div>
        <p style={{ color: 'var(--ink-2)', marginTop: 8, marginBottom: 22, fontSize: 14.5 }}>
          Enter your <b>phone number</b> and your <b>PIN</b>. Your groups appear automatically.
        </p>
        <Suspense>
          <PhoneAuth />
        </Suspense>
      </div>
    </main>
  );
}
