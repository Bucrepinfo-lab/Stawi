import { formatMoney, notifyPaymentConfirmed, notifySubscriptionDue, notificationsForStock, classifyStock } from '@stawi/core';
import { NotificationBell } from '@/components/NotificationBell';

const card: React.CSSProperties = {
  background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius)',
  padding: 22, boxShadow: 'var(--shadow)', marginTop: 18,
};

const KPIS = [
  { k: '1,284', l: 'Groups onboard', t: '▲ 6.2% wk' },
  { k: '18,402', l: 'Subscribed members', t: '▲ 4.1% wk' },
  { k: 'KES 184k', l: 'Monthly recurring', t: '▲ 9.0% wk' },
  { k: '312', l: 'Businesses live', t: '▲ 11% wk' },
];

const TIERS = [
  { lvl: 'Global', who: 'Super Admin', region: 'All regions', groups: 1284 },
  { lvl: 'Continental', who: 'East Africa Lead', region: '3 countries', groups: 540 },
  { lvl: 'National', who: 'Kenya Manager', region: '47 counties', groups: 420 },
  { lvl: 'County', who: 'Nairobi County', region: '17 constituencies', groups: 96 },
  { lvl: 'Constituency', who: 'Westlands Rep', region: 'Field sales', groups: 22 },
];

const GROUPS = [
  { name: 'Umoja Women Group', tier: 'Westlands', members: 24, subs: 22, capital: 16_400_000, status: 'Active' },
  { name: 'Vijana SACCO', tier: 'Kasarani', members: 61, subs: 58, capital: 92_300_000, status: 'Active' },
  { name: 'Mama Mboga Hub', tier: 'Embakasi', members: 12, subs: 12, capital: 8_900_000, status: 'Trial' },
  { name: 'Boda Investors', tier: 'Langata', members: 38, subs: 30, capital: 41_200_000, status: 'Past due' },
];

const STATUS_COLOR: Record<string, string> = { Active: 'var(--good)', Trial: 'var(--sky)', 'Past due': 'var(--danger)' };

export default function AdminPage() {
  // Demo notification feed assembled from the core builders.
  const stock = classifyStock([
    { id: 's3', name: 'Sugar 1kg', quantity: 3, reorderLevel: 12, soldInWindow: 42, supplierName: 'Mumias' },
  ]);
  const notifications = [
    notifyPaymentConfirmed('Joseph Kamau', 3_800_000, 'SGR7XYZ123'),
    ...notificationsForStock(stock),
    notifySubscriptionDue('Boda Investors', 1000),
  ];

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700 }}>Pillar 3 · Super-Admin</p>
          <h1 className="display" style={{ fontWeight: 600, fontSize: 34, marginTop: 6 }}>Command center</h1>
        </div>
        <NotificationBell notifications={notifications} />
      </div>
      <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 620 }}>
        Every group, business and subscription across the sales hierarchy &mdash; constituency
        to global. Each tier supervises the one below and rolls reports upward.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12, marginTop: 22 }}>
        {KPIS.map((kpi) => (
          <div key={kpi.l} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow)' }}>
            <div className="mono" style={{ fontSize: 24, fontWeight: 600, color: 'var(--forest-deep)' }}>{kpi.k}</div>
            <div style={{ fontSize: 12, color: 'var(--dim)', fontWeight: 600, marginTop: 2 }}>{kpi.l}</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--good)', marginTop: 5 }}>{kpi.t}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <h2 className="display" style={{ fontWeight: 600, fontSize: 20 }}>Sales &amp; supervision hierarchy</h2>
        <div style={{ marginTop: 12 }}>
          {TIERS.map((t, i) => (
            <div key={t.lvl} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 4px', borderBottom: i < TIERS.length - 1 ? '1px solid var(--line)' : 'none', marginLeft: i * 14 }}>
              <span style={{ width: 92, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--gold-deep)' }}>{t.lvl}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t.who}</div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{t.region}</div>
              </div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', textAlign: 'right' }}>
                {t.groups}
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: 'var(--faint)', fontWeight: 600 }}>groups</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <h2 className="display" style={{ fontWeight: 600, fontSize: 20 }}>Onboarded groups &amp; businesses</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 13.5 }}>
          <thead>
            <tr>
              {['Group', 'Area', 'Members', 'Subscribed', 'Capital', 'Status'].map((h, i) => (
                <th key={h} style={{ textAlign: i >= 2 && i <= 4 ? 'right' : 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--dim)', fontWeight: 700, padding: '8px 10px', borderBottom: '1.5px solid var(--line)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => (
              <tr key={g.name}>
                <td style={{ padding: 10, borderBottom: '1px solid var(--line)', fontWeight: 600 }}>{g.name}</td>
                <td style={{ padding: 10, borderBottom: '1px solid var(--line)', color: 'var(--dim)' }}>{g.tier}</td>
                <td className="mono" style={{ padding: 10, borderBottom: '1px solid var(--line)', textAlign: 'right' }}>{g.members}</td>
                <td className="mono" style={{ padding: 10, borderBottom: '1px solid var(--line)', textAlign: 'right' }}>{g.subs}</td>
                <td className="mono" style={{ padding: 10, borderBottom: '1px solid var(--line)', textAlign: 'right' }}>{formatMoney(g.capital)}</td>
                <td style={{ padding: 10, borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 7, background: 'var(--bone-2)', color: STATUS_COLOR[g.status] }}>{g.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--dim)' }}>
          Weekly, monthly and financial reports are generated per tier and pushed upward to the supervising level.
        </p>
      </div>
    </main>
  );
}
