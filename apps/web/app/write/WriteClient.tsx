'use client';

import { useState } from 'react';
import { FORMAL_KINDS, type FormalKind } from '@stawi/core';
import { FeedbackBanner, type Feedback } from '@/components/FeedbackBanner';
import { ReturnBar } from '@/components/ReturnBar';
import { DictateBox } from '@/components/DictateBox';

/** Shrink a photo to at most 1600 px on its long side (JPEG), so it uploads fast on any phone. */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('bad image'));
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Read the photo on the phone (English + Kiswahili), when the AI is off. */
async function readOnPhone(dataUrl: string): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(['eng', 'swa'], 1, { workerPath: '/ocr/worker.min.js', corePath: '/ocr', langPath: '/ocr/lang' });
  try {
    const { data } = await worker.recognize(dataUrl);
    return (data.text ?? '').trim();
  } finally {
    await worker.terminate();
  }
}

type Step = 'choose' | 'working' | 'done';

export function WriteClient({ groups, groupId, initialKind, aiOn }: { groups: { id: string; name: string }[]; groupId: string | null; initialKind: string | null; aiOn: boolean }) {
  const [kind, setKind] = useState<FormalKind>(FORMAL_KINDS.some((k) => k.id === initialKind) ? (initialKind as FormalKind) : 'letter');
  const [group, setGroup] = useState(groupId ?? '');
  const [notes, setNotes] = useState('');
  const [doc, setDoc] = useState('');
  const [step, setStep] = useState<Step>('choose');
  const [status, setStatus] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function send(payload: { image?: string; text?: string }): Promise<{ ok?: boolean; doc?: string; needText?: boolean; error?: string; by?: string }> {
    const res = await fetch('/api/write', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, groupId: group || null, ...payload }) }).catch(() => null);
    return res ? await res.json().catch(() => ({ error: 'Something went wrong. Try again.' })) : { error: 'No connection. Try again.' };
  }

  function finish(r: { ok?: boolean; doc?: string; error?: string; by?: string }) {
    if (!r.ok || !r.doc) {
      setStep('choose');
      setFeedback({ tone: 'error', title: 'Not written yet', detail: r.error ?? 'Try again.' });
      return;
    }
    setDoc(r.doc);
    setStep('done');
    setFeedback({ tone: 'success', title: 'Your document is ready', detail: r.by === 'ai' ? 'Read it through and correct anything before you print or share it.' : 'Your words are in a formal layout. Fill in the blank lines (_____) and check it before you print or share it.' });
  }

  async function fromPhoto(file: File | undefined) {
    if (!file) return;
    setFeedback(null);
    setStep('working');
    try {
      setStatus('Getting the photo ready…');
      const image = await shrink(file);
      setStatus(aiOn ? 'Reading your handwriting and writing the document…' : 'Reading the photo on your phone…');
      let r = await send({ image });
      if (r.ok && r.needText) {
        const text = await readOnPhone(image);
        setNotes(text);
        setStatus('Writing the document…');
        r = await send({ text });
      }
      finish(r);
    } catch {
      setStep('choose');
      setFeedback({ tone: 'error', title: 'The photo could not be read', detail: 'Take it again in good light, flat and close, or type your points below.' });
    }
  }

  async function fromWords() {
    setFeedback(null);
    setStep('working');
    setStatus('Writing the document…');
    finish(await send({ text: notes }));
  }

  async function copy() {
    try { await navigator.clipboard.writeText(doc); setFeedback({ tone: 'success', title: 'Copied', detail: 'Paste it in WhatsApp, an email or a message.' }); }
    catch { setFeedback({ tone: 'info', title: 'Select the text', detail: 'Press and hold on the document, choose Select all, then Copy.' }); }
  }

  return (
    <>
      <section className="pf-card no-print" aria-labelledby="wr-kind">
        <h2 id="wr-kind">1. What do you need?</h2>
        <div className="wr-kinds" role="radiogroup" aria-label="Kind of document">
          {FORMAL_KINDS.map((k) => (
            <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} className={`wr-kind${kind === k.id ? ' on' : ''}`} onClick={() => setKind(k.id)}>
              <strong>{k.title}</strong>
              <small>{k.hint}</small>
            </button>
          ))}
        </div>
        {groups.length > 0 && (
          <label className="mr-meta" style={{ display: 'grid', gap: 4, maxWidth: 360 }}>
            For which group
            <select className="mr-input" value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">Just me</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
        )}
      </section>

      <section className="pf-card no-print" aria-labelledby="wr-in">
        <h2 id="wr-in">2. Give Stawi your points</h2>
        <div className="wr-actions">
          <label className={`wr-photo${step === 'working' ? ' busy' : ''}`}>
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M4 7h3l2-2.5h6L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="12.5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
            <span>Take a photo of my notes</span>
            <input type="file" accept="image/*" capture="environment" hidden disabled={step === 'working'} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void fromPhoto(f); }} />
          </label>
          <label className="wr-pick">
            or choose a photo
            <input type="file" accept="image/*" hidden disabled={step === 'working'} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void fromPhoto(f); }} />
          </label>
        </div>
        <details className="wr-type" open>
          <summary>Or speak it, or type it (Kiswahili or English)</summary>
          <DictateBox value={notes} onChange={setNotes} rows={5} placeholder="e.g. meeting saturday 2pm chief camp, everybody bring 500, we discuss buying tents" />
          <button type="button" className="mr-btn go" disabled={step === 'working' || notes.trim().length < 3} onClick={() => void fromWords()}>Write it for me</button>
        </details>
        {step === 'working' && <p className="wr-status" role="status"><span className="wr-dot" aria-hidden />{status}</p>}
        <p className="mr-meta">
          {aiOn
            ? 'Your photo is read by Claude AI (Anthropic) only to write this document; Stawi does not keep the photo.'
            : 'Your photo is read on your phone and never leaves it.'}
        </p>
      </section>

      <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

      {step === 'done' && (
        <section className="pf-card" aria-labelledby="wr-out">
          <h2 id="wr-out" className="no-print">3. Check it, then keep or share it</h2>
          <textarea className="mr-input wr-doc no-print" rows={18} value={doc} onChange={(e) => setDoc(e.target.value)} aria-label="Your document (you can correct it)" />
          <pre className="wr-print" aria-hidden>{doc}</pre>
          <div className="mr-actions no-print">
            <button type="button" className="mr-btn go" onClick={() => window.print()}>Save as PDF / Print</button>
            <button type="button" className="mr-btn" onClick={() => void copy()}>Copy</button>
            <a className="mr-btn" href={`https://wa.me/?text=${encodeURIComponent(doc.slice(0, 3500))}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
            <button type="button" className="mr-btn" onClick={() => { setStep('choose'); setDoc(''); }}>Write another</button>
          </div>
          <ReturnBar href={group ? `/groups/${encodeURIComponent(group)}` : '/dashboard'} label={group ? 'my group' : 'home'} />
        </section>
      )}
    </>
  );
}
