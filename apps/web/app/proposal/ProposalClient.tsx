'use client';

import { useMemo, useState } from 'react';
import { formatMoney } from '@stawi/core';
import { FeedbackBanner, type Feedback } from '@/components/FeedbackBanner';
import { ReturnBar } from '@/components/ReturnBar';
import { writeProposalAction, type ProposalResult } from './actions';

const INDUSTRIES = [
  ['agri', 'Farming and food'], ['retail', 'Shop and trade'], ['services', 'Services'],
  ['manufacturing', 'Making products'], ['digital', 'Digital and printing'], ['transport', 'Transport'],
] as const;
// Suggestions only (the member types the real name). Uwezo, Women and Youth funds are being merged into a
// Biashara Fund (announced 2025, status still unsettled in 2026), so both names are offered.
const LENDERS = ['Uwezo Fund', 'Women Enterprise Fund', 'Youth Enterprise Development Fund', 'Biashara Fund', 'Hustler Fund (group loan)', 'our SACCO', 'our bank', 'a microfinance institution'];
const toCents = (v: string) => Math.round((parseFloat(v.replace(/,/g, '')) || 0) * 100);
const kes = (c: number) => `KES ${formatMoney(c)}`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type Doc = Extract<ProposalResult, { ok: true }>;

/** A Word-compatible copy of the proposal, built on the phone (opens in Word and Google Docs). */
function wordFile(d: Doc): Blob {
  const body = d.sections.map((s) => `<h2>${esc(s.heading)}</h2>${s.body.map((p) => `<p>${esc(p)}</p>`).join('')}`).join('');
  const others = d.otherSigners.map((o) => `<p>${esc(o.post)}: ${esc(o.name)} &nbsp; Signature: ______________ &nbsp; Date: ________</p>`).join('');
  const html = `<html><head><meta charset="utf-8"><title>${esc(d.title)}</title><style>body{font-family:Georgia,serif;font-size:12pt;line-height:1.5}h1{font-size:18pt}h2{font-size:13pt;margin-top:16pt}</style></head><body>
<p><b>${esc(d.groupName.toUpperCase())}</b>${d.registeredNumber ? `<br>Registration number: ${esc(d.registeredNumber)}` : ''}<br>Date: ${esc(d.date)}</p>
<h1>${esc(d.title)}</h1>${body}
<h2>Signatures</h2><p>Electronically signed by <b>${esc(d.signedBy.name)}</b>, ${esc(d.signedBy.post)}, on ${esc(d.date)}, after confirming the details are true (prepared with Stawi).</p>${others}
</body></html>`;
  return new Blob(['﻿', html], { type: 'application/msword' });
}

