'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BEFORE_YOU_DECIDE, IDEA_CRITERIA, confirmNote, formatMoney, type IdeaComparison, type IdeaStudy, type IdeaTally } from '@stawi/core';
import { researchIdeasOnWebAction } from '../actions';
import { castIdeaVoteAction, closeIdeaVoteAction, confirmIdeaChoiceAction, presentIdeasForVoteAction } from '../vote-actions';
import type { WebResearch } from '@/lib/idea-research-ai';

const VERDICT: Record<IdeaStudy['verdict'], { label: string; tone: string; ink: string }> = {
  best: { label: 'Most favourable', tone: 'var(--forest-deep)', ink: 'var(--bone)' },
  second: { label: 'Second choice', tone: 'var(--gold)', ink: 'var(--forest-deep)' },
  weakest: { label: 'Weakest of the three', tone: 'var(--bone-2, #efe8d9)', ink: 'var(--ink)' },
};

export interface VoteView {
  id: string;
  open: boolean;
  chosenTitle: string | null;
  chosenOn: string | null;
  chosenBy: string | null;
  /** Closed by a newer list, with no choice. */
  replaced: boolean;
  /** Closed with no choice (by an official, or replaced). */
  closedNoChoice: boolean;
  tally: IdeaTally;
  myTitle: string | null;
  canConfirm: boolean;
  /** Officials who may open a vote may also close it without a choice. */
  canClose: boolean;
}

const ddmmyy = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : '');
const kes = (c: number) => `KES ${formatMoney(Math.max(0, c))}`;
const months = (m: number | null) => (m === null ? 'Does not pay back' : m < 1 ? 'Under a month' : `About ${Math.round(m)} month${Math.round(m) === 1 ? '' : 's'}`);

