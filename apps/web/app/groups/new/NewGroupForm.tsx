'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { START_CHOICES, startChoice, type StartChoiceId, type ValueLang } from '@stawi/core';
import { createGroupAction } from '@/app/actions';
import { storedLang, track } from '@/components/track';
import { Pic } from '@/components/Pictures';

/**
 * Start a group or a business (owner 20/11/26): pick what you came for, give
 * it a name, and only those sections open. A business needs no group.
 */

const T = {
  what: { en: 'What do you want to use?', sw: 'Unataka kutumia nini?' },
  groupName: { en: 'Name of the group', sw: 'Jina la kikundi' },
  bizName: { en: 'Name of the business', sw: 'Jina la biashara' },
  groupEg: { en: 'e.g. Umoja Women Group', sw: 'mf. Kikundi cha Umoja' },
  bizEg: { en: 'e.g. Mama Njeri Butchery', sw: 'mf. Bucha ya Mama Njeri' },
  go: { en: 'Open it', sw: 'Fungua' },
  busy: { en: 'Opening…', sw: 'Inafungua…' },
  later: { en: 'You can switch sections on or off later.', sw: 'Unaweza kuwasha au kuzima sehemu baadaye.' },
  fail: { en: 'Could not open it. Please try again.', sw: 'Haikufunguka. Tafadhali jaribu tena.' },
} as const;

export function NewGroupForm({ initialStart }: { initialStart?: string }) {
  const router = useRouter();
  const [lang, setLang] = useState<ValueLang>('en');
  const [name, setName] = useState('');
  const [start, setStart] = useState<StartChoiceId>(startChoice(initialStart).id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  useEffect(() => { setLang(storedLang()); }, []);

  const choice = startChoice(start);
  const business = choice.type === 'BUSINESS';

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true); setErr(undefined);
    track('cta', `start-${start.replace(/_/g, '-')}`);
    const r = await createGroupAction({ name, start });
    setBusy(false);
    if (r.ok && r.groupId) router.push(r.booksOnly ? `/business?group=${encodeURIComponent(r.groupId)}` : `/groups/${r.groupId}`);
    else setErr(r.error ?? T.fail[lang]);
  }

  return (
    <div className="start">
      <p className="start-label">{T.what[lang]}</p>
      <div className="start-list" role="radiogroup" aria-label={T.what[lang]}>
        {START_CHOICES.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={start === c.id} className={`start-card s-card pillar-${c.type === 'BUSINESS' ? 3 : 1}`} onClick={() => setStart(c.id)}>
            <span className="start-icon" aria-hidden><Pic icon={c.icon} size={38} /></span>
            <span className="start-name">{c.name[lang]}</span>
            <span className="start-about">{c.about[lang]}</span>
          </button>
        ))}
      </div>
      <label className="pay-field">
        <span>{business ? T.bizName[lang] : T.groupName[lang]}</span>
        <input style={{ fontFamily: 'inherit' }} value={name} placeholder={business ? T.bizEg[lang] : T.groupEg[lang]} maxLength={80}
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} />
      </label>
      <button type="button" className="pay-go" onClick={submit} disabled={busy || !name.trim()}>{busy ? T.busy[lang] : T.go[lang]}</button>
      <p className="pay-hint">{T.later[lang]}</p>
      {err && <p className="pay-note bad" role="alert">{err}</p>}
    </div>
  );
}
