import Link from 'next/link';
import type { ReactNode } from 'react';

/** Shared shell for the public legal pages (no sign-in needed). */
export function LegalPage({ kicker, title, updated, children }: { kicker: string; title: string; updated: string; children: ReactNode }) {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px 80px', lineHeight: 1.6 }}>
      <Link href="/" style={{ fontSize: 13, color: 'var(--forest)', fontWeight: 600, textDecoration: 'none' }}>← Stawi</Link>
      <p style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700, marginTop: 14 }}>{kicker}</p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 32, marginTop: 6 }}>{title}</h1>
      <p style={{ color: 'var(--dim)', marginTop: 4, fontSize: 13 }}>Last updated {updated}</p>
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
      <nav style={{ marginTop: 28, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
        <Link href="/privacy" style={{ color: 'var(--ink-2)' }}>Privacy</Link>
        <Link href="/terms" style={{ color: 'var(--ink-2)' }}>Terms</Link>
        <Link href="/delete-account" style={{ color: 'var(--ink-2)' }}>Delete your account</Link>
      </nav>
    </main>
  );
}

export function LegalSection({ h, children }: { h: string; children: ReactNode }) {
  return (
    <section style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 18 }}>
      <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--forest-deep)', margin: 0 }}>{h}</h2>
      <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 6 }}>{children}</div>
    </section>
  );
}

export { CONTACT_EMAIL } from '@/lib/contact';