export function ProposalClient({ groups, initialGroup, business, fromMatch }: {
  groups: { id: string; name: string; savedCents: number }[];
  initialGroup: string;
  business: { title: string; industry: string; description: string; startupCents: number; marginPct: number; risk: string };
  fromMatch: boolean;
}) {
  const [groupId, setGroupId] = useState(initialGroup);
  const saved = groups.find((g) => g.id === groupId)?.savedCents ?? 0;
  const [biz, setBiz] = useState({ ...business, startup: business.startupCents ? formatMoney(business.startupCents) : '' });
  const startCents = toCents(biz.startup);
  const suggestOwn = useMemo(() => Math.max(0, Math.min(Math.round(saved * 0.8), Math.round(startCents * 0.3))), [saved, startCents]);
  const [own, setOwn] = useState('');
  const [lender, setLender] = useState('');
  const [purpose, setPurpose] = useState(business.title ? `Start a ${business.title.toLowerCase()} business that gives our members a steady income and grows our savings.` : '');
  const [months, setMonths] = useState('12');
  const [rate, setRate] = useState('14');
  const [sales, setSales] = useState('');
  const [security, setSecurity] = useState('The group’s savings and a joint guarantee by all members');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  const ownCents = own ? toCents(own) : suggestOwn;

  async function write(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    const r = await writeProposalAction({
      groupId,
      business: { title: biz.title, industry: biz.industry, description: biz.description, startupCents: startCents, marginPct: Number(biz.marginPct) || 0, risk: biz.risk },
      ownContributionCents: ownCents,
      lender,
      purpose,
      months: Number(months) || 0,
      annualRatePct: Number(rate) || 0,
      expectedMonthlySalesCents: sales ? toCents(sales) : null,
      security,
      confirmTrue: confirm,
    }).catch(() => ({ ok: false, error: 'Nothing was written. Check your connection and try again.' }) as ProposalResult);
    setBusy(false);
    if (!r.ok) { setFeedback({ tone: 'error', title: 'Proposal not written yet', detail: r.error }); return; }
    setDoc(r);
    setFeedback({ tone: 'success', title: 'Your proposal is ready', detail: r.polished ? 'Read it through once, then save it as a PDF or Word file.' : 'Written from your records. Read it through once, then save it as a PDF or Word file.' });
    setTimeout(() => document.getElementById('proposal-doc')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  function downloadWord() {
    if (!doc) return;
    const url = URL.createObjectURL(wordFile(doc));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.groupName.replace(/[^A-Za-z0-9]+/g, '-')}-funding-proposal.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return (
    <>
      <form className="no-print" onSubmit={write}>
        <section className="pf-card">
          <h2>1. The group and the business</h2>
          {groups.length > 1 && (
            <label className="pp-field">Group
              <select className="mr-input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
            </label>
          )}
          <p className="mr-meta">Saved so far, from your records: <strong className="mono">{kes(saved)}</strong></p>
          {fromMatch && <p className="mr-meta">Business chosen in Business Matching. You can still correct it below.</p>}
          <div className="pp-grid">
            <label className="pp-field">Business<input className="mr-input" value={biz.title} onChange={(e) => setBiz({ ...biz, title: e.target.value })} placeholder="e.g. Liquid soap making" required /></label>
            <label className="pp-field">Kind of business
              <select className="mr-input" value={biz.industry} onChange={(e) => setBiz({ ...biz, industry: e.target.value })}>{INDUSTRIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
            <label className="pp-field">Total cost to start (KES)<input className="mr-input mono" inputMode="decimal" value={biz.startup} onChange={(e) => setBiz({ ...biz, startup: e.target.value })} placeholder="300,000" required /></label>
            <label className="pp-field">Expected profit margin (%)<input className="mr-input mono" inputMode="numeric" value={String(biz.marginPct)} onChange={(e) => setBiz({ ...biz, marginPct: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></label>
          </div>
          <label className="pp-field">What the business does<input className="mr-input" value={biz.description} onChange={(e) => setBiz({ ...biz, description: e.target.value })} placeholder="Who buys, where, why it sells" /></label>
        </section>

        <section className="pf-card">
          <h2>2. What you are asking for</h2>
          <div className="pp-grid">
            <label className="pp-field">Group puts in from savings (KES)
              <input className="mr-input mono" inputMode="decimal" value={own} onChange={(e) => setOwn(e.target.value)} placeholder={formatMoney(suggestOwn)} />
            </label>
            <label className="pp-field">Ask from (bank, SACCO or fund)
              <input className="mr-input" list="pp-lenders" value={lender} onChange={(e) => setLender(e.target.value)} placeholder="e.g. Equity Bank, Kenya Women Microfinance" required />
              <datalist id="pp-lenders">{LENDERS.map((l) => <option key={l} value={l} />)}</datalist>
            </label>
            <label className="pp-field">Repay over (months)<input className="mr-input mono" inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value.replace(/\D/g, ''))} /></label>
            <label className="pp-field">Yearly interest the lender quoted (%)<input className="mr-input mono" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} /></label>
            <label className="pp-field">Expected sales a month (KES, if you know)<input className="mr-input mono" inputMode="decimal" value={sales} onChange={(e) => setSales(e.target.value)} placeholder="Leave empty for a careful estimate" /></label>
          </div>
          {startCents > 0 && <p className="pp-sum">Total {kes(startCents)} · group {kes(Math.min(ownCents, startCents))} · loan asked <strong>{kes(Math.max(0, startCents - ownCents))}</strong></p>}
          <label className="pp-field">What the group wants to achieve<textarea className="mr-input" rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} required /></label>
          <label className="pp-field">Security the group offers<input className="mr-input" value={security} onChange={(e) => setSecurity(e.target.value)} /></label>
        </section>

        <section className="pf-card">
          <h2>3. Sign and write</h2>
          <label className="pp-check"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} /> I confirm these details are true. Sign the proposal in my name as an official of the group.</label>
          <button type="submit" className="pp-go" disabled={busy}>{busy ? 'Writing your proposal…' : 'Write the proposal for me'}</button>
        </section>
      </form>

      <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

      {doc && (
        <>
          <div className="mr-actions no-print" style={{ marginTop: 16 }}>
            <button type="button" className="mr-btn go" onClick={() => window.print()}>Save as PDF / Print</button>
            <button type="button" className="mr-btn" onClick={downloadWord}>Download Word file</button>
          </div>
          <article id="proposal-doc" className="pp-doc">
            <header className="pp-letterhead">
              <strong>{doc.groupName.toUpperCase()}</strong>
              {doc.registeredNumber && <span>Registration number: {doc.registeredNumber}</span>}
              <span>Date: {doc.date}</span>
            </header>
            <h1>{doc.title}</h1>
            {doc.sections.map((s) => (
              <section key={s.heading}>
                <h2>{s.heading}</h2>
                {s.body.map((p, i) => <p key={i}>{p}</p>)}
              </section>
            ))}
            <section className="pp-sign">
              <h2>Signatures</h2>
              <p>Electronically signed by <strong>{doc.signedBy.name}</strong>, {doc.signedBy.post}, on {doc.date}, after confirming the details are true (prepared with Stawi).</p>
              {doc.otherSigners.map((o) => (
                <p key={o.post + o.name}>{o.post}: {o.name} &nbsp;&nbsp; Signature: ____________________ &nbsp;&nbsp; Date: __________</p>
              ))}
            </section>
          </article>
          <ReturnBar href="/match" label="Business Matching" />
        </>
      )}
    </>
  );
}
