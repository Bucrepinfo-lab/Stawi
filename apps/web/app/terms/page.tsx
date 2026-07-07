const SECTIONS: { h: string; b: string }[] = [
  { h: '1. Software, not a bank', b: 'Stawi is a software service — not a bank, SACCO, money-services business, investment/tax adviser, or law firm. Calculations, venture matches, tax/levy estimates and formalization guidance are informational only and are not financial, legal, or tax advice.' },
  { h: '2. Subscriptions & first month free', b: 'Plans: Free, Starter, Growth, Enterprise. Paid plans include a first-month-free trial, then auto-renew until cancelled. Prices show in your local currency and exclude taxes unless stated. Cancel anytime, effective end of period; fees are non-refundable except where local consumer law requires otherwise.' },
  { h: '3. Money & payments', b: 'Payments are processed by licensed third parties (M-Pesa, card networks, local processors). Unless expressly licensed to do so, Stawi does not take custody of member contributions. Treasurers and officials are responsible for the correct handling of group funds.' },
  { h: '4. Acceptable use & content safety', b: 'No unlawful, abusive, harassing, threatening, hateful, discriminatory, or violence-inciting content. Automated input gates plus human review block and remove violations; serious matters may be reported to authorities. Accounts that violate this may be suspended or terminated.' },
  { h: '5. Data protection', b: 'We process personal data per applicable law — EU/UK GDPR, Kenya DPA, Nigeria NDPA, POPIA, CCPA/CPRA, India DPDP, Brazil LGPD and others — and your local rights apply. Handle other members’ data lawfully and only for legitimate group purposes.' },
  { h: '6. Multi-tenant isolation', b: 'Each tenant’s data is isolated; do not attempt to access another tenant’s data. We apply reasonable security but cannot guarantee absolute security.' },
  { h: '7. Disclaimers & liability', b: 'The Service is provided “as is”. To the extent permitted by law, our aggregate liability is capped at amounts you paid us in the prior 12 months, and we are not liable for indirect or consequential losses or for third-party payment outcomes.' },
];

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px 80px' }}>
      <p style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700 }}>Legal</p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 34, marginTop: 6 }}>Subscription Terms &amp; Conditions</h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6 }}>
        Summary of the key terms. The full Terms govern your use of Stawi; this page highlights the essentials.
      </p>
      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {SECTIONS.map((s) => (
          <div key={s.h} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 18, boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--forest-deep)' }}>{s.h}</h2>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.6 }}>{s.b}</p>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 20, fontSize: 12.5, color: 'var(--dim)' }}>
        This is a plain-language summary, not the complete agreement, and not legal advice. By subscribing you accept the full Subscription Terms &amp; Conditions.
      </p>
    </main>
  );
}
