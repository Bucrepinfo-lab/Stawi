import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { isReviewPhone } from '@stawi/core';
import { getUserId, getUserPhone } from '@/lib/auth';
import { pinFeatureEnabled, smsVerifiedRecently } from '@/lib/pin';
import { PinSetupForm } from './PinSetupForm';

export const dynamic = 'force-dynamic';

/** After a verified SMS sign-in: choose a 4-digit PIN for this device. */
export default async function PinSetupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  if (!pinFeatureEnabled()) redirect(safeNext);
  const [phone, userId] = await Promise.all([getUserPhone(), getUserId()]);
  if (!phone || !userId) redirect(`/sign-in?next=${encodeURIComponent(safeNext)}`);
  // Existing sessions (from before PINs) confirm with one SMS code first.
  if (!(await smsVerifiedRecently(userId))) redirect(`/sign-in?sms=1&next=${encodeURIComponent(safeNext)}`);
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, background: 'var(--bone)' }}>
      <div style={{ textAlign: 'center', maxWidth: 380, width: '100%' }}>
        <div className="display" style={{ fontSize: 28, fontWeight: 600, color: 'var(--forest-deep)' }}>Choose a 4-digit PIN</div>
        <p style={{ color: 'var(--ink-2)', margin: '8px 0 22px', fontSize: 14.5 }}>
          Next time on this phone, sign in with your PIN instead of waiting for an SMS. On a new phone, or after 5 wrong
          PINs, we&apos;ll text you a code again.
        </p>
        <Suspense>
          <PinSetupForm next={safeNext} canSkip={isReviewPhone(process.env, phone)} />
        </Suspense>
      </div>
    </main>
  );
}
