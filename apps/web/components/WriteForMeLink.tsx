/**
 * The way into "Write it for me" (owner 26/11/26), for members who find typing
 * or writing at length hard: a photo of their notes becomes a formal document.
 */
export function WriteForMeLink({ groupId, kind, compact }: { groupId?: string | null; kind?: string; compact?: boolean }) {
  const q = new URLSearchParams();
  if (groupId) q.set('group', groupId);
  if (kind) q.set('kind', kind);
  const href = `/write${q.toString() ? `?${q}` : ''}`;
  return (
    <a href={href} className={compact ? 'wfm wfm-compact' : 'wfm'}>
      <span className="wfm-ico" aria-hidden>
        <svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 7h3l2-2.5h6L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="12.5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
      </span>
      <span className="wfm-text">
        <strong>Write it for me</strong>
        {!compact && <small>Photo your handwritten notes; Stawi writes the letter, notice or minutes.</small>}
      </span>
    </a>
  );
}
