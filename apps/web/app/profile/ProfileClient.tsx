'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FeedbackBanner, type Feedback } from '@/components/FeedbackBanner';
import { PinNotMpesa } from '@/components/PinNotMpesa';
import { changeMyPhoneAction, changeMyPinAction, removeMyPhotoAction, saveMyEmailAction, saveMyNameAction, saveMyPhotoAction } from './actions';
import { hideEmail } from '@stawi/core';

const initials = (n: string) => n.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '·';

/** Shrink a picked photo on the phone to a 256 px square JPEG (a few dozen KB). */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('bad image'));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** "+254712345678" → "07•• ••• 678", so someone looking at the screen cannot read it (tester 27/11/26). */
function hidePhone(phone: string | null): string {
  const d = (phone ?? '').replace(/\D/g, '');
  if (d.length < 6) return phone ?? '—';
  const local = d.startsWith('254') ? `0${d.slice(3)}` : d;
  return `${local.slice(0, 2)}•• ••• ${local.slice(-3)}`;
}

export function ProfileClient({ initial }: { initial: { name: string; phone: string | null; photo: string | null; email: string | null } }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState(initial.name === 'Group founder' ? '' : initial.name);
  const [phone, setPhone] = useState('');
  const [phonePin, setPhonePin] = useState('');
  const [pins, setPins] = useState({ current: '', next: '', repeat: '' });
  const [open, setOpen] = useState<'phone' | 'pin' | null>(null);
  const [showPhone, setShowPhone] = useState(false);
  const [email, setEmail] = useState(initial.email ?? '');
  const [showEmail, setShowEmail] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const four = (v: string) => v.replace(/\D/g, '').slice(0, 4);

  async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, after?: () => void) {
    if (busy) return;
    setBusy(key);
    const res = await fn().catch(() => ({ ok: false, error: 'Nothing was saved. Check your connection and try again.' } as { ok: boolean; error?: string; message?: string }));
    setBusy(null);
    if (!res.ok) { setFeedback({ tone: 'error', title: 'Not saved', detail: res.error }); return; }
    setFeedback({ tone: 'success', title: 'Saved', detail: res.message });
    after?.();
    router.refresh();
  }

  return (
    <>
      <section className="pf-head">
        <button type="button" className="pf-photo" onClick={() => fileRef.current?.click()} aria-label="Change my photo">
          {initial.photo ? <img src={initial.photo} alt="" /> : <span>{initials(initial.name)}</span>}
          <em>Change</em>
        </button>
        <div>
          <h1 className="display" style={{ fontWeight: 600, fontSize: 30, margin: 0 }}>{initial.name && initial.name !== 'Group founder' ? initial.name : 'Add your name'}</h1>
          <p className="mr-meta" style={{ marginTop: 4 }}>Signs in with <span className="mono">{showPhone ? (initial.phone ?? '—') : hidePhone(initial.phone)}</span>{' '}
            {initial.phone && (
              <button type="button" className="pf-link" style={{ color: 'var(--forest)' }} onClick={() => setShowPhone((v) => !v)} aria-pressed={showPhone}>
                {showPhone ? 'Hide' : 'Show'}
              </button>
            )}</p>
          {initial.photo && (
            <button type="button" className="pf-link" disabled={!!busy} onClick={() => run('rm', () => removeMyPhotoAction())}>Remove photo</button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              const data = await shrink(f);
              await run('photo', () => saveMyPhotoAction(data));
            } catch {
              setFeedback({ tone: 'error', title: 'Photo not saved', detail: 'That file could not be read as a photo. Try another one.' });
            }
          }}
        />
      </section>

      <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

      <section className="pf-card" aria-labelledby="pf-name">
        <h2 id="pf-name">My name</h2>
        <p className="mr-meta">The name every group shows on its roster, receipts and messages.</p>
        <form className="pf-row" onSubmit={(e) => { e.preventDefault(); void run('name', () => saveMyNameAction(name)); }}>
          <input className="mr-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" placeholder="e.g. Fredrick Gathii" required />
          <button type="submit" className="mr-btn go" disabled={busy === 'name'}>{busy === 'name' ? 'Saving…' : 'Save my name'}</button>
        </form>
      </section>

      <section className="pf-card" aria-labelledby="pf-email">
        <h2 id="pf-email">My email <span className="mr-meta" style={{ fontWeight: 400 }}>(optional)</span></h2>
        <p className="mr-meta">
          For receipts, statements and replies. You never sign in with it.{' '}
          {initial.email ? (
            <>Saved: <span className="mono">{showEmail ? initial.email : hideEmail(initial.email)}</span>{' '}
              <button type="button" className="pf-link" style={{ color: 'var(--forest)' }} onClick={() => setShowEmail((v) => !v)} aria-pressed={showEmail}>{showEmail ? 'Hide' : 'Show'}</button></>
          ) : null}
        </p>
        <form className="pf-row" onSubmit={(e) => { e.preventDefault(); void run('email', () => saveMyEmailAction(email)); }}>
          <input className="mr-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" inputMode="email" placeholder="name@gmail.com" />
          <button type="submit" className="mr-btn go" disabled={busy === 'email'}>{busy === 'email' ? 'Saving…' : email ? 'Save my email' : 'Remove my email'}</button>
        </form>
      </section>

      <section className="pf-card" aria-labelledby="pf-phone">
        <h2 id="pf-phone">My phone number</h2>
        <p className="mr-meta">You sign in to Stawi with it. M-Pesa payment prompts for your contributions also come to this number.</p>
        {open !== 'phone' ? (
          <button type="button" className="mr-btn" onClick={() => setOpen('phone')}>Change my number</button>
        ) : (
          <form className="pf-stack" onSubmit={(e) => { e.preventDefault(); void run('phone', () => changeMyPhoneAction({ phone, pin: phonePin }), () => { setOpen(null); setPhone(''); setPhonePin(''); }); }}>
            <label><span className="mr-meta">New phone number</span>
              <input className="mr-input mono" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" required /></label>
            <label><span className="mr-meta">Your current Stawi PIN</span>
              <input className="mr-input mr-pin mono" type="password" inputMode="numeric" autoComplete="current-password" value={phonePin} onChange={(e) => setPhonePin(four(e.target.value))} required /></label>
            <div className="mr-actions">
              <button type="button" className="mr-btn" onClick={() => setOpen(null)}>Cancel</button>
              <button type="submit" className="mr-btn go" disabled={busy === 'phone' || phonePin.length !== 4}>{busy === 'phone' ? 'Changing…' : 'Change my number'}</button>
            </div>
          </form>
        )}
      </section>

      <section className="pf-card" aria-labelledby="pf-pin">
        <h2 id="pf-pin">My Stawi sign-in PIN</h2>
        <PinNotMpesa />
        {open !== 'pin' ? (
          <button type="button" className="mr-btn" onClick={() => setOpen('pin')}>Change my Stawi PIN</button>
        ) : (
          <form className="pf-stack" onSubmit={(e) => { e.preventDefault(); void run('pin', () => changeMyPinAction(pins), () => { setOpen(null); setPins({ current: '', next: '', repeat: '' }); }); }}>
            {(['current', 'next', 'repeat'] as const).map((k) => (
              <label key={k}><span className="mr-meta">{k === 'current' ? 'Current Stawi PIN' : k === 'next' ? 'New 4-digit Stawi PIN' : 'New Stawi PIN again'}</span>
                <input className="mr-input mr-pin mono" type="password" inputMode="numeric" autoComplete={k === 'current' ? 'current-password' : 'new-password'} value={pins[k]} onChange={(e) => setPins({ ...pins, [k]: four(e.target.value) })} required /></label>
            ))}
            <div className="mr-actions">
              <button type="button" className="mr-btn" onClick={() => setOpen(null)}>Cancel</button>
              <button type="submit" className="mr-btn go" disabled={busy === 'pin'}>{busy === 'pin' ? 'Changing…' : 'Change my Stawi PIN'}</button>
            </div>
          </form>
        )}
        <p className="mr-meta" style={{ marginTop: 8 }}>Forgot your Stawi PIN? A group official gives you a new joining code, in person or on WhatsApp.</p>
      </section>
    </>
  );
}