export function CompareIdeas({
  comparison,
  params,
  capitalCents,
  groupId,
  groupName,
  webResearch,
  vote = null,
  canPresent = false,
  openVoteId = null,
}: {
  comparison: IdeaComparison;
  params: string[];
  capitalCents: number;
  groupId: string | null;
  groupName: string | null;
  webResearch: boolean;
  vote?: VoteView | null;
  canPresent?: boolean;
  openVoteId?: string | null;
}) {
  const { studies } = comparison;
  const router = useRouter();
  const [chosen, setChosen] = useState<string | null>(vote?.chosenTitle ?? null);
  const [busy, setBusy] = useState('');
  const [askClose, setAskClose] = useState(false);
  const [voteError, setVoteError] = useState('');
  const [pick, setPick] = useState<string>(vote?.tally.leader ?? studies[0]?.venture.title ?? '');
  const [web, setWeb] = useState<WebResearch | null>(null);
  const [webBusy, setWebBusy] = useState(false);
  const [webError, setWebError] = useState('');
  const [copied, setCopied] = useState(false);
  const backToIdeas = `/match${groupId ? `?group=${encodeURIComponent(groupId)}` : ''}#shortlist`;
  const n = studies.length;

  if (n < 2) {
    return (
      <section className="ci-card" style={{ marginTop: 16 }}>
        <h1 className="display ci-h1">Save ideas to compare them</h1>
        <p className="mr-meta">{comparison.summary} Stawi researches two or three saved ideas side by side.</p>
        <a className="mr-btn go" href={backToIdeas} style={{ marginTop: 12 }}>Back to ideas</a>
        <style>{css}</style>
      </section>
    );
  }

  const shareText = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const lines = studies.map((s) => `${s.rank}. ${s.venture.title} (${VERDICT[s.verdict].label}, ${s.total}/100): about ${kes(s.monthlyProfitCents)} profit a month, money back in ${months(s.paybackMonths).toLowerCase()}`);
    return [`${groupName ? `${groupName}: ` : ''}our ${n} business ideas, researched by Stawi`, ...lines, '', 'Open it, read the reasons, and come ready to decide:', url].join('\n');
  };

  async function runWeb() {
    setWebBusy(true);
    setWebError('');
    const out = await researchIdeasOnWebAction(params, capitalCents).catch(() => ({ ok: false as const, error: 'The web research did not finish this time. Try again in a minute.' }));
    setWebBusy(false);
    if (out.ok) setWeb(out.research);
    else setWebError(out.error);
  }

  async function openVote() {
    if (!groupId) return;
    setBusy('present');
    setVoteError('');
    const out = await presentIdeasForVoteAction(groupId, params, capitalCents).catch(() => ({ ok: false as const, error: 'That did not go through. Try again.' }));
    setBusy('');
    if (!out.ok) return setVoteError(out.error);
    router.push(`/match/compare?vote=${encodeURIComponent(out.id ?? '')}&group=${encodeURIComponent(groupId)}`);
  }
  async function castVote(title: string) {
    if (!vote) return;
    setBusy(title);
    setVoteError('');
    const out = await castIdeaVoteAction(vote.id, title).catch(() => ({ ok: false as const, error: 'Your vote did not go through. Try again.' }));
    setBusy('');
    if (!out.ok) return setVoteError(out.error);
    router.refresh();
  }
  async function confirmChoice() {
    if (!vote || !pick) return;
    setBusy('confirm');
    setVoteError('');
    const out = await confirmIdeaChoiceAction(vote.id, pick).catch(() => ({ ok: false as const, error: 'That did not go through. Try again.' }));
    setBusy('');
    if (!out.ok) return setVoteError(out.error);
    setChosen(pick);
    router.refresh();
  }

  async function closeVote() {
    if (!vote) return;
    setBusy('close');
    setVoteError('');
    const out = await closeIdeaVoteAction(vote.id).catch(() => ({ ok: false as const, error: 'That did not go through. Try again.' }));
    setBusy('');
    setAskClose(false);
    if (!out.ok) return setVoteError(out.error);
    router.refresh();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  const choice = studies.find((s) => s.venture.title === chosen) ?? null;

  return (
    <div className="ci">
      <style>{css}</style>
      <header>
        <p className="ci-kicker">Your shortlist, researched</p>
        <h1 className="display ci-h1">Which business should {groupName ?? 'the group'} start?</h1>
        <p className="ci-lead">{comparison.summary}</p>
        <p className="mr-meta">
          Scored on eight points that decide whether a small business survives{capitalCents > 0 ? `, against the KES ${formatMoney(capitalCents)} the group has` : ''}. These are rough guides for your discussion, not promises. Check them on the ground before you put money in.
        </p>
      </header>

      {/* Ranking */}
      <ol className="ci-rank">
        {studies.map((s) => (
          <li key={s.venture.title} className={`ci-card ci-${s.verdict}`}>
            <div className="ci-top">
              <span className="ci-badge" style={{ background: VERDICT[s.verdict].tone, color: VERDICT[s.verdict].ink }}>
                {s.rank}. {VERDICT[s.verdict].label}
              </span>
              <span className="ci-score mono" aria-label={`Score ${s.total} of 100`}>{s.total}<small>/100</small></span>
            </div>
            <h2 className="display ci-h2">{s.venture.title}</h2>
            <div className="ci-bar" aria-hidden><span style={{ width: `${s.total}%` }} /></div>
            <dl className="ci-nums">
              <div><dt>Start-up cost</dt><dd className="mono">{kes(s.venture.startupCents)}</dd></div>
              <div><dt>Profit a month (about)</dt><dd className="mono">{s.monthlyProfitCents > 0 ? kes(s.monthlyProfitCents) : 'Loss at these numbers'}</dd></div>
              <div><dt>Money back in</dt><dd>{months(s.paybackMonths)}</dd></div>
              <div><dt>First sale</dt><dd>{s.profile.firstSaleWeeks <= 1 ? 'This week' : `In about ${s.profile.firstSaleWeeks} weeks`}</dd></div>
              <div><dt>Risk</dt><dd>{s.venture.risk}</dd></div>
              {s.leftoverCents !== null && (
                <div><dt>{s.leftoverCents >= 0 ? 'Left in the group' : 'Short by'}</dt><dd className="mono" style={{ color: s.leftoverCents < 0 ? 'var(--danger)' : undefined }}>{kes(Math.abs(s.leftoverCents))}</dd></div>
              )}
            </dl>
            <ul className="ci-why">{s.why.map((w) => <li key={w}>{w}</li>)}</ul>
          </li>
        ))}
      </ol>
      {comparison.close && <p className="ci-note">The top two are too close to call on numbers alone. Who will run it, where it will be, and what you see on the ground should decide.</p>}

      {/* Side by side */}
      <section className="ci-card">
        <h2 className="display ci-h2">Side by side</h2>
        <div className="ci-scroll">
          <table className="ci-table">
            <thead>
              <tr><th scope="col">What we checked</th>{studies.map((s) => <th scope="col" key={s.venture.title}>{s.venture.title}</th>)}</tr>
            </thead>
            <tbody>
              {IDEA_CRITERIA.map((c) => {
                const best = Math.max(...studies.map((s) => s.scores[c.key]));
                return (
                  <tr key={c.key}>
                    <th scope="row">{c.label}<small> · counts {c.weight}%</small></th>
                    {studies.map((s) => (
                      <td key={s.venture.title} className={s.scores[c.key] === best ? 'ci-lead-cell' : ''}>
                        <span className="ci-mini" aria-hidden><span style={{ width: `${s.scores[c.key]}%` }} /></span>
                        <span className="mono">{s.scores[c.key]}</span>
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr className="ci-total"><th scope="row">Overall</th>{studies.map((s) => <td key={s.venture.title} className="mono">{s.total}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Deep dive per idea */}
      <section>
        <h2 className="display ci-h2" style={{ margin: '22px 0 8px' }}>Everything about each idea</h2>
        {studies.map((s, i) => (
          <details key={s.venture.title} className="ci-card ci-detail" open={i === 0}>
            <summary><span>{s.venture.title}</span><span className="mr-meta">{VERDICT[s.verdict].label}</span></summary>
            <Block title="What the money buys" items={s.profile.buys} />
            <div className="ci-two">
              <Block title="Good points" items={s.profile.merits} tone="good" />
              <Block title="Weak points" items={s.profile.demerits} tone="bad" />
            </div>
            <Block
              title="Money, roughly"
              items={[
                `Sales of about ${kes(s.monthlySalesCents)} a month at a gross margin near ${s.venture.marginPct}%.`,
                `Rent, wages, power and transport take about ${Math.round(s.profile.overheadShare * 100)}% of sales.`,
                s.monthlyProfitCents > 0 ? `That leaves about ${kes(s.monthlyProfitCents)} a month, so the money comes back in ${months(s.paybackMonths).toLowerCase()}.` : 'At these numbers running costs eat the margin. Find a better price or cheaper costs first.',
                `Time it takes: ${s.profile.hours.charAt(0).toLowerCase()}${s.profile.hours.slice(1)}.`,
                `Seasons: ${s.profile.seasons}`,
              ]}
            />
            <Block title="Papers you need in Kenya (check with your county)" items={s.profile.legal} />
            <div className="ci-block">
              <h3>Risks and how to protect the group</h3>
              <ul className="ci-risks">
                {s.profile.risks.map((r, k) => (
                  <li key={r}><b>{r}.</b> {s.profile.protect[k]}.</li>
                ))}
              </ul>
            </div>
            <div className="ci-two">
              <Block title="How it can grow" items={s.profile.grow} />
              <Block title="What to add later" items={s.profile.diversify} />
            </div>
            <Block title="Check on the ground first" items={s.profile.check} tone="gold" />
          </details>
        ))}
      </section>

      {/* Web research */}
      <section className="ci-card">
        <h2 className="display ci-h2">Fresh research from the web</h2>
        {!web && (
          <>
            <p className="mr-meta">
              Stawi’s research above is built in. For today’s prices, rules and news on these {n} ideas, Claude can search Kenyan sources now and show you where each fact came from. It takes about a minute.
            </p>
            {webResearch ? (
              <button type="button" className="mr-btn go" onClick={runWeb} disabled={webBusy} style={{ marginTop: 10 }}>
                {webBusy ? 'Researching… about a minute' : 'Research deeper on the web'}
              </button>
            ) : (
              <p className="mr-meta" style={{ marginTop: 8 }}>Web research is not switched on yet.</p>
            )}
            {webError && <p className="ci-err" role="alert">{webError}</p>}
          </>
        )}
        {web && (
          <div className="ci-web">
            {web.text.split('\n').map((line, k) =>
              line.startsWith('## ') ? <h3 key={k}>{line.slice(3)}</h3> : line.trim() ? <p key={k}>{line.replace(/^[-*]\s*/, '• ').replace(/\*\*/g, '')}</p> : null,
            )}
            {web.sources.length > 0 && (
              <>
                <h3>Sources</h3>
                <ol className="ci-sources">{web.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></li>)}</ol>
              </>
            )}
            <p className="mr-meta">Found on the web by Claude today. Check figures with people who run these businesses near you.</p>
          </div>
        )}
      </section>

      {/* Before deciding */}
      <section className="ci-card">
        <h2 className="display ci-h2">Answer these before you decide</h2>
        <ol className="ci-qs">{BEFORE_YOU_DECIDE.map((q) => <li key={q}>{q}</li>)}</ol>
      </section>

      {/* Decide */}
      <section className="ci-card ci-decide" id="decide">
        <h2 className="display ci-h2">Now decide</h2>
        {vote?.chosenTitle ? (
          <div className="ci-chosen">
            <p className="ci-kicker">Confirmed</p>
            <h3 className="display">{groupName ?? 'The group'} chose {vote.chosenTitle}</h3>
            <p className="mr-meta">Confirmed{vote.chosenBy ? ` by ${vote.chosenBy}` : ''} on {ddmmyy(vote.chosenOn)}, after {vote.tally.voted} of {vote.tally.memberCount} members voted. The next steps are below.</p>
          </div>
        ) : vote?.replaced ? (
          <p className="ci-note">This vote was replaced by a newer list. Open the latest vote from the alert or the Ideas page.</p>
        ) : vote?.closedNoChoice ? (
          <p className="ci-note">This vote was closed without a choice. {vote.tally.voted} of {vote.tally.memberCount} members had voted; those votes stay in the record. An official can open a new vote when the group is ready.</p>
        ) : vote?.open ? (
          <div className="ci-vote">
            <h3 className="display">Vote: which business should we start?</h3>
            <p className="mr-meta">
              {vote.tally.voted} of {vote.tally.memberCount} members have voted ({vote.tally.turnoutPct}%). You can change your vote until the chairperson or secretary confirms the choice.
            </p>
            <ul className="ci-ballot">
              {vote.tally.rows.map((row) => {
                const isMine = vote.myTitle === row.title;
                return (
                  <li key={row.title} className={isMine ? 'mine' : ''}>
                    <div className="ci-ballot-top">
                      <b>{row.title}</b>
                      <span className="mono">{row.votes} vote{row.votes === 1 ? '' : 's'}</span>
                    </div>
                    <div className="ci-bar" aria-hidden><span style={{ width: `${row.pct}%` }} /></div>
                    <button type="button" className={`mr-btn${isMine ? ' go' : ''}`} disabled={!!busy || isMine} onClick={() => castVote(row.title)}>
                      {busy === row.title ? 'Saving…' : isMine ? 'Your vote' : vote.myTitle ? 'Change my vote to this' : 'Vote for this'}
                    </button>
                  </li>
                );
              })}
            </ul>
            {vote.tally.tie && <p className="ci-note">It is a tie. Talk it through at the meeting, or ask members who have not voted.</p>}
            {vote.canConfirm && (
              <div className="ci-confirm-box">
                <h4>Confirm the group&rsquo;s choice</h4>
                <div className="ci-pick" role="radiogroup" aria-label="The idea to confirm">
                  {vote.tally.rows.map((row) => (
                    <label key={row.title} className={pick === row.title ? 'on' : ''}>
                      <input type="radio" name="confirm" checked={pick === row.title} onChange={() => setPick(row.title)} />
                      {row.title} <span className="mr-meta">({row.votes})</span>
                    </label>
                  ))}
                </div>
                <p className="mr-meta" style={{ margin: '8px 0' }}>{confirmNote(vote.tally, pick)}</p>
                <button type="button" className="mr-btn go" disabled={!!busy || !pick} onClick={confirmChoice}>
                  {busy === 'confirm' ? 'Confirming…' : `Confirm ${pick} as our business`}
                </button>
              </div>
            )}
            {vote.canClose && !askClose && (
              <button type="button" className="ci-linkbtn" onClick={() => setAskClose(true)}>Close this vote without choosing</button>
            )}
            {askClose && (
              <div className="ci-ask" role="alertdialog" aria-labelledby="close-q">
                <p id="close-q"><b>Close this vote without choosing?</b> Members can no longer vote on it. {vote.tally.voted === 0 ? 'Nobody has voted yet' : vote.tally.voted === 1 ? 'The 1 vote cast stays in the record' : `The ${vote.tally.voted} votes cast stay in the record`}, and you can open a new vote any time.</p>
                <div className="ci-actions">
                  <button type="button" className="mr-btn go" disabled={busy === 'close'} onClick={closeVote}>{busy === 'close' ? 'Closing…' : 'Yes, close it'}</button>
                  <button type="button" className="mr-btn" onClick={() => setAskClose(false)}>Keep it open</button>
                </div>
              </div>
            )}
            {voteError && <p className="ci-err" role="alert">{voteError}</p>}
          </div>
        ) : (
          <p className="mr-meta">Three ways forward. Most groups present the ideas first, then choose at the meeting.</p>
        )}
        {openVoteId && !vote && (
          <p className="ci-note">Your group has a vote open. <a href={`/match/compare?vote=${encodeURIComponent(openVoteId)}&group=${encodeURIComponent(groupId ?? '')}`}>Go and vote</a></p>
        )}
        {!vote?.chosenTitle && (
        <div className="ci-paths">
          <div className="ci-path">
            <h3>{vote?.open ? 'Bring in every member' : `Present the ${n} ideas to the group`}</h3>
            <p>{vote?.open ? 'Send the vote to members on WhatsApp so nobody is left out.' : canPresent ? 'Open a vote in Stawi: every member gets an alert, reads the reasons and taps a choice.' : 'Send this page to every member so they read the reasons before the meeting, then decide together.'}</p>
            {canPresent && (!vote || vote.closedNoChoice) && (
              <>
                <button type="button" className="mr-btn go" disabled={!!busy} onClick={openVote}>{busy === 'present' ? 'Opening…' : 'Open a vote in Stawi'}</button>
                {openVoteId && <small className="mr-meta">This replaces the vote that is open now.</small>}
                {voteError && <small className="ci-err" role="alert">{voteError}</small>}
              </>
            )}
            <a className={`mr-btn${canPresent && (!vote || vote.closedNoChoice) ? '' : ' go'}`} href="https://wa.me/" target="_blank" rel="noopener noreferrer" onClick={(e) => { (e.currentTarget as HTMLAnchorElement).href = `https://wa.me/?text=${encodeURIComponent(shareText())}`; }}>
              Send on WhatsApp
            </a>
            <button type="button" className="mr-btn" onClick={copyLink}>{copied ? 'Copied' : 'Copy the message'}</button>
          </div>
          <div className="ci-path">
            <h3>Change an idea</h3>
            <p>Not happy with one of them? Take it off the shortlist and save another, then research again.</p>
            <a className="mr-btn" href={backToIdeas}>Change the shortlist</a>
          </div>
          {!vote && (
          <div className="ci-path">
            <h3>The group has chosen</h3>
            <p>Agreed at a meeting? Pick the idea to confirm it and take the next steps.</p>
            <div className="ci-pick" role="radiogroup" aria-label="The idea the group chose">
              {studies.map((s) => (
                <label key={s.venture.title} className={chosen === s.venture.title ? 'on' : ''}>
                  <input type="radio" name="chosen" value={s.venture.title} checked={chosen === s.venture.title} onChange={() => setChosen(s.venture.title)} />
                  {s.venture.title}
                </label>
              ))}
            </div>
          </div>
          )}
        </div>
        )}
        {choice && (
          <div className="ci-confirm" aria-live="polite">
            <h3 className="display">{vote?.chosenTitle ? 'Next steps' : `${groupName ?? 'The group'} chose ${choice.venture.title}`}</h3>
            {choice.verdict !== 'best' && (
              <p className="mr-meta">Stawi scored {studies[0]!.venture.title} higher. That is fine if the group has good reasons, such as the skills, the place or a buyer already waiting. Write the reasons in the minutes.</p>
            )}
            <ol className="ci-next">
              <li>Record the decision in the meeting minutes, with who proposed and who seconded.</li>
              <li>Do the checks on the ground: {choice.profile.check[0]?.toLowerCase()}.</li>
              <li>Start the papers: {choice.profile.legal[0]?.toLowerCase()}.</li>
              <li>{choice.leftoverCents !== null && choice.leftoverCents < 0 ? `Raise the missing ${kes(-choice.leftoverCents)}: more savings or a loan with a funding proposal.` : 'Keep three months of running costs aside before you spend the rest.'}</li>
              <li>Open its books in Stawi Business from day one, so every member sees if it makes money.</li>
            </ol>
            <div className="ci-actions">
              <a
                className="mr-btn go"
                href={`/proposal?${new URLSearchParams({ ...(groupId ? { group: groupId } : {}), title: choice.venture.title, industry: choice.venture.industry, startup: String(choice.venture.startupCents), margin: String(choice.venture.marginPct), risk: choice.venture.risk, desc: choice.profile.merits.join('. ') })}`}
              >
                Write the funding proposal
              </a>
              <a className="mr-btn" href="/business">Open its business books</a>
              <a
                className="mr-btn"
                target="_blank"
                rel="noopener noreferrer"
                href={`https://wa.me/?text=${encodeURIComponent(`${groupName ?? 'Our group'} has chosen: ${choice.venture.title}. Next: checks on the ground, papers, and opening the books in Stawi.`)}`}
              >
                Tell the group on WhatsApp
              </a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Block({ title, items, tone }: { title: string; items: string[]; tone?: 'good' | 'bad' | 'gold' }) {
  return (
    <div className={`ci-block${tone ? ` ci-${tone}` : ''}`}>
      <h3>{title}</h3>
      <ul>{items.map((t) => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}

const css = `
.ci{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;margin-top:12px}
.ci-kicker{font-size:12.5px;font-weight:700;color:var(--gold-deep);margin:0}
.ci-h1{font-size:clamp(26px,6vw,34px);font-weight:600;margin:4px 0 8px;line-height:1.15;text-wrap:balance}
.ci-h2{font-size:20px;font-weight:600;margin:0 0 6px}
.ci-lead{font-size:16px;color:var(--ink);font-weight:600;margin:0 0 6px;max-width:62ch}
.ci-card{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:16px;min-width:0}
.ci-rank{list-style:none;margin:0;padding:0;display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.ci-best{border:2px solid var(--forest-deep)}
.ci-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.ci-badge{font-size:12.5px;font-weight:800;padding:5px 10px;border-radius:999px}
.ci-score{font-size:26px;font-weight:600;color:var(--forest-deep)}
.ci-score small{font-size:12px;color:var(--dim)}
.ci-bar,.ci-mini{display:block;height:8px;border-radius:99px;background:var(--bone);overflow:hidden;margin:6px 0 10px}
.ci-bar span,.ci-mini span{display:block;height:100%;background:var(--gold);border-radius:99px}
.ci-best .ci-bar span{background:var(--forest-deep)}
.ci-nums{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;margin:0}
.ci-nums dt{font-size:12px;color:var(--dim)}
.ci-nums dd{margin:0;font-size:14px;font-weight:700}
.ci-why{margin:12px 0 0;padding-left:18px;font-size:13.5px;line-height:1.45}
.ci-note{margin:0;padding:10px 12px;border-radius:10px;background:rgba(224,163,46,.12);border:1px solid rgba(224,163,46,.45);font-size:13.5px}
.ci-scroll{overflow-x:auto;margin:0 -4px}
.ci-table{border-collapse:collapse;width:100%;min-width:480px;font-size:13px}
.ci-table th,.ci-table td{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}
.ci-table thead th{font-size:12.5px}
.ci-table th small{color:var(--dim);font-weight:400}
.ci-table td{white-space:nowrap}
.ci-table td .ci-mini{width:44px;display:inline-block;margin:0 6px 0 0;vertical-align:middle}
.ci-lead-cell{font-weight:800;color:var(--forest-deep)}
.ci-total th,.ci-total td{font-weight:800;font-size:15px;border-bottom:none}
.ci-detail summary{cursor:pointer;display:flex;justify-content:space-between;gap:8px;font-weight:700;font-size:16px;list-style:none}
.ci-detail summary::-webkit-details-marker{display:none}
.ci-detail{margin-bottom:10px}
.ci-block{margin-top:12px}
.ci-block h3{font-size:14px;margin:0 0 4px}
.ci-block ul,.ci-risks{margin:0;padding-left:18px;font-size:13.5px;line-height:1.5}
.ci-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0 16px}
.ci-good h3{color:var(--good,#2f855a)}
.ci-bad h3{color:var(--danger)}
.ci-gold{background:rgba(224,163,46,.1);border-radius:10px;padding:10px 12px}
.ci-qs,.ci-next{margin:6px 0 0;padding-left:20px;font-size:14px;line-height:1.55}
.ci-paths{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-top:10px}
.ci-path{border:1px solid var(--line);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px}
.ci-path h3{font-size:15px;margin:0}
.ci-path p{margin:0;font-size:13.5px;color:var(--ink-2)}
.ci-path .mr-btn{text-decoration:none;display:inline-flex;justify-content:center;align-items:center}
.ci-pick{display:grid;gap:6px}
.ci-pick label{display:flex;gap:8px;align-items:center;padding:9px 10px;border:1px solid var(--line);border-radius:10px;font-size:14px;cursor:pointer}
.ci-pick label.on{border-color:var(--forest-deep);background:rgba(31,77,58,.06);font-weight:700}
.ci-confirm{margin-top:14px;border-top:1px solid var(--line);padding-top:14px}
.ci-confirm h3{font-size:19px;margin:0 0 6px}
.ci-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.ci-actions .mr-btn{text-decoration:none;display:inline-flex;align-items:center}
.ci-web h3{font-size:15px;margin:14px 0 4px}
.ci-web p{margin:0 0 6px;font-size:13.5px;line-height:1.5}
.ci-sources{font-size:12.5px;padding-left:18px;word-break:break-word}
.ci-err{color:var(--danger);font-size:13.5px;margin:8px 0 0}
.ci-vote,.ci-chosen{border:2px solid var(--forest-deep);border-radius:14px;padding:14px;margin-top:10px}
.ci-vote h3,.ci-chosen h3{font-size:19px;margin:0 0 4px}
.ci-ballot{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:10px}
.ci-ballot li{border:1px solid var(--line);border-radius:12px;padding:10px 12px}
.ci-ballot li.mine{border-color:var(--forest-deep);background:rgba(31,77,58,.05)}
.ci-ballot-top{display:flex;justify-content:space-between;gap:8px}
.ci-ballot .mr-btn{width:100%;justify-content:center}
.ci-confirm-box{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}
.ci-confirm-box h4{margin:0 0 8px;font-size:15px}
.ci-chosen{background:rgba(31,77,58,.06)}
.ci-linkbtn{margin-top:12px;display:inline-flex;align-items:center;min-height:36px;padding:6px 14px;border-radius:999px;border:1px solid rgba(196,69,47,.25);background:rgba(196,69,47,.07);color:var(--danger);font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;transition:transform .14s ease}.ci-linkbtn:active{transform:scale(.96)}
.ci-ask{margin-top:10px;padding:12px;border-radius:12px;border:1px solid var(--gold);background:rgba(224,163,46,.1);font-size:13.5px}
.ci-ask p{margin:0}
`;
