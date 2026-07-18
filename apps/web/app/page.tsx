import Link from 'next/link';
import { FAILURE_GAPS } from '@stawi/core';

const navLink: React.CSSProperties = { fontWeight: 600, color: 'var(--ink-2)' };
const PILLARS = ['1 - Table Banking', '2 - Business Matching', '3 - Accounting & Admin', '4 - SACCO+ Savings & Credit'];

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
        <nav style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={navLink}>Table banking</Link>
          <Link href="/match" style={navLink}>Find a business</Link>
          <Link href="/books" style={navLink}>Books</Link>
          <Link href="/formalize" style={navLink}>Formalize</Link>
          <Link href="/sacco" style={navLink}>SACCO+</Link>
          <Link href="/community" style={navLink}>Community</Link>
          <Link href="/admin" style={navLink}>Admin</Link>
          <Link href="/subscribe" style={{ fontWeight: 700, color: 'var(--forest-deep)', background: 'var(--gold)', padding: '10px 18px', borderRadius: 12, textDecoration: 'none' }}>Pricing</Link>
        </nav>
      </header>

      <section style={{ padding: '60px 0 40px', maxWidth: 780 }}>
        <p style={{ fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700, marginBottom: 16 }}>
          Save / Grow / Run the business · worldwide
        </p>
        <h1 className="display" style={{ fontWeight: 600, fontSize: 'clamp(36px,6vw,64px)', lineHeight: 1.03 }}>
          Save together.{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--forest)' }}>Grow</em> together.
        </h1>
        <p style={{ marginTop: 18, fontSize: 18, color: 'var(--ink-2)' }}>
          A global, multi-tenant platform for cooperative saving and enterprise: table
          banking, business matching, QuickBooks-grade accounting, and full SACCO
          savings &amp; credit — localized to each country&rsquo;s currency, tax, and
          registration rules.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
          {PILLARS.map((label) => (
            <span key={label} style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest-deep)', background: 'var(--paper)', border: '1px solid var(--line)', padding: '8px 14px', borderRadius: 999 }}>
              {label}
            </span>
          ))}
        </div>
      </section>

      <section aria-label="Why others failed" style={{ padding: '30px 0 10px' }}>
        <p style={{ fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700 }}>
          Our niche — built on the reasons others failed
        </p>
        <h2 className="display" style={{ fontWeight: 600, fontSize: 'clamp(24px,3.5vw,36px)', marginTop: 8, maxWidth: 720 }}>
          Eight reasons microfinance collapses.<br />Eight guard-rails, built in.
        </h2>
        <p style={{ marginTop: 10, color: 'var(--ink-2)', maxWidth: 680, fontSize: 15 }}>
          We studied why savings groups never graduate into SACCOs, banks and listed
          institutions — fraud, liquidity runs, thin capital, paper books, committee
          lending, branch costs, uninformed members, compliance gaps — and digitalized
          the cure for each one. That research is the product.
        </p>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginTop: 20 }}>
          {FAILURE_GAPS.map((g, i) => (
            <div key={g.id} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold-deep)' }}>{String(i + 1).padStart(2, '0')}</span>
              <h3 style={{ fontSize: 14.5, margin: '4px 0 6px' }}>{g.gap}</h3>
              <p style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: 0 }}>{g.stawiSolution}</p>
            </div>
          ))}
        </div>
        <Link href="/sacco" style={{ display: 'inline-block', marginTop: 18, fontWeight: 800, color: 'var(--forest-deep)' }}>
          See the full graduation engine →
        </Link>
      </section>

      <footer style={{ marginTop: 60, paddingTop: 24, borderTop: '1px solid var(--line)', color: 'var(--faint)', fontSize: 13, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span>Stawi v0.1 — global multi-tenant SaaS</span>
        <Link href="/terms" style={{ color: 'var(--faint)' }}>Terms</Link>
        <Link href="/subscribe" style={{ color: 'var(--faint)' }}>Pricing</Link>
      </footer>
    </main>
  );
}
