import { SubscribeGate } from './SubscribeGate';

export default function SubscribePage() {
  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '28px 24px 80px' }}>
      <p style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700 }}>Pricing</p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 34, marginTop: 6 }}>Choose your plan</h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 620 }}>
        Every paid plan starts with a free first month. Prices show in your local
        currency at checkout. You must accept the Subscription Terms to continue.
      </p>
      <SubscribeGate />
    </main>
  );
}
