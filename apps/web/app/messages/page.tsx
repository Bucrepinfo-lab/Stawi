import { pickAllowedId } from '@stawi/core';
import { MessagesClient } from './MessagesClient';
import { getMyGroups } from '@/lib/data';
import { getModulesMap } from '@/lib/modules';
import { BackLink } from '@/components/BackLink';
import { WriteForMeLink } from '@/components/WriteForMeLink';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Stawi' };

/** Messages inside the app (owner 20/11/26): talk, ask and answer without a phone call. */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const groups = await getMyGroups();
  const { group } = await searchParams;
  const modulesById = await getModulesMap(groups.map((g) => g.id));
  // Only groups that have messages switched on are offered.
  const open = groups.filter((g) => modulesById[g.id]?.messages).map((g) => ({ id: g.id, name: g.name }));
  const activeId = pickAllowedId(group, open.map((g) => g.id));
  return (
    <main className="pillar-1" style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 90px' }}>
      <BackLink fallback="/dashboard" />
      <WriteForMeLink kind="notice" compact />
      <MessagesClient groups={open} initialId={activeId} />
    </main>
  );
}
