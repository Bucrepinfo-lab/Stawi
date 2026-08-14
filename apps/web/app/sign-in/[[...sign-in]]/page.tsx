import { Suspense } from 'react';
import { PhoneAuth } from '@/components/phone-auth';

/**
 * Phone-first sign-in via Supabase phone-OTP. Members enter with the same number
 * that appears on their group's roster — the join key that surfaces their groups —
 * and receive a 6-digit SMS code (delivered by Africa's Talking).
 */
export default function SignInPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bone)' }}>
      <div style={{ textAlign: 'center', maxWidth: 380, width: '100%' }}>
        <div className="display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--forest-deep)' }}>Welcome back to Stawi</div>
        <p style={{ color: 'var(--ink-2)', marginTop: 8, marginBottom: 22, fontSize: 14.5 }}>
          Enter with your <b>phone number</b> — the same one your group registered you with. Your groups appear automatically.
        </p>
        <Suspense>
          <PhoneAuth />
        </Suspense>
      </div>
    </main>
  );
}
