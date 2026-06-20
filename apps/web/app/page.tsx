import Link from 'next/link';

const navLink: React.CSSProperties = { fontWeight: 600, color: 'var(--ink-2)' };
const PILLARS = ['1 - Table Banking', '2 - Business Matching', '3 - Accounting & Admin'];

export default function Home() {
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', flexWrap: 'wrap', gap: 12 }}>
        <div className="display" style={{ display: 'flex', alignItems: 'center', gap: 11, fontWeight: 600, fontSize: 24, color: 'var(--forest-deep)' }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(145deg,var(--forest),var(--forest-deep))', display: 'grid', placeItems: 'center' }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2.5px solid var(--gold)', borderTopColor: 'transparent' }} />
          </span>
          Stawi
        </div>
        <nav style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={navLink}>Table banking</Link>
          <Link href="/match" style={navLink}>Find a business</Link>
          <Link href="/books" style={navLink}>Books</Link>
          <Link href="/admin" style={navLink}>Admin</Link>
          <Link href="/dashboard" style={{ fontWeight: 700, color: 'var(--forest-deep)', background: 'var(--gold)', padding: '10px 18px', borderRadius: 12, textDecoration: 'none' }}>Open dashboard</Link>
        </nav>
      </header>

      <section style={{ padding: '60px 0 40px', maxWidth: 760 }}>
        <p style={{ fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700, marginBottom: 16 }}>
          Save / Grow / Run the business
        </p>
        <h1 className="display" style={{ fontWeight: 600, fontSize: 'clamp(36px,6vw,64px)', lineHeight: 1.03 }}>
          Save together.{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--forest)' }}>Grow</em> together.
        </h1>
        <p style={{ marginTop: 18, fontSize: 18, color: 'var(--ink-2)' }}>
          From the merry-go-round to a registered self-help group to a real business with
          real books: table banking, business matching, and QuickBooks-grade accounting in
          one platform. Mobile-first and M-Pesa-native.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
          {PILLARS.map((label) => (
            <span key={label} style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest-deep)', background: 'var(--paper)', border: '1px solid var(--line)', padding: '8px 14px', borderRadius: 999 }}>
              {label}
            </span>
          ))}
        </div>
      </section>

      <footer style={{ marginTop: 60, paddingTop: 24, borderTop: '1px solid var(--line)', color: 'var(--faint)', fontSize: 13 }}>
        Stawi v0.1 - Kenya - built with Next.js, Clerk, M-Pesa Daraja
      </footer>
    </main>
  );
}
