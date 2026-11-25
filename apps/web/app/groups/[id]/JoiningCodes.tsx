'use client';

import { useState } from 'react';
import { nationalDigits, phoneRule, type CharterMember } from '@stawi/core';

/**
 * "Give a joining code" (owner 20/11/26). No SMS signs anyone in: an official
 * gives a member a one-time code, face to face or on WhatsApp. The member
 * enters their phone number and the code once, then chooses their own PIN.
 * Officials only — the server checks the role again.
 */
export function JoiningCodes({ groupId, members, country }: { groupId: string; members: CharterMember[]; country?: string }) {
  const listed = members.filter((m) => m.fullName.trim() && m.phone.replace(/\D/g, '').length >= 9);
  const [open, setOpen] = useState<Record<string, { code?: string; message?: string; error?: string; busy?: boolean; copied?: boolean }>>({});

  async function give(m: CharterMember) {
    setOpen((o) => ({ ...o, [m.id]: { busy: true } }));
    const res = await fetch(`/api/groups/${groupId}/join-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: m.phone }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setOpen((o) => ({ ...o, [m.id]: res?.ok ? { code: data.code, message: data.message } : { error: data.error ?? 'Could not give a code. Try again.' } }));
  }

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setOpen((o) => ({ ...o, [id]: { ...o[id], copied: true } }));
    } catch {
      /* the message stays on screen to copy by hand */
    }
  }

  const waLink = (phone: string, text: string) =>
    `https://wa.me/${phoneRule(country).dial}${nationalDigits(phone, country)}?text=${encodeURIComponent(text)}`;

  if (listed.length === 0) return null;
  return (
    <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
      <h4 style={{ margin: 0, fontSize: 14.5, color: 'var(--forest-deep)' }}>Joining codes</h4>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '4px 0 10px', maxWidth: 620 }}>
        Members sign in with their phone number and their own 4-digit PIN. The first time, or if they forget their PIN,
        give them a joining code here. It works once, for 48 hours. Save the member list first.
      </p>
      <div style={{ display: 'grid', gap: 8 }}>
        {listed.map((m) => {
          const s = open[m.id];
          return (
            <div key={m.id} style={{ display: 'grid', gap: 6, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--paper)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, flex: '1 1 160px', minWidth: 0 }}>{m.fullName}</span>
                <button type="button" onClick={() => void give(m)} disabled={s?.busy}
                  style={{ padding: '7px 12px', borderRadius: 999, border: '1px solid var(--forest)', background: 'transparent', color: 'var(--forest)', fontWeight: 700, fontSize: 13, cursor: s?.busy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                  {s?.busy ? 'Giving…' : s?.code ? 'Give a new code' : 'Give a joining code'}
                </button>
              </div>
              {s?.error && <span style={{ color: 'var(--danger)', fontSize: 13 }}>{s.error}</span>}
              {s?.code && s.message && (
                <div style={{ display: 'grid', gap: 6 }}>
                  <span className="mono" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.25em', color: 'var(--forest-deep)' }}>{s.code}</span>
                  <textarea readOnly value={s.message} onFocus={(e) => e.currentTarget.select()} rows={3}
                    style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, padding: 8, borderRadius: 8, border: '1px solid var(--line)', fontFamily: 'inherit', resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <a href={waLink(m.phone, s.message)} target="_blank" rel="noopener noreferrer" className="share-btn primary">💬 Send on WhatsApp</a>
                    <button type="button" className="share-btn" onClick={() => void copy(m.id, s.message!)}>{s.copied ? '✓ Copied' : '🔗 Copy message'}</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
