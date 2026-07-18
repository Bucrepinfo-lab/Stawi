import { BooksClient } from './BooksClient';
import { SaccoActivationCard } from '@/components/SaccoActivationCard';
import { getMyGroups, getBusinessMap } from '@/lib/data';

export default async function BooksPage() {
  const groups = await getMyGroups();
  const booksByGroup = await getBusinessMap(groups.map((g) => g.id));
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 80px' }}>
      <BooksClient groups={groups} booksByGroup={booksByGroup} />
      <SaccoActivationCard compact />
    </main>
  );
}
