import { TableBanking } from './TableBanking';

// In production this loads the member's group from Postgres (via @stawi/db) and
// gates on Clerk auth (handled by middleware). Seed data here keeps the
// prototype self-contained.
const seed = [
  { memberId: 'a', name: 'Amina Wanjiru', role: 'Treasurer', totalCents: 4_200_000, paid: true },
  { memberId: 'b', name: 'Joseph Kamau', role: 'Chairman', totalCents: 3_800_000, paid: true },
  { memberId: 'c', name: 'Grace Otieno', role: 'Secretary', totalCents: 3_100_000, paid: true },
  { memberId: 'd', name: 'David Mwangi', role: 'Member', totalCents: 2_400_000, paid: false },
  { memberId: 'e', name: 'Faith Njeri', role: 'Member', totalCents: 1_900_000, paid: true },
  { memberId: 'f', name: 'Brian Ouma', role: 'Member', totalCents: 1_400_000, paid: false },
];

export default function DashboardPage() {
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
        Umoja Women Group · Table Banking
      </p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 34, marginTop: 6 }}>
        Group capital, live
      </h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 560 }}>
        When the treasurer records a contribution, every member&rsquo;s share recomputes
        instantly. Try it below.
      </p>
      <TableBanking seed={seed} />
    </main>
  );
}
