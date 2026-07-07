'use client';

import { useEffect, useRef, useState } from 'react';
import type { GroupAccount } from '@/lib/groups';

interface Props {
  groups: GroupAccount[];
  activeId: string;
  onSwitch: (id: string) => void;
}

/**
 * Toggleable group account switcher.
 * - With a single group it renders a static badge (nothing to switch).
 * - With multiple groups it renders a button that toggles a dropdown; selecting
 *   a group opens that group's UI account.
 */
export function GroupSwitcher({ groups, activeId, onSwitch }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = groups.find((g) => g.id === activeId) ?? groups[0];

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (!active) return null;

  // Single group → no switcher needed.
  if (groups.length <= 1) {
    return (
      <div style={badge}>
        <span style={{ fontSize: 16 }}>{active.flag}</span>
        <span style={{ fontWeight: 600 }}>{active.name}</span>
        <span style={roleChip}>{active.myRole}</span>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 14px',
          borderRadius: 12,
          border: '1px solid var(--line)',
          background: 'var(--paper)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          boxShadow: 'var(--shadow)',
        }}
      >
        <span style={{ fontSize: 16 }}>{active.flag}</span>
        <span style={{ textAlign: 'left', lineHeight: 1.15 }}>
          <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{active.name}</span>
          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--dim)' }}>
            {active.type} · you are {active.myRole}
          </span>
        </span>
        <span style={{ marginLeft: 4, color: 'var(--dim)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            minWidth: 260,
            zIndex: 40,
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            boxShadow: 'var(--shadow)',
            padding: 6,
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--faint)', padding: '6px 10px' }}>
            Switch group account
          </div>
          {groups.map((g) => {
            const isActive = g.id === active.id;
            return (
              <button
                key={g.id}
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onSwitch(g.id);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 10px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: isActive ? 'var(--bone-2)' : 'transparent',
                }}
              >
                <span style={{ fontSize: 16 }}>{g.flag}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{g.name}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--dim)' }}>{g.type} · {g.myRole}</span>
                </span>
                {isActive && <span style={{ color: 'var(--forest)', fontWeight: 700 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const badge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 9,
  padding: '9px 14px',
  borderRadius: 12,
  border: '1px solid var(--line)',
  background: 'var(--paper)',
  fontSize: 14,
  color: 'var(--ink)',
  boxShadow: 'var(--shadow)',
};
const roleChip: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--gold-deep)',
  background: 'rgba(224,163,46,.16)',
  padding: '2px 8px',
  borderRadius: 7,
};
