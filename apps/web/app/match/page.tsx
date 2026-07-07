import { BusinessMatch } from './BusinessMatch';

export default function MatchPage() {
  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: '28px 24px 80px' }}>
      <p
        style={{
          fontSize: 12,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          color: 'var(--gold-deep)',
          fontWeight: 700,
        }}
      >
        Pillar 2 · Capital-to-Business Matching
      </p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 34, marginTop: 6 }}>
        Match your capital to a venture
      </h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 600 }}>
        Enter the capital your group raised and pick an industry. Stawi generates
        ventures that fit. Re-roll for fresh ideas, and save at least three to compare
        before the group decides.
      </p>
      <BusinessMatch />
    </main>
  );
}
