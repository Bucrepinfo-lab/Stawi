/**
 * The way into the Money record from the group page (owner 26/11/26), with
 * what is waiting for this member and any alert they should see.
 */
export function MoneyTrustCard({ groupId, alerts }: {
  groupId: string;
  alerts: { approvals: number; witnessTasks: number; checkTasks: number; overdueWitness: number; disputes: number } | null;
}) {
  const lines: { text: string; tone: 'wait' | 'bad' }[] = [];
  if (alerts) {
    if (alerts.approvals) lines.push({ tone: 'wait', text: `${alerts.approvals} correction${alerts.approvals === 1 ? '' : 's'} waiting for your approval` });
    if (alerts.witnessTasks) lines.push({ tone: 'wait', text: `${alerts.witnessTasks} payment${alerts.witnessTasks === 1 ? '' : 's'} you were named to witness` });
    if (alerts.checkTasks) lines.push({ tone: 'wait', text: `${alerts.checkTasks} contribution${alerts.checkTasks === 1 ? '' : 's'} in your name to confirm` });
    if (alerts.overdueWitness) lines.push({ tone: 'bad', text: `${alerts.overdueWitness} witnessed payment${alerts.overdueWitness === 1 ? '' : 's'} not confirmed after 7 days, or a witness said no` });
    if (alerts.disputes) lines.push({ tone: 'bad', text: `${alerts.disputes} member${alerts.disputes === 1 ? ' says an entry is' : 's say entries are'} wrong — ask for a correction` });
  }
  return (
    <a href={`/groups/${encodeURIComponent(groupId)}/money`} className="mr-task" style={{ display: 'grid', marginTop: 18, textDecoration: 'none', color: 'inherit' }}>
      <strong>Money record — open to every member</strong>
      <span className="mr-meta">Every contribution, its witnesses, members&rsquo; confirmations and every correction with who approved it.</span>
      {lines.length > 0 ? (
        <span className="mr-badges">{lines.map((l) => <span key={l.text} className={`mr-badge ${l.tone}`}>{l.text}</span>)}</span>
      ) : (
        <span className="mr-badges"><span className="mr-badge ok">Nothing waiting for you</span></span>
      )}
    </a>
  );
}
