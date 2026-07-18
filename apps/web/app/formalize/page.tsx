import { FormalizeWizard } from './FormalizeWizard';

export default function FormalizePage() {
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '28px 24px 80px' }}>
      <p style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700 }}>
        Pillar 1 · Formalization
      </p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 34, marginTop: 6 }}>
        From chama to registered group
      </h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 620 }}>
        A guided path to register your group under Kenyan law &mdash; as a Self-Help Group
        first, then a SACCO as you grow. Tick each step as you complete it; Stawi tracks
        your progress and the governing statute.
      </p>
      <FormalizeWizard />
    </main>
  );
}
