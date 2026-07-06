import { SaccoStudio } from './SaccoStudio';

export const metadata = {
  title: 'Stawi SACCO+ — savings & credit services',
  description:
    'Open an account, save with interest, borrow at 1%/month reducing balance, and watch your institution climb the ladder from chama to listed bank.',
};

export default function SaccoPage() {
  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '28px 24px 80px' }}>
      <p
        style={{
          fontSize: 12,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          color: 'var(--gold-deep)',
          fontWeight: 700,
        }}
      >
        Pillar 4 · Stawi SACCO+ — Savings &amp; Credit
      </p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 34, marginTop: 6 }}>
        Save, borrow, and graduate — all digital
      </h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 640 }}>
        No branches, no paperwork, no hidden charges. Deposits earn 10% a year,
        loans start at 1% a month on reducing balance, and the system — not a
        committee — scores every application in seconds. Built on the reasons
        others failed, so your group doesn&apos;t.
      </p>
      <SaccoStudio />
    </main>
  );
}
