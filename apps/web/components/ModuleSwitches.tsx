'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MODULES, resolveModules, type GroupModules, type ModuleId, type ValueLang } from '@stawi/core';
import { saveModulesAction } from '@/app/actions';
import { storedLang, track } from './track';

/**
 * "Choose what you use" — big on/off switches, one per section (owner
 * 20/11/26). Officials only. Each switch says in plain words what turning it
 * off does; nothing already written is ever deleted.
 */

const T = {
  title: { en: 'Choose what you use', sw: 'Chagueni mnachotumia' },
  sub: { en: 'Switch a section off and it is hidden for everyone in the group. Nothing you wrote is deleted; switch it on again any time.', sw: 'Zima sehemu na itafichwa kwa kila mtu kwenye kikundi. Hakuna mlichoandika kinachofutwa; iwashe tena wakati wowote.' },
  on: { en: 'On', sw: 'Imewashwa' },
  off: { en: 'Off', sw: 'Imezimwa' },
  needs: { en: 'Needs', sw: 'Inahitaji' },
  saved: { en: 'Saved', sw: 'Imehifadhiwa' },
  failed: { en: 'Could not save. Please try again.', sw: 'Haikuhifadhiwa. Tafadhali jaribu tena.' },
} as const;

export function ModuleSwitches({ groupId, modules, offered }: { groupId: string; modules: GroupModules; offered: ModuleId[] }) {
  const router = useRouter();
  const [lang, setLang] = useState<ValueLang>('en');
  const [state, setState] = useState<GroupModules>(modules);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => { setLang(storedLang()); }, []);
  useEffect(() => { setState(modules); }, [modules]);

  const savingsCredit = offered.includes('savings_credit');
  const list = MODULES.filter((m) => offered.includes(m.id));

  function flip(id: ModuleId) {
    const next = resolveModules({ ...state, [id]: !state[id] }, { savingsCredit });
    const before = state;
    setState(next);
    setNote(null);
    track('sort', `use-${id.replace(/_/g, '-')}-${next[id] ? 'on' : 'off'}`);
    start(async () => {
      const r = await saveModulesAction({ groupId, modules: next });
      if (r.ok) {
        setNote({ ok: true, text: T.saved[lang] });
        router.refresh();
      } else {
        setState(before);
        setNote({ ok: false, text: r.error ?? T.failed[lang] });
      }
    });
  }

  return (
    <details className="use s-card" id="choose">
      <summary>
        <span className="use-icon" aria-hidden>🎛️</span>
        <span>
          <span className="use-title">{T.title[lang]}</span>
          <span className="use-sub">{list.filter((m) => state[m.id]).length} / {list.length} {T.on[lang].toLowerCase()}</span>
        </span>
        <span className="vb-chev" aria-hidden>▾</span>
      </summary>
      <div className="use-body">
        <p className="use-about">{T.sub[lang]}</p>
        <ul className="use-list">
          {list.map((m) => {
            const on = state[m.id];
            const blocked = !!m.needs && !state[m.needs];
            return (
              <li key={m.id} className={`use-row pillar-${m.pillar} ${on ? 'on' : 'off'}`}>
                <span className="use-emoji" aria-hidden>{m.icon}</span>
                <div>
                  <p className="use-name">{m.name[lang]}</p>
                  <p className="use-what">{on ? m.on[lang] : m.off[lang]}</p>
                  {blocked && <p className="use-needs">{T.needs[lang]}: {MODULES.find((x) => x.id === m.needs)?.name[lang]}</p>}
                </div>
                <button type="button" role="switch" aria-checked={on} aria-label={m.name[lang]} className="use-switch" disabled={pending || blocked} onClick={() => flip(m.id)}>
                  <span className="knob" />
                  <span className="lbl">{on ? T.on[lang] : T.off[lang]}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {note && <p className={`pay-note ${note.ok ? 'ok' : 'bad'}`} role="status">{note.text}</p>}
      </div>
    </details>
  );
}
