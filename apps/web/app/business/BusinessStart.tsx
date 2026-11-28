'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ValueLang } from '@stawi/core';
import { createGroupAction } from '@/app/actions';
import { storedLang, track } from '@/components/track';

const T = {
  name: { en: 'Name of your business', sw: 'Jina la biashara yako' },
  eg: { en: 'e.g. Mama Njeri Butchery', sw: 'mf. Bucha ya Mama Njeri' },
  go: { en: 'Open my business books', sw: 'Fungua hesabu za biashara yangu' },
  busy: { en: 'Opening…', sw: 'Inafungua…' },
  free: { en: 'First month free. No group needed.', sw: 'Mwezi wa kwanza ni bure. Huhitaji kikundi.' },
  fail: { en: 'Could not open it. Please try again.', sw: 'Haikufunguka. Tafadhali jaribu tena.' },
} as const;

/** One field and one button: a business opens its books without a group (owner 28/11/26). */
export function BusinessStart() {
  const router = useRouter();
  const [lang, setLang] = useState<ValueLang>('en');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  useEffect(() => { setLang(storedLang()); }, []);

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true); setErr(undefined);
    track('cta', 'start-business-tab');
    const r = await createGroupAction({ name, start: 'books_only' }).catch(() => ({ ok: false as const, groupId: undefined, error: undefined }));
    setBusy(false);
    if (r.ok && r.groupId) router.push(`/business?group=${encodeURIComponent(r.groupId)}`);
    else setErr(r.error ?? T.fail[lang]);
  }

  return (
    <form className="biz-start" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <label>
        <span>{T.name[lang]}</span>
        <input value={name} placeholder={T.eg[lang]} maxLength={80} onChange={(e) => setName(e.target.value)} />
      </label>
      <button type="submit" disabled={busy || !name.trim()}>{busy ? T.busy[lang] : T.go[lang]}</button>
      <small>{T.free[lang]}</small>
      {err && <p role="alert">{err}</p>}
    </form>
  );
}
