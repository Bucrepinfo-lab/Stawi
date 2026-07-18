import { SignIn } from '@clerk/nextjs';

/**
 * Phone-first sign-in. Configure phone number as the primary identifier with SMS
 * code in the Clerk dashboard (Identifiers → Phone number; Auth → SMS code) so
 * members with no email can enter with the same number that appears on their
 * group's roster. That number is the join key that surfaces their groups.
 */
export default function SignInPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bone)' }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div className="display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--forest-deep)' }}>Welcome back to Stawi</div>
        <p style={{ color: 'var(--ink-2)', marginTop: 8, marginBottom: 22, fontSize: 14.5 }}>
          Enter with your <b>phone number</b> — the same one your group registered you with. Your groups appear automatically.
        </p>
        <SignIn />
      </div>
    </main>
  );
}
