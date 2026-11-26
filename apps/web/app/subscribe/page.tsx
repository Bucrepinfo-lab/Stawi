import { cookies, headers } from 'next/headers';
import { PLAY_APP_COOKIE, PLAY_APP_PURCHASE_UNAVAILABLE, planPurchasesAllowed } from '@stawi/core';
import { SubscribeGate } from './SubscribeGate';
import { ValueBanners } from '@/components/ValueBanners';
import { ShareBar } from '@/components/ShareBar';
import { CountdownBadge } from '@/components/CountdownBadge';
import { daysLeft, foundingUntil } from '@stawi/core';
import { saccoPlusEnabled } from '@/lib/features';
import { BackLink } from '@/components/BackLink';

// Flags and the founding-price date are read per request, never baked in at build.
export const dynamic = 'force-dynamic';

export default async function SubscribePage() {
  // Play payments policy (17/11/26): plans are not sold inside the Play app (TWA).
  const [jar, h] = await Promise.all([cookies(), headers()]);
  const allowed = planPurchasesAllowed({ cookie: jar.get(PLAY_APP_COOKIE)?.value ?? null, referrer: h.get('referer') });
  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '28px 24px 80px' }}>
      <BackLink fallback="/" />
      <p style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700 }}>Pricing</p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 34, marginTop: 6 }}>Choose your plan</h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 620 }}>
        Every paid plan starts with a free first month. Prices show in your local
        currency at checkout. You must accept the Subscription Terms to continue.
      </p>
      <div style={{ marginTop: 12 }}>
        <CountdownBadge days={daysLeft(foundingUntil(process.env))} label="days left to join at the founding price" />
      </div>
      {allowed ? (
        <SubscribeGate />
      ) : (
        <p style={{ marginTop: 18, color: 'var(--ink-2)' }}>{PLAY_APP_PURCHASE_UNAVAILABLE}</p>
      )}
      <ValueBanners pillars={[1, 2, 3, 4]} saccoPlus={saccoPlusEnabled()} limit={3} startCollapsed />
      <ShareBar />
    </main>
  );
}
