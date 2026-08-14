import { Suspense } from 'react';
import { PhoneAuth } from '@/components/phone-auth';

/**
 * Phone-first sign-up via Supabase phone-OTP. A new member verifies via SMS code —
 * no email required — and is immediately linked to every group whose roster carries
 * that number. Same flow as sign-in (Supabase creates the user on first OTP).
 */
export default function SignUpPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bone)' }}>
      <div style={{ textAlign: 'center', maxWidth: 380, width: '100%' }}>
        <div className="display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--forest-deep)' }}>Join Stawi</div>
        <p style={{ color: 'var(--ink-2)', marginTop: 8, marginBottom: 22, fontSize: 14.5 }}>
          Sign up with your <b>phone number</b> — no email needed. If your group already
          added you, you&rsquo;ll see it the moment you&rsquo;re in.
        </p>
        <Suspense>
          <PhoneAuth />
        </Suspense>
      </div>
    </main>
  );
}
