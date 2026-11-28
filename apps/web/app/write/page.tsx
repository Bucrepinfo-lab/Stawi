import { getMyGroups } from '@/lib/data';
import { BackLink } from '@/components/BackLink';
import { WriteClient } from './WriteClient';

export const dynamic = 'force-dynamic';

/** "Write it for me" (owner 26/11/26): a photo of handwritten notes becomes a formal document. */
export default async function WritePage({ searchParams }: { searchParams: Promise<{ group?: string; kind?: string; speak?: string }> }) {
  const { group, kind, speak } = await searchParams;
  const groups = await getMyGroups().catch(() => []);
  const groupId = groups.some((g) => g.id === group) ? group! : groups[0]?.id ?? null;
  const aiOn = !!process.env.ANTHROPIC_API_KEY?.trim() && !['off', 'none'].includes((process.env.FORMAL_WRITER_PROVIDER ?? '').trim().toLowerCase());
  return (
    <main className="pillar-1" style={{ maxWidth: 760, margin: '0 auto', padding: '24px 18px 110px' }}>
      <BackLink fallback="/dashboard" />
      <p className="hist-kicker">Write it for me</p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 30, marginTop: 6 }}>{speak === '1' ? 'Say it, and Stawi writes it' : 'From a photo to a proper document'}</h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6 }}>
        {speak === '1'
          ? 'No need to write. Speak your meeting, notice or letter in Kiswahili or English, and Stawi turns it into a clean, formal document for you to check, print or share.'
          : 'Write your points on paper in your own words, in English or Kiswahili, and take a photo. Stawi reads it and writes a clean, formal document for you to check, print or share.'}
      </p>
      <WriteClient groups={groups.map((g) => ({ id: g.id, name: g.name }))} groupId={groupId} initialKind={kind ?? null} aiOn={aiOn} speakFirst={speak === '1'} />
    </main>
  );
}
