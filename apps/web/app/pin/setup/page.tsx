import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { isReviewPhone } from '@stawi/core';
import { getUserId, getLoginPhone } from '@/lib/auth';
import { pinFeatureEnabled, pinSetupAllowed } from '@/lib/pin';
import { PinSetupForm } from './PinSetupForm';
import { PinNotMpesa } from '@/components/PinNotMpesa';

export const dynamic = 'force-dynamic';

/** Right after a joining code: choose the 4-digit PIN used with the phone number on any device. */
export default async function PinSetupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  if (!pinFeatureEnabled()) redirect(safeNext);
  const [phone, userId] = await Promise.all([getLoginPhone(), getUserId()]);
  if (!phone || !userId) redirect(`/sign-in?next=${encodeURIComponent(safeNext)}`);
  // A PIN is set only right after a joining code.
  if (!(await pinSetupAllowed(userId))) redirect(`/sign-in?code=1&next=${encodeURIComponent(safeNext)}`);
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, background: 'var(--bone)' }}>
      <div style={{ textAlign: 'center', maxWidth: 380, width: '100%' }}>
        <div className="display" style={{ fontSize: 28, fontWeight: 600, color: 'var(--forest-deep)' }}>Choose your Stawi PIN</div>
        <p style={{ color: 'var(--ink-2)', margin: '8px 0 22px', fontSize: 14.5 }}>
          From now on, sign in on any phone or computer with your phone number and this PIN. Keep it to yourself. If you
          forget it, or after 5 wrong tries, a group official gives you a new joining code in person or on WhatsApp.
          Nothing is ever sent by SMS.
        </p>
        <div style={{ marginBottom: 16 }}><PinNotMpesa /></div>
        <Suspense>
          <PinSetupForm next={safeNext} canSkip={isReviewPhone(process.env, phone)} />
        </Suspense>
      </div>
    </main>
  );
}
