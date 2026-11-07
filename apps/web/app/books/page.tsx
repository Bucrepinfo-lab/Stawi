import { BooksClient } from './BooksClient';
import { SaccoActivationCard } from '@/components/SaccoActivationCard';
import { getMyGroups, getBusinessMap } from '@/lib/data';
import { saccoPlusEnabled } from '@/lib/features';
import { pickAllowedId, parsePeriod } from '@stawi/core';

export const dynamic = 'force-dynamic';

export default async function BooksPage({ searchParams }: { searchParams: Promise<{ group?: string; period?: string }> }) {
  const groups = await getMyGroups();
  const booksByGroup = await getBusinessMap(groups.map((g) => g.id));
  // Filters live in the URL; only the caller's own groups and known periods are accepted.
  const sp = await searchParams;
  const withBooks = groups.filter((g) => booksByGroup[g.id]).map((g) => g.id);
  const ids = [...withBooks, ...groups.map((g) => g.id).filter((id) => !withBooks.includes(id))];
  const activeId = pickAllowedId(sp.group, ids);
  const period = parsePeriod(sp.period);
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 80px' }}>
      <BooksClient groups={groups} booksByGroup={booksByGroup} initialId={activeId} initialPeriod={period} />
      {saccoPlusEnabled() && <SaccoActivationCard compact />}
    </main>
  );
}
