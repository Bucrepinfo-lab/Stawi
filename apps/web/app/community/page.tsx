import { CommunityBoard } from './CommunityBoard';

export default function CommunityPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px 80px' }}>
      <p style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700 }}>Group community</p>
      <h1 className="display" style={{ fontWeight: 600, fontSize: 34, marginTop: 6 }}>Messages</h1>
      <p style={{ color: 'var(--ink-2)', marginTop: 6, maxWidth: 560 }}>
        Coordinate with your group. Every message passes a content-safety gate &mdash;
        abusive, inciteful, or hateful language is blocked before it can be posted.
      </p>
      <CommunityBoard />
    </main>
  );
}
