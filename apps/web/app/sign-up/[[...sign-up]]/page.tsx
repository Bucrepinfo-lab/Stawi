import { Suspense } from 'react';
import { PhoneAuth } from '@/components/phone-auth';

/**
 * Join Stawi with a phone number and a 4-digit PIN — no email, no SMS (owner
 * 20/11/26). Someone starting a group or books opens an account here; a
 * member whose group added them uses the joining code an official gave.
 */
export default function SignUpPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bone)' }}>
      <div style={{ textAlign: 'center', maxWidth: 380, width: '100%' }}>
        <div className="display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--forest-deep)' }}>Join Stawi</div>
        <p style={{ color: 'var(--ink-2)', marginTop: 8, marginBottom: 22, fontSize: 14.5 }}>
          Sign up with your <b>phone number</b> and a PIN only you know — no email needed. If your group
          already added you, use the joining code an official gave you.
        </p>
        <Suspense>
          <PhoneAuth initialMode="start" />
        </Suspense>
      </div>
    </main>
  );
}
