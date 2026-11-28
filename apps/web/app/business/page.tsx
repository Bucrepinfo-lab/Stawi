import { pickAllowedId, parsePeriod } from '@stawi/core';
import { BooksClient } from '../books/BooksClient';
import { BusinessStart } from './BusinessStart';
import { getMyGroups, getBusinessMap } from '@/lib/data';
import { getModulesMap } from '@/lib/modules';
import { splitGroups } from '@/lib/business';
import { Picture, type PictureName } from '@/components/Pictures';
import { ValueBanners } from '@/components/ValueBanners';
import { dbEnabled } from '@/lib/data';
import { loadBizBooks, myClosedBusinesses } from '@/lib/biz';
import { ClosedBusinesses } from './CloseBusiness';
import { BizBooks } from './BizBooks';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Stawi' };

const GAINS: { picture: PictureName; title: string; body: string }[] = [
  { picture: 'chart', title: 'Today’s profit in one look', body: 'Write what you sold and what you spent. Stawi adds it up for the day, week, month and year.' },
  { picture: 'box', title: 'What sells, what sleeps', body: 'See the goods that move and the ones sitting on the shelf, and when stock is running low.' },
  { picture: 'purse', title: 'Business money apart from home money', body: 'One clear record for the business, so you always know what it really earned.' },
  { picture: 'certificate', title: 'Records a bank or SACCO can read', body: 'Clean books ready to show when you ask for funding or a supplier asks for proof.' },
];

/**
 * Business (owner 28/11/26): the home of a person's own shop or business, with
 * or without a group. No business yet: what the books do for you and one field
 * to open them. With a business: its books, straight away.
 */
export default async function BusinessPage({ searchParams }: { searchParams: Promise<{ group?: string; period?: string }> }) {
  const all = await getMyGroups();
  const modulesById = await getModulesMap(all.map((g) => g.id));
  const { businesses, groups } = splitGroups(all, modulesById);
  const sp = await searchParams;
  const closed = dbEnabled() ? await myClosedBusinesses().catch(() => []) : [];

  if (businesses.length === 0) {
    return (
      <main className="pillar-3" style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px 110px' }}>
        <section className="biz-hero">
          <span className="biz-hero-pic" aria-hidden><Picture name="shop" size={56} /></span>
          <h1 className="display">Know every day if your business made money</h1>
          <p>
            For a shop, salon, butchery, hotel, boda, farm or any business. Simple books on your phone, in plain words.
            You do not need to be in a group.
          </p>
          <BusinessStart />
        </section>
        <ul className="biz-gains">
          {GAINS.map((g) => (
            <li key={g.title}>
              <span aria-hidden><Picture name={g.picture} size={34} /></span>
              <div><strong>{g.title}</strong><p>{g.body}</p></div>
            </li>
          ))}
        </ul>
        {groups.length > 0 && (
          <p className="biz-note">
            Looking for your group&rsquo;s books? They are inside <a href="/dashboard">My group</a>.
          </p>
        )}
        <ClosedBusinesses list={closed} />
        <ValueBanners pillars={[3]} startCollapsed />
      </main>
    );
  }

  const activeId = pickAllowedId(sp.group, businesses.map((g) => g.id));
  // The full books (owner 28/11/26) when live records are connected; the sample books otherwise.
  const view = dbEnabled() ? await loadBizBooks(activeId).catch((e) => { console.error('[business] load', e instanceof Error ? e.message : e); return null; }) : null;
  if (view) {
    return (
      <main className="pillar-3" style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px 110px' }}>
        {businesses.length > 1 && (
          <nav className="bk-switch" aria-label="My businesses">
            {businesses.map((b) => <a key={b.id} href={`/business?group=${encodeURIComponent(b.id)}`} aria-current={b.id === activeId ? 'page' : undefined}>{b.name}</a>)}
          </nav>
        )}
        <BizBooks key={activeId} view={view} />
        <p className="biz-note"><a href="/groups/new?start=books_only">＋ Add another business</a></p>
        <ClosedBusinesses list={closed} />
      </main>
    );
  }
  const booksByGroup = await getBusinessMap(businesses.map((g) => g.id));
  return (
    <main className="pillar-3" style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 110px' }}>
      <BooksClient groups={businesses} booksByGroup={booksByGroup} initialId={activeId} initialPeriod={parsePeriod(sp.period)} modulesById={modulesById} kicker="My business" />
      <p className="biz-note"><a href="/groups/new?start=books_only">＋ Add another business</a></p>
      <ValueBanners pillars={[3]} startCollapsed />
    </main>
  );
}
