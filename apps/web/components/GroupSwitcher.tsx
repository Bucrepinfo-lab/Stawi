'use client';

import { useEffect, useRef, useState } from 'react';
import type { GroupAccount } from '@/lib/groups';

interface Props {
  groups: GroupAccount[];
  activeId: string;
  onSwitch: (id: string) => void;
}

/**
 * "Switch chama" (owner 26/11/26): one phone number and one PIN open every
 * chama a person belongs to. The button is always there — with one group it
 * still offers "Join another chama" and "Start a new group" — and the list
 * shows each group with the person's role, so switching is one tap.
 */
export function GroupSwitcher({ groups, activeId, onSwitch }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = groups.find((g) => g.id === activeId) ?? groups[0];

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!active) return null;
  const many = groups.length > 1;

  return (
    <div ref={ref} className="sw">
      <button type="button" className="sw-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <span className="sw-flag" aria-hidden>{active.flag}</span>
        <span className="sw-now">
          <strong>{active.name}</strong>
          <small>You are {active.myRole}{many ? ` · ${groups.length} chamas` : ''}</small>
        </span>
        <span className="sw-cta">{many ? 'Switch chama' : 'My chamas'} <span aria-hidden className={open ? 'up' : ''}>▾</span></span>
      </button>

      {open && (
        <div className="sw-menu" role="menu" aria-label="My chamas">
          <p className="sw-head">Your phone number opens all of these</p>
          {groups.map((g) => {
            const isActive = g.id === active.id;
            return (
              <button
                key={g.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                className={`sw-item${isActive ? ' on' : ''}`}
                onClick={() => {
                  onSwitch(g.id);
                  setOpen(false);
                }}
              >
                <span className="sw-flag" aria-hidden>{g.flag}</span>
                <span className="sw-now">
                  <strong>{g.name}</strong>
                  <small>{g.type} · {g.myRole}</small>
                </span>
                {isActive ? <span className="sw-tick">Open now</span> : <span className="sw-go">Open</span>}
              </button>
            );
          })}
          <div className="sw-foot">
            <a href="/profile#join" role="menuitem" className="soft-pill wide">Join another chama (with a joining code)</a>
            <a href="/groups/new" role="menuitem" className="soft-pill wide">Start a new group</a>
          </div>
        </div>
      )}
    </div>
  );
}
