import { redirect } from 'next/navigation';
import { NewGroupForm } from './NewGroupForm';
import { getViewerRole } from '@/lib/data';

export default async function NewGroupPage() {
  const role = await getViewerRole();
  if (role === 'MEMBER') redirect('/dashboard');
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px 90px' }}>
      <a href="/dashboard" style={{ fontSize: 13, color: 'var(--forest)', fontWeight: 600, textDecoration: 'none' }}>← Dashboard</a>
      <p style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700, marginTop: 16 }}>Create a group</p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 30, marginTop: 6 }}>Start a new group</h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6 }}>Give it a name to open its workspace. You&rsquo;ll fill the full charter next.</p>
      <NewGroupForm />
    </main>
  );
}
