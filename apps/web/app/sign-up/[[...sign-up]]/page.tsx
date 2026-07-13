import { SignUp } from '@clerk/nextjs';

/**
 * Phone-first sign-up. With phone as the primary identifier (Clerk dashboard),
 * a new member verifies via SMS code — no email required — and is immediately
 * linked to every group whose roster carries that number.
 */
export default function SignUpPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bone)' }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div className="display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--forest-deep)' }}>Join Stawi</div>
        <p style={{ color: 'var(--ink-2)', marginTop: 8, marginBottom: 22, fontSize: 14.5 }}>
          Sign up with your <b>phone number</b> — no email needed. If your group already
          added you, you&rsquo;ll see it the moment you&rsquo;re in.
        </p>
        <SignUp />
      </div>
    </main>
  );
}
