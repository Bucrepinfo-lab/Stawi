import { redirect } from 'next/navigation';
import { pickAllowedId } from '@stawi/core';
import { getMyGroups } from '@/lib/data';

export const dynamic = 'force-dynamic';

/**
 * Short door to a group's papers pack (owner 28/11/26), for links that cannot
 * know the group, such as the value banners. Opens the viewer's own group;
 * the papers page itself checks who may see it.
 */
export default async function PapersDoor({ searchParams }: { searchParams: Promise<{ for?: string; group?: string }> }) {
  const { for: wanted, group } = await searchParams;
  const groups = await getMyGroups().catch(() => []);
  const id = pickAllowedId(group, groups.map((g) => g.id));
  if (!id) redirect('/dashboard');
  const purpose = /^[a-z_]{1,30}$/.test(wanted ?? '') ? `?for=${wanted}` : '';
  redirect(`/groups/${encodeURIComponent(id)}/papers${purpose}`);
}
