import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '90px 24px', textAlign: 'center' }}>
      <p style={{ fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700 }}>404</p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 40, marginTop: 10 }}>Page not found</h1>
      <p style={{ marginTop: 12, color: 'var(--ink-2)', fontSize: 15 }}>
        The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
      </p>
      <Link href="/" style={{ display: 'inline-block', marginTop: 22, fontWeight: 700, color: 'var(--forest-deep)', background: 'var(--gold)', padding: '11px 20px', borderRadius: 12, textDecoration: 'none' }}>
        ← Back to Stawi
      </Link>
    </main>
  );
}
