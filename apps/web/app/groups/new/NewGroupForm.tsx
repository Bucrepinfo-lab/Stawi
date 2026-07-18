'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGroupAction } from '@/app/actions';

const input: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--line)', background: '#fff', fontFamily: 'inherit', fontSize: 15, color: 'var(--ink)', boxSizing: 'border-box' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 6 };

const TYPES: { v: 'CHAMA' | 'SELF_HELP_GROUP' | 'SACCO' | 'BUSINESS'; label: string }[] = [
  { v: 'CHAMA', label: 'Chama' },
  { v: 'SELF_HELP_GROUP', label: 'Self-Help Group' },
  { v: 'SACCO', label: 'SACCO' },
  { v: 'BUSINESS', label: 'Business' },
];

export function NewGroupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number]['v']>('CHAMA');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  async function submit() {
    setBusy(true); setErr(undefined);
    const r = await createGroupAction({ name, type });
    setBusy(false);
    if (r.ok && r.groupId) router.push(`/groups/${r.groupId}`);
    else setErr(r.error ?? 'Could not create the group.');
  }

  return (
    <div style={{ marginTop: 26, display: 'grid', gap: 18 }}>
      <div>
        <label style={lbl}>Group name</label>
        <input style={input} value={name} autoFocus placeholder="e.g. Umoja Women Group" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) submit(); }} />
      </div>
      <div>
        <label style={lbl}>Type</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TYPES.map((t) => (
            <button key={t.v} onClick={() => setType(t.v)} style={{ padding: '9px 15px', borderRadius: 999, border: `1px solid ${type === t.v ? 'var(--forest)' : 'var(--line)'}`, background: type === t.v ? 'var(--forest)' : '#fff', color: type === t.v ? '#fff' : 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{t.label}</button>
          ))}
        </div>
      </div>
      <button onClick={submit} disabled={busy || !name.trim()} style={{ padding: '13px 22px', borderRadius: 12, border: 'none', background: name.trim() ? 'var(--gold)' : 'var(--bone-2)', color: 'var(--forest-deep)', fontWeight: 700, fontSize: 15, cursor: name.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
        {busy ? 'Creating…' : 'Create group & open workspace →'}
      </button>
      {err && <p style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 13.5 }}>{err}</p>}
    </div>
  );
}
