import { BooksClient } from './BooksClient';
import { SaccoActivationCard } from '@/components/SaccoActivationCard';
import { ValueBanners } from '@/components/ValueBanners';
import { getMyGroups, getBusinessMap } from '@/lib/data';
import { saccoPlusEnabled } from '@/lib/features';
import { getModulesMap } from '@/lib/modules';
import { pickAllowedId, parsePeriod } from '@stawi/core';
import { BackLink } from '@/components/BackLink';
import { redirect } from 'next/navigation';
import { splitGroups } from '@/lib/business';

export const dynamic = 'force-dynamic';

export default async function BooksPage({ searchParams }: { searchParams: Promise<{ group?: string; period?: string }> }) {
  // A person's own business has its own tab (owner 28/11/26); this page is the
  // books of a group, reached from inside "My group".
  const all = await getMyGroups();
  const allModules = await getModulesMap(all.map((g) => g.id));
  const { groups, businesses } = splitGroups(all, allModules);
  const asked = (await searchParams).group;
  if (asked && businesses.some((b) => b.id === asked)) redirect(`/business?group=${encodeURIComponent(asked)}`);
  if (groups.length === 0 && businesses.length > 0) redirect('/business');
  const booksByGroup = await getBusinessMap(groups.map((g) => g.id));
  // Filters live in the URL; only the caller's own groups and known periods are accepted.
  const sp = await searchParams;
  const withBooks = groups.filter((g) => booksByGroup[g.id]).map((g) => g.id);
  const ids = [...withBooks, ...groups.map((g) => g.id).filter((id) => !withBooks.includes(id))];
  const activeId = pickAllowedId(sp.group, ids);
  const period = parsePeriod(sp.period);
  const modulesById = allModules;
  return (
    <main className="pillar-3" style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 80px' }}>
      <BackLink fallback="/dashboard" />
      <BooksClient groups={groups} booksByGroup={booksByGroup} initialId={activeId} initialPeriod={period} modulesById={modulesById} kicker="Group books" />
      <ValueBanners pillars={[3]} startCollapsed />
      {saccoPlusEnabled() && <SaccoActivationCard compact />}
    </main>
  );
}
