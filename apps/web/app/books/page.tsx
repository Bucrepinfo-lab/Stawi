import { Books } from './Books';

export default function BooksPage() {
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 80px' }}>
      <p
        style={{
          fontSize: 12,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          color: 'var(--gold-deep)',
          fontWeight: 700,
        }}
      >
        Pillar 3 · Accounting
      </p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 34, marginTop: 6 }}>
        Mama Mboga Hub · the books
      </h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 620 }}>
        Daily P&amp;L that auto-reconciles to week, month and year. Taxes and levies are
        computed automatically, stock movement is classified, and low-stock items raise
        a supplier alert.
      </p>
      <Books />
    </main>
  );
}
