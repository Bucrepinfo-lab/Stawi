'use client';

import { useMemo, useState } from 'react';
import {
  addMember,
  removeMember,
  charterCompleteness,
  emptyMeeting,
  addAgenda,
  meetingCompleteness,
  attendanceTally,
  tableBankingSummary,
  paraphraseMinutes,
  reconcileMonth,
  formatKes,
  OFFICIAL_DESIGNATIONS,
  WEEK_DAYS,
  type GroupCharter,
  type CharterMember,
  type OfficialDesignation,
  type Meeting,
  type AttendanceStatus,
  type AgendaItem,
  type ProfessionalMinutes,
  type MonthEndStatement,
} from '@stawi/core';
import {
  saveCharterAction,
  saveMeetingAction,
  postMeetingAction,
  saveStatementAction,
} from '@/app/actions';
import type { Cockpit } from '@/lib/cockpit';

type Tab = 'charter' | 'minutes' | 'documents' | 'statement';

const card: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 22, boxShadow: 'var(--shadow)' };
const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 6 };
const input: React.CSSProperties = { width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--line)', background: '#fff', fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)', boxSizing: 'border-box' };
const btn: React.CSSProperties = { padding: '11px 20px', borderRadius: 11, border: 'none', background: 'var(--forest-deep)', color: 'var(--bone)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' };
const btnGold: React.CSSProperties = { ...btn, background: 'var(--gold)', color: 'var(--forest-deep)' };
const btnGhost: React.CSSProperties = { ...btn, background: 'transparent', color: 'var(--forest-deep)', border: '1px solid var(--line)' };

function toCents(v: string): number { const n = parseFloat((v || '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : Math.round(n * 100); }
function fromCents(c: number): string { return c ? String(Math.round(c) / 100) : ''; }

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 9, borderRadius: 9, background: 'var(--bone-2)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,var(--gold),var(--forest))', transition: 'width .4s ease' }} />
    </div>
  );
}

function Hint({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div style={{ marginTop: 12, display: 'flex', gap: 9, alignItems: 'flex-start', background: 'rgba(224,163,46,.12)', border: '1px solid rgba(224,163,46,.35)', borderRadius: 10, padding: '10px 13px' }}>
      <span aria-hidden style={{ fontSize: 15 }}>👉</span>
      <span style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600 }}>Next: {text}</span>
    </div>
  );
}

export function GroupCockpit({ cockpit, canEdit }: { cockpit: Cockpit; canEdit: boolean }) {
  const [tab, setTab] = useState<Tab>('charter');
  const [charter, setCharter] = useState<GroupCharter>(cockpit.charter);
  const [meetings, setMeetings] = useState<Meeting[]>(cockpit.meetings);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'charter', label: 'Charter', icon: '📋' },
    { key: 'minutes', label: 'Minutes', icon: '📝' },
    { key: 'documents', label: 'Documents', icon: '📄' },
    { key: 'statement', label: 'Month-End', icon: '📊' },
  ];

  return (
    <div>
      <style>{`@media print { .no-print { display: none !important; } body { background:#fff; } .print-doc { box-shadow:none !important; border:none !important; } }`}</style>

      <div className="no-print" style={{ display: 'flex', gap: 6, background: 'var(--bone-2)', padding: 6, borderRadius: 14, width: 'fit-content', flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, background: tab === t.key ? 'var(--forest-deep)' : 'transparent', color: tab === t.key ? 'var(--bone)' : 'var(--ink-2)' }}>
            <span aria-hidden style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {!canEdit && (
        <p className="no-print" style={{ marginTop: 14, fontSize: 13, color: 'var(--dim)' }}>
          You are viewing this workspace. Only group officials can edit and post records.
        </p>
      )}

      <div style={{ marginTop: 20 }}>
        {tab === 'charter' && <CharterTab charter={charter} setCharter={setCharter} canEdit={canEdit} groupId={cockpit.groupId} />}
        {tab === 'minutes' && <MinutesTab charter={charter} meetings={meetings} setMeetings={setMeetings} canEdit={canEdit} groupId={cockpit.groupId} />}
        {tab === 'documents' && <DocumentsTab charter={charter} meetings={meetings} />}
        {tab === 'statement' && <StatementTab charter={charter} meetings={meetings} canEdit={canEdit} groupId={cockpit.groupId} />}
      </div>
    </div>
  );
}

// ───────────────────────────── Charter tab ──────────────────────────────

function CharterTab({ charter, setCharter, canEdit, groupId }: { charter: GroupCharter; setCharter: (c: GroupCharter) => void; canEdit: boolean; groupId: string }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string>();
  const comp = useMemo(() => charterCompleteness(charter), [charter]);
  const set = (patch: Partial<GroupCharter>) => { setCharter({ ...charter, ...patch }); setSaved(false); };
  const setSched = (patch: Partial<GroupCharter['schedule']>) => set({ schedule: { ...charter.schedule, ...patch } });

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set({ logoUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true); setErr(undefined);
    const r = await saveCharterAction({ groupId, charter });
    setSaving(false);
    if (r.ok) setSaved(true); else setErr(r.error);
  }

  const disabled = !canEdit;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Charter completeness</span>
          <span className="mono" style={{ fontWeight: 700, color: comp.readyForDocument ? 'var(--good)' : 'var(--gold-deep)' }}>{comp.pct}%</span>
        </div>
        <div style={{ marginTop: 10 }}><ProgressBar pct={comp.pct} /></div>
        {comp.readyForDocument
          ? <p style={{ marginTop: 12, color: 'var(--good)', fontWeight: 600, fontSize: 13.5 }}>✓ This charter is complete enough to generate a bank-ready profile.</p>
          : <Hint text={comp.nextPrompt} />}
      </div>

      {/* Identity */}
      <div style={card}>
        <SectionTitle n={1} title="Group identity" />
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={label}>Name of the group</label>
            <input style={input} value={charter.name} disabled={disabled} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Umoja Women Group" />
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 72, height: 72, borderRadius: 14, background: 'var(--bone-2)', display: 'grid', placeItems: 'center', overflow: 'hidden', border: '1px solid var(--line)' }}>
              {charter.logoUrl ? <img src={charter.logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 24 }}>🪙</span>}
            </div>
            <div>
              <label style={label}>Logo (optional)</label>
              {!disabled && <input type="file" accept="image/*" onChange={onLogo} style={{ fontSize: 13 }} />}
              {charter.logoUrl && !disabled && <button style={{ ...btnGhost, padding: '4px 10px', marginLeft: 8, fontSize: 12 }} onClick={() => set({ logoUrl: undefined })}>Remove</button>}
            </div>
          </div>
        </div>
      </div>

      {/* Meeting schedule */}
      <div style={card}>
        <SectionTitle n={2} title="Where & when you meet" />
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={label}>Physical location / place of meeting</label>
            <input style={input} value={charter.schedule.venue} disabled={disabled} onChange={(e) => setSched({ venue: e.target.value })} placeholder="e.g. At Zawadi Hotel, Kayole" />
          </div>
          <div>
            <label style={label}>Meeting day(s)</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {WEEK_DAYS.map((d) => {
                const on = charter.schedule.days.includes(d);
                return (
                  <button key={d} disabled={disabled} onClick={() => setSched({ days: on ? charter.schedule.days.filter((x) => x !== d) : [...charter.schedule.days, d] })}
                    style={{ padding: '7px 12px', borderRadius: 999, border: `1px solid ${on ? 'var(--forest)' : 'var(--line)'}`, background: on ? 'var(--forest)' : '#fff', color: on ? '#fff' : 'var(--ink-2)', fontWeight: 600, fontSize: 12.5, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                    {d.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={label}>From</label><input style={input} value={charter.schedule.startTime} disabled={disabled} onChange={(e) => setSched({ startTime: e.target.value })} placeholder="4:00 PM" /></div>
            <div><label style={label}>To</label><input style={input} value={charter.schedule.endTime} disabled={disabled} onChange={(e) => setSched({ endTime: e.target.value })} placeholder="6:00 PM" /></div>
            <div><label style={label}>How often</label>
              <select style={input} value={charter.schedule.frequency ?? 'Weekly'} disabled={disabled} onChange={(e) => setSched({ frequency: e.target.value })}>
                {['Weekly', 'Fortnightly', 'Monthly', 'Quarterly'].map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Roster */}
      <div style={card}>
        <SectionTitle n={3} title="Members & officials" />
        <RosterEditor members={charter.members} disabled={disabled} onChange={(members) => set({ members })} />
      </div>

      {/* Governance docs */}
      <div style={card}>
        <SectionTitle n={4} title="Constitution & by-laws" />
        <textarea style={{ ...input, minHeight: 140, resize: 'vertical' }} value={charter.constitution} disabled={disabled} onChange={(e) => set({ constitution: e.target.value })}
          placeholder="Write your constitution and by-laws here — membership rules, contributions, elections, fines, banking… Or upload a file below." />
        {!disabled && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--dim)' }}>
            or <label style={{ color: 'var(--forest)', fontWeight: 700, cursor: 'pointer' }}>upload a document
              <input type="file" accept=".pdf,.doc,.docx,image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) set({ constitutionFileUrl: f.name }); }} />
            </label>
            {charter.constitutionFileUrl && <span style={{ marginLeft: 8 }}>📎 {charter.constitutionFileUrl}</span>}
          </div>
        )}
      </div>

      {/* Motto / mission / vision / values */}
      <div style={card}>
        <SectionTitle n={5} title="Motto, mission, vision & values" />
        <div style={{ display: 'grid', gap: 14 }}>
          <div><label style={label}>Motto</label><input style={input} value={charter.motto} disabled={disabled} onChange={(e) => set({ motto: e.target.value })} placeholder="e.g. Together we rise" /></div>
          <div><label style={label}>Mission statement</label><textarea style={{ ...input, minHeight: 70, resize: 'vertical' }} value={charter.mission} disabled={disabled} onChange={(e) => set({ mission: e.target.value })} placeholder="What the group exists to do." /></div>
          <div><label style={label}>Vision statement</label><textarea style={{ ...input, minHeight: 70, resize: 'vertical' }} value={charter.vision} disabled={disabled} onChange={(e) => set({ vision: e.target.value })} placeholder="Where the group is going." /></div>
          <div>
            <label style={label}>Core values</label>
            <ChipEditor values={charter.coreValues} disabled={disabled} onChange={(coreValues) => set({ coreValues })} placeholder="Type a value and press Enter (e.g. Integrity)" />
          </div>
          <div><label style={label}>Any other content (optional)</label><textarea style={{ ...input, minHeight: 60, resize: 'vertical' }} value={charter.notes ?? ''} disabled={disabled} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything else you want on record." /></div>
        </div>
      </div>

      {canEdit && (
        <div className="no-print" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={btnGold} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save charter'}</button>
          {saved && <span style={{ color: 'var(--good)', fontWeight: 700, fontSize: 13.5 }}>✓ Saved</span>}
          {err && <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 13.5 }}>{err}</span>}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--forest-deep)', color: 'var(--bone)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }}>{n}</span>
      <h3 className="display" style={{ fontSize: 19, fontWeight: 600 }}>{title}</h3>
    </div>
  );
}

function RosterEditor({ members, disabled, onChange }: { members: CharterMember[]; disabled: boolean; onChange: (m: CharterMember[]) => void }) {
  const update = (id: string, patch: Partial<CharterMember>) => onChange(members.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  return (
    <div>
      <div style={{ display: 'grid', gap: 8 }}>
        {members.map((m) => (
          <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '26px 1.4fr 1fr 1fr 30px', gap: 8, alignItems: 'center' }}>
            <span className="mono" style={{ color: 'var(--dim)', fontSize: 13, textAlign: 'center' }}>{m.serial}</span>
            <input style={{ ...input, padding: '9px 11px' }} value={m.fullName} disabled={disabled} placeholder="Full name" onChange={(e) => update(m.id, { fullName: e.target.value })} />
            <select style={{ ...input, padding: '9px 11px' }} value={m.designation} disabled={disabled} onChange={(e) => update(m.id, { designation: e.target.value as OfficialDesignation })}>
              {OFFICIAL_DESIGNATIONS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <input style={{ ...input, padding: '9px 11px' }} value={m.phone} disabled={disabled} placeholder="Phone" onChange={(e) => update(m.id, { phone: e.target.value })} />
            {!disabled && <button aria-label="Remove" onClick={() => onChange(removeMember(members, m.id))} style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: 18 }}>×</button>}
          </div>
        ))}
      </div>
      {members.length === 0 && <p style={{ color: 'var(--dim)', fontSize: 13.5, marginBottom: 10 }}>No members yet. Add the chairperson first.</p>}
      {!disabled && (
        <button style={{ ...btnGhost, marginTop: 12 }} onClick={() => onChange(addMember(members))}>＋ Add member</button>
      )}
    </div>
  );
}

function ChipEditor({ values, disabled, onChange, placeholder }: { values: string[]; disabled: boolean; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: values.length ? 8 : 0 }}>
        {values.map((v, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, background: 'var(--bone-2)', fontSize: 13, fontWeight: 600 }}>
            {v}{!disabled && <button onClick={() => onChange(values.filter((_, j) => j !== i))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--dim)' }}>×</button>}
          </span>
        ))}
      </div>
      {!disabled && (
        <input style={input} value={draft} placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { e.preventDefault(); onChange([...values, draft.trim()]); setDraft(''); } }} />
      )}
    </div>
  );
}

// ───────────────────────────── Minutes tab ──────────────────────────────

function StatusBadge({ status }: { status: 'DRAFT' | 'POSTED' }) {
  const posted = status === 'POSTED';
  return <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', padding: '3px 9px', borderRadius: 7, background: posted ? 'rgba(47,125,82,.14)' : 'var(--bone-2)', color: posted ? 'var(--good)' : 'var(--dim)' }}>{posted ? 'POSTED' : 'DRAFT'}</span>;
}

function MinutesTab({ charter, meetings, setMeetings, canEdit, groupId }: { charter: GroupCharter; meetings: Meeting[]; setMeetings: (m: Meeting[]) => void; canEdit: boolean; groupId: string }) {
  const [editing, setEditing] = useState<Meeting | null>(null);

  function newMeeting() {
    const nextNo = (meetings.reduce((mx, m) => Math.max(mx, m.meetingNo), 0)) + 1;
    const roster = charter.members.filter((m) => m.fullName.trim()).map((m) => ({ memberId: m.id, name: m.fullName, designation: m.designation }));
    const m = emptyMeeting(groupId, nextNo, roster);
    m.venue = charter.schedule.venue;
    m.day = charter.schedule.days[0] ?? '';
    m.startTime = charter.schedule.startTime;
    m.endTime = charter.schedule.endTime;
    const chair = charter.members.find((x) => x.designation === 'Chairperson');
    const sec = charter.members.find((x) => x.designation === 'Secretary');
    m.chairpersonName = chair?.fullName ?? '';
    m.secretaryName = sec?.fullName ?? '';
    setEditing(m);
  }

  function commit(m: Meeting) {
    const others = meetings.filter((x) => x.meetingNo !== m.meetingNo);
    setMeetings([m, ...others].sort((a, b) => b.meetingNo - a.meetingNo));
    setEditing(null);
  }

  if (editing) {
    return <MinutesForm meeting={editing} charter={charter} groupId={groupId} onCancel={() => setEditing(null)} onCommit={commit} />;
  }

  if (charter.members.filter((m) => m.fullName.trim()).length < 2) {
    return <div style={card}><p style={{ color: 'var(--ink-2)' }}>Add your members on the <b>Charter</b> tab first — the minutes attendance sheet is built from your roster.</p></div>;
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {canEdit && (
        <button style={btnGold} onClick={newMeeting}>＋ Record a new meeting</button>
      )}
      {meetings.length === 0 && <div style={card}><p style={{ color: 'var(--dim)' }}>No meetings recorded yet.</p></div>}
      {meetings.map((m) => {
        const t = attendanceTally(m.attendance);
        return (
          <div key={m.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="display" style={{ fontSize: 17, fontWeight: 600 }}>Meeting No. {m.meetingNo}</span>
                <StatusBadge status={m.status} />
              </div>
              <p style={{ color: 'var(--dim)', fontSize: 13, marginTop: 3 }}>{m.date || 'No date'} · {t.present}/{t.total} present · {m.agendas.filter((a) => a.title.trim()).length} agenda item(s)</p>
            </div>
            {canEdit && <button style={btnGhost} onClick={() => setEditing(m)}>{m.status === 'POSTED' ? 'View / re-open' : 'Continue →'}</button>}
          </div>
        );
      })}
    </div>
  );
}

function MinutesForm({ meeting, charter, groupId, onCancel, onCommit }: { meeting: Meeting; charter: GroupCharter; groupId: string; onCancel: () => void; onCommit: (m: Meeting) => void }) {
  const [m, setM] = useState<Meeting>(meeting);
  const [preview, setPreview] = useState<{ doc: ProfessionalMinutes; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const comp = useMemo(() => meetingCompleteness(m), [m]);
  const fin = useMemo(() => tableBankingSummary(m.tableBanking), [m.tableBanking]);
  const set = (patch: Partial<Meeting>) => setM({ ...m, ...patch });
  const setTB = (patch: Partial<Meeting['tableBanking']>) => set({ tableBanking: { ...m.tableBanking, ...patch } });

  const roster = charter.members.filter((x) => x.fullName.trim());

  function cycleAttendance(memberId: string) {
    const order: AttendanceStatus[] = ['present', 'apology', 'absent'];
    set({ attendance: m.attendance.map((a) => a.memberId === memberId ? { ...a, status: order[(order.indexOf(a.status) + 1) % 3]! } : a) });
  }
  function setContribution(memberId: string, name: string, cents: number) {
    const rest = m.tableBanking.contributions.filter((c) => c.memberId !== memberId);
    setTB({ contributions: cents > 0 ? [...rest, { memberId, name, amountCents: cents }] : rest });
  }

  async function saveDraft() {
    setBusy(true); setErr(undefined);
    const r = await saveMeetingAction({ groupId, meeting: m });
    setBusy(false);
    if (r.ok) onCommit(m); else setErr(r.error);
  }

  function generate() {
    const doc = paraphraseMinutes(m, charter);
    setPreview({ doc, text: doc.plainText });
  }

  async function post() {
    if (!preview) return;
    setBusy(true); setErr(undefined);
    const posted: Meeting = { ...m, status: 'POSTED' };
    await saveMeetingAction({ groupId, meeting: posted });
    const r = await postMeetingAction({ groupId, meetingNo: m.meetingNo, generatedDoc: preview.text });
    setBusy(false);
    if (r.ok) onCommit(posted); else setErr(r.error);
  }

  if (preview) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <h3 className="display" style={{ fontSize: 20, fontWeight: 600 }}>Generated minutes — review before posting</h3>
            <p style={{ color: 'var(--dim)', fontSize: 13 }}>Stawi paraphrased your entries into formal minutes. As an official, fine-tune the wording, then post.</p>
          </div>
          <button style={btnGhost} onClick={() => setPreview(null)}>← Back to form</button>
        </div>
        <MinutesDocument doc={preview.doc} charter={charter} />
        <div className="no-print" style={card}>
          <label style={label}>✎ Fine-tune wording before posting (official edit)</label>
          <textarea style={{ ...input, minHeight: 220, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.6 }} value={preview.text} onChange={(e) => setPreview({ ...preview, text: e.target.value })} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            <button style={btnGold} onClick={() => window.print()}>↓ Print / Save PDF</button>
            <button style={btn} onClick={post} disabled={busy}>{busy ? 'Posting…' : '✓ Post minutes to group'}</button>
            {err && <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 13 }}>{err}</span>}
          </div>
        </div>
      </div>
    );
  }

  const disabled = false;
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h3 className="display" style={{ fontSize: 21, fontWeight: 600 }}>Meeting No. {m.meetingNo}</h3>
        <button style={btnGhost} onClick={onCancel}>← All meetings</button>
      </div>

      <div style={card}>
        <SectionTitle n={1} title="Meeting details" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={label}>Date</label><input type="date" style={input} value={m.date} onChange={(e) => set({ date: e.target.value, day: e.target.value ? new Date(e.target.value + 'T00:00:00Z').toLocaleDateString('en-KE', { weekday: 'long', timeZone: 'UTC' }) : m.day })} /></div>
          <div><label style={label}>Venue</label><input style={input} value={m.venue} onChange={(e) => set({ venue: e.target.value })} /></div>
          <div><label style={label}>Start time</label><input style={input} value={m.startTime} onChange={(e) => set({ startTime: e.target.value })} placeholder="4:00 PM" /></div>
          <div><label style={label}>End time</label><input style={input} value={m.endTime} onChange={(e) => set({ endTime: e.target.value })} placeholder="6:00 PM" /></div>
          <div><label style={label}>Chairperson</label><input style={input} value={m.chairpersonName} onChange={(e) => set({ chairpersonName: e.target.value })} /></div>
          <div><label style={label}>Secretary (minute-taker)</label><input style={input} value={m.secretaryName} onChange={(e) => set({ secretaryName: e.target.value })} /></div>
        </div>
      </div>

      <div style={card}>
        <SectionTitle n={2} title="Attendance" />
        <p style={{ color: 'var(--dim)', fontSize: 13, marginTop: -8, marginBottom: 12 }}>Tap each member to cycle: Present → Apology → Absent.</p>
        <div style={{ display: 'grid', gap: 7 }}>
          {m.attendance.map((a) => {
            const color = a.status === 'present' ? 'var(--good)' : a.status === 'apology' ? 'var(--warn)' : 'var(--danger)';
            const bg = a.status === 'present' ? 'rgba(47,125,82,.12)' : a.status === 'apology' ? 'rgba(204,138,30,.14)' : 'rgba(196,69,47,.12)';
            return (
              <button key={a.memberId} onClick={() => cycleAttendance(a.memberId)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, border: `1px solid ${color}`, background: bg, cursor: 'pointer', fontFamily: 'inherit' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{a.name}{a.designation ? <span style={{ color: 'var(--dim)', fontWeight: 500 }}> · {a.designation}</span> : null}</span>
                <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: '.05em', color, textTransform: 'uppercase' }}>{a.status === 'present' ? '✓ Present' : a.status === 'apology' ? '⚑ Apology' : '✕ Absent'}</span>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--dim)' }}>{(() => { const t = attendanceTally(m.attendance); return `${t.present} present · ${t.apology} apology · ${t.absent} absent · quorum ${t.quorumMet ? 'met' : 'not met'}`; })()}</div>
      </div>

      <div style={card}>
        <SectionTitle n={3} title="Agenda & resolutions" />
        <AgendaEditor agendas={m.agendas} onChange={(agendas) => set({ agendas })} />
      </div>

      <div style={card}>
        <SectionTitle n={4} title="Table-banking / merry-go-round" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div><label style={label}>Opening balance (KES)</label><input style={input} inputMode="decimal" value={fromCents(m.tableBanking.openingBalanceCents ?? 0)} onChange={(e) => setTB({ openingBalanceCents: toCents(e.target.value) })} /></div>
        </div>
        <label style={label}>Contributions collected</label>
        <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
          {roster.map((mem) => {
            const c = m.tableBanking.contributions.find((x) => x.memberId === mem.id);
            return (
              <div key={mem.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{mem.fullName}</span>
                <input style={{ ...input, padding: '8px 11px' }} inputMode="decimal" placeholder="0" value={fromCents(c?.amountCents ?? 0)} onChange={(e) => setContribution(mem.id, mem.fullName, toCents(e.target.value))} />
              </div>
            );
          })}
        </div>
        <FinesEditor roster={roster} fines={m.tableBanking.fines} onChange={(fines) => setTB({ fines })} />
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 8, alignItems: 'end', marginTop: 14 }}>
          <div><label style={label}>Merry-go-round payout to</label>
            <select style={input} value={m.tableBanking.payoutRecipient ?? ''} onChange={(e) => setTB({ payoutRecipient: e.target.value || undefined })}>
              <option value="">— none —</option>
              {roster.map((r) => <option key={r.id}>{r.fullName}</option>)}
            </select>
          </div>
          <div><label style={label}>Amount (KES)</label><input style={input} inputMode="decimal" value={fromCents(m.tableBanking.payoutCents ?? 0)} onChange={(e) => setTB({ payoutCents: toCents(e.target.value) })} /></div>
        </div>
        <div style={{ marginTop: 14, padding: 14, background: 'var(--bone-2)', borderRadius: 12, display: 'grid', gap: 5, fontSize: 13 }}>
          <Row k="Opening" v={formatKes(fin.openingCents)} />
          <Row k="Contributions" v={formatKes(fin.contributionsCents)} />
          <Row k="Fines & penalties" v={formatKes(fin.finesCents)} />
          <Row k="Payout" v={`− ${formatKes(fin.payoutCents)}`} />
          <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0' }} />
          <Row k="Closing balance" v={formatKes(fin.closingBalanceCents)} strong />
        </div>
      </div>

      <div style={card}>
        <SectionTitle n={5} title="Any other business (AOB)" />
        <AobEditor aobs={m.aobs} onChange={(aobs) => set({ aobs })} />
      </div>

      <div style={card}>
        <SectionTitle n={6} title="Adjournment" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={label}>Adjourned at</label><input style={input} value={m.adjournmentTime} onChange={(e) => set({ adjournmentTime: e.target.value })} placeholder="6:00 PM" /></div>
          <div><label style={label}>Next meeting date</label><input type="date" style={input} value={m.nextMeetingDate ?? ''} onChange={(e) => set({ nextMeetingDate: e.target.value || undefined })} /></div>
        </div>
      </div>

      {!comp.readyForDocument && <Hint text={comp.nextPrompt} />}

      <div className="no-print" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={btnGold} onClick={generate} disabled={!comp.readyForDocument} title={comp.readyForDocument ? '' : 'Fill the required fields first'}>⚙ Generate professional minutes</button>
        <button style={btnGhost} onClick={saveDraft} disabled={busy}>{busy ? 'Saving…' : 'Save draft'}</button>
        {err && <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 13 }}>{err}</span>}
      </div>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--dim)' }}>{k}</span><span className="mono" style={{ fontWeight: strong ? 800 : 600, color: strong ? 'var(--forest-deep)' : 'var(--ink)' }}>{v}</span></div>;
}

function AgendaEditor({ agendas, onChange }: { agendas: AgendaItem[]; onChange: (a: AgendaItem[]) => void }) {
  const update = (id: string, patch: Partial<AgendaItem>) => onChange(agendas.map((a) => a.id === id ? { ...a, ...patch } : a));
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {agendas.map((a, i) => (
        <div key={a.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--gold-deep)' }}>Agenda {i + 1}</span>
            <button onClick={() => onChange(agendas.filter((x) => x.id !== a.id))} style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <input style={input} value={a.title} placeholder="Agenda title (e.g. Purchase of chairs)" onChange={(e) => update(a.id, { title: e.target.value })} />
            <textarea style={{ ...input, minHeight: 54, resize: 'vertical' }} value={a.discussion} placeholder="What was discussed / proposed (write it plainly — Stawi will formalize it)" onChange={(e) => update(a.id, { discussion: e.target.value })} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input style={input} value={a.proposedBy ?? ''} placeholder="Proposed by" onChange={(e) => update(a.id, { proposedBy: e.target.value })} />
              <input style={input} value={a.secondedBy ?? ''} placeholder="Seconded by" onChange={(e) => update(a.id, { secondedBy: e.target.value })} />
            </div>
            <input style={input} value={a.resolution} placeholder="What was agreed (e.g. buy 20 chairs)" onChange={(e) => update(a.id, { resolution: e.target.value })} />
          </div>
        </div>
      ))}
      <button style={btnGhost} onClick={() => onChange(addAgenda(agendas))}>＋ Add agenda item</button>
    </div>
  );
}

function FinesEditor({ roster, fines, onChange }: { roster: CharterMember[]; fines: Meeting['tableBanking']['fines']; onChange: (f: Meeting['tableBanking']['fines']) => void }) {
  const update = (i: number, patch: Partial<(typeof fines)[number]>) => onChange(fines.map((f, j) => j === i ? { ...f, ...patch } : f));
  return (
    <div>
      <label style={label}>Fines / penalties</label>
      <div style={{ display: 'grid', gap: 6 }}>
        {fines.map((f, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr .8fr 28px', gap: 6, alignItems: 'center' }}>
            <select style={{ ...input, padding: '8px 10px' }} value={f.memberId} onChange={(e) => { const mem = roster.find((r) => r.id === e.target.value); update(i, { memberId: e.target.value, name: mem?.fullName ?? '' }); }}>
              <option value="">Member…</option>
              {roster.map((r) => <option key={r.id} value={r.id}>{r.fullName}</option>)}
            </select>
            <input style={{ ...input, padding: '8px 10px' }} value={f.reason} placeholder="Reason" onChange={(e) => update(i, { reason: e.target.value })} />
            <input style={{ ...input, padding: '8px 10px' }} inputMode="decimal" placeholder="KES" value={fromCents(f.amountCents)} onChange={(e) => update(i, { amountCents: toCents(e.target.value) })} />
            <button onClick={() => onChange(fines.filter((_, j) => j !== i))} style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        ))}
      </div>
      <button style={{ ...btnGhost, marginTop: 8, padding: '7px 14px', fontSize: 13 }} onClick={() => onChange([...fines, { memberId: '', name: '', reason: '', amountCents: 0 }])}>＋ Add fine</button>
    </div>
  );
}

function AobEditor({ aobs, onChange }: { aobs: Meeting['aobs']; onChange: (a: Meeting['aobs']) => void }) {
  const update = (id: string, patch: Partial<(typeof aobs)[number]>) => onChange(aobs.map((a) => a.id === id ? { ...a, ...patch } : a));
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {aobs.map((a) => (
        <div key={a.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 12, display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button onClick={() => onChange(aobs.filter((x) => x.id !== a.id))} style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }}>×</button></div>
          <input style={input} value={a.topic} placeholder="Topic" onChange={(e) => update(a.id, { topic: e.target.value })} />
          <textarea style={{ ...input, minHeight: 46, resize: 'vertical' }} value={a.deliberation} placeholder="What was said / decided" onChange={(e) => update(a.id, { deliberation: e.target.value })} />
        </div>
      ))}
      <button style={btnGhost} onClick={() => onChange([...aobs, { id: `aob-${Math.random().toString(36).slice(2, 6)}`, topic: '', deliberation: '' }])}>＋ Add AOB</button>
    </div>
  );
}

// ─────────────────────────── Document renderers ─────────────────────────

function DocHeader({ charter, subtitle }: { charter: GroupCharter; subtitle: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, borderBottom: '2px solid var(--forest-deep)', paddingBottom: 14 }}>
      {charter.logoUrl ? <img src={charter.logoUrl} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover' }} /> : <div style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--bone-2)', display: 'grid', placeItems: 'center', fontSize: 22 }}>🪙</div>}
      <div style={{ flex: 1 }}>
        <div className="display" style={{ fontSize: 22, fontWeight: 600, color: 'var(--forest-deep)' }}>{charter.name || 'The Group'}</div>
        {charter.motto && <div style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--dim)' }}>&ldquo;{charter.motto}&rdquo;</div>}
      </div>
      <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gold-deep)' }}>{subtitle}</div>
    </div>
  );
}

function MinutesDocument({ doc, charter }: { doc: ProfessionalMinutes; charter: GroupCharter }) {
  return (
    <div className="print-doc" style={{ ...card, padding: 30 }}>
      <DocHeader charter={charter} subtitle="Official Minutes" />
      <h2 className="display" style={{ fontSize: 18, fontWeight: 600, marginTop: 18, textAlign: 'center' }}>{doc.documentTitle}</h2>
      <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--dim)', marginTop: 4 }}>{[doc.dateLong, doc.venue, doc.timeRange].filter(Boolean).join(' · ')}</p>
      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--forest)', fontWeight: 600, marginTop: 2 }}>{doc.attendanceLine}</p>

      <div style={{ marginTop: 18, display: 'grid', gap: 16 }}>
        {doc.sections.map((s, i) => (
          <div key={i}>
            <h4 style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--forest-deep)', letterSpacing: '.02em' }}>{s.heading}</h4>
            {s.paragraphs.map((p, j) => <p key={j} style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--ink)', marginTop: 5 }}>{p}</p>)}
            {s.heading.startsWith('5.') && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10, fontSize: 13 }}>
                <tbody>
                  {doc.financeRows.map((r, k) => (
                    <tr key={k} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '7px 4px', color: 'var(--ink-2)' }}>{r.label}</td>
                      <td className="mono" style={{ padding: '7px 4px', textAlign: 'right', fontWeight: r.emphasis ? 800 : 600, color: r.emphasis ? 'var(--forest-deep)' : 'var(--ink)' }}>{r.amountDisplay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 26, display: 'flex', justifyContent: 'space-between', gap: 20 }}>
        {doc.signatories.map((s, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{ borderBottom: '1px solid var(--ink)', height: 34 }} />
            <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4 }}>{s.role}: <b style={{ color: 'var(--ink)' }}>{s.name}</b></div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 20, fontSize: 10.5, color: 'var(--faint)', textAlign: 'center' }}>Generated by Stawi · A supporting record of the group&rsquo;s activities.</p>
    </div>
  );
}

function DocumentsTab({ charter, meetings }: { charter: GroupCharter; meetings: Meeting[] }) {
  const posted = meetings.filter((m) => m.status === 'POSTED');
  const [openNo, setOpenNo] = useState<number | null>(posted[0]?.meetingNo ?? null);
  if (posted.length === 0) return <div style={card}><p style={{ color: 'var(--ink-2)' }}>No posted documents yet. Record a meeting, generate the minutes and post them — they will appear here, ready to download and present to a bank or SACCO.</p></div>;
  const open = posted.find((m) => m.meetingNo === openNo) ?? posted[0]!;
  const doc = paraphraseMinutes(open, charter);
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {posted.map((m) => (
          <button key={m.id} onClick={() => setOpenNo(m.meetingNo)} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${m.meetingNo === open.meetingNo ? 'var(--forest)' : 'var(--line)'}`, background: m.meetingNo === open.meetingNo ? 'var(--forest)' : '#fff', color: m.meetingNo === open.meetingNo ? '#fff' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>No. {m.meetingNo} · {m.date}</button>
        ))}
      </div>
      <div className="no-print"><button style={btnGold} onClick={() => window.print()}>↓ Print / Save this document as PDF</button></div>
      <MinutesDocument doc={doc} charter={charter} />
    </div>
  );
}

// ───────────────────────────── Statement tab ────────────────────────────

function StatementTab({ charter, meetings, canEdit, groupId }: { charter: GroupCharter; meetings: Meeting[]; canEdit: boolean; groupId: string }) {
  const dated = meetings.filter((m) => m.date);
  const latest = dated.map((m) => m.date).sort().at(-1) ?? '';
  const [period, setPeriod] = useState<string>(latest ? latest.slice(0, 7) : '');
  const [posted, setPosted] = useState(false);

  const statement: MonthEndStatement | null = useMemo(() => {
    if (!period) return null;
    const [y, mo] = period.split('-').map(Number);
    return reconcileMonth(meetings, charter, { year: y!, month: mo! });
  }, [period, meetings, charter]);

  const [narr, setNarr] = useState<string[] | null>(null);
  const narrative = narr ?? statement?.narrative ?? [];

  async function post() {
    if (!statement) return;
    const [y, mo] = period.split('-').map(Number);
    const r = await saveStatementAction({ groupId, year: y!, month: mo!, payload: { ...statement, narrative }, post: true });
    if (r.ok) setPosted(true);
  }

  if (dated.length === 0) return <div style={card}><p style={{ color: 'var(--ink-2)' }}>Record and date at least one meeting to generate a month-end statement.</p></div>;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="no-print" style={{ ...card, display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
        <div><label style={label}>Statement month</label><input type="month" style={input} value={period} onChange={(e) => { setPeriod(e.target.value); setNarr(null); setPosted(false); }} /></div>
        {statement && <button style={btnGold} onClick={() => window.print()}>↓ Print / Save PDF</button>}
        {statement && canEdit && <button style={btn} onClick={post}>✓ Post statement</button>}
        {posted && <span style={{ color: 'var(--good)', fontWeight: 700, fontSize: 13 }}>✓ Posted</span>}
      </div>

      {statement && <StatementDocument charter={charter} st={statement} narrative={narrative} onEditNarrative={canEdit ? (i, v) => setNarr(narrative.map((p, j) => j === i ? v : p)) : undefined} />}
    </div>
  );
}

function StatementDocument({ charter, st, narrative, onEditNarrative }: { charter: GroupCharter; st: MonthEndStatement; narrative: string[]; onEditNarrative?: (i: number, v: string) => void }) {
  return (
    <div className="print-doc" style={{ ...card, padding: 30 }}>
      <DocHeader charter={charter} subtitle="Month-End Statement" />
      <h2 className="display" style={{ fontSize: 19, fontWeight: 600, marginTop: 16, textAlign: 'center' }}>Statement for {st.period.label}</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 18 }}>
        <Stat k="Meetings" v={String(st.meetingsHeld)} />
        <Stat k="Members" v={String(st.membersOnRegister)} />
        <Stat k="Avg attendance" v={`${st.avgAttendancePct}%`} />
        <Stat k="Closing balance" v={formatKes(st.finance.closingCents)} />
      </div>

      <h4 style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--forest-deep)', marginTop: 22 }}>1. NARRATIVE SUMMARY</h4>
      <div style={{ marginTop: 6, display: 'grid', gap: 8 }}>
        {narrative.map((p, i) => onEditNarrative
          ? <textarea key={i} className="no-print" style={{ ...input, minHeight: 54, resize: 'vertical', fontSize: 13 }} value={p} onChange={(e) => onEditNarrative(i, e.target.value)} />
          : <p key={i} style={{ fontSize: 13.5, lineHeight: 1.7 }}>{p}</p>)}
        {onEditNarrative && narrative.map((p, i) => <p key={`pr-${i}`} className="print-only" style={{ fontSize: 13.5, lineHeight: 1.7, display: 'none' }}>{p}</p>)}
      </div>

      <h4 style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--forest-deep)', marginTop: 22 }}>2. MEMBER ATTENDANCE & CONTRIBUTIONS</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 12.5 }}>
        <thead><tr style={{ borderBottom: '2px solid var(--forest-deep)', textAlign: 'left' }}>
          <th style={{ padding: '6px 4px' }}>Member</th><th style={{ padding: '6px 4px', textAlign: 'center' }}>Present</th><th style={{ padding: '6px 4px', textAlign: 'center' }}>Att.%</th><th style={{ padding: '6px 4px', textAlign: 'right' }}>Contributed</th><th style={{ padding: '6px 4px', textAlign: 'right' }}>Fines</th>
        </tr></thead>
        <tbody>
          {st.members.map((m) => (
            <tr key={m.memberId} style={{ borderBottom: '1px solid var(--line)' }}>
              <td style={{ padding: '6px 4px' }}>{m.name}</td>
              <td style={{ padding: '6px 4px', textAlign: 'center' }} className="mono">{m.meetingsPresent}/{st.meetingsHeld}</td>
              <td style={{ padding: '6px 4px', textAlign: 'center' }} className="mono">{m.attendancePct}%</td>
              <td style={{ padding: '6px 4px', textAlign: 'right' }} className="mono">{formatKes(m.contributedCents)}</td>
              <td style={{ padding: '6px 4px', textAlign: 'right' }} className="mono">{formatKes(m.finesCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--forest-deep)', marginTop: 22 }}>3. FINANCIAL RECONCILIATION</h4>
      <div style={{ marginTop: 8, padding: 14, background: 'var(--bone-2)', borderRadius: 12, display: 'grid', gap: 5, fontSize: 13 }}>
        <Row k="Opening balance" v={formatKes(st.finance.openingCents)} />
        <Row k="Contributions" v={formatKes(st.finance.contributionsCents)} />
        <Row k="Fines & penalties" v={formatKes(st.finance.finesCents)} />
        <Row k="Total receipts" v={formatKes(st.finance.totalInCents)} />
        <Row k="Total disbursements" v={`− ${formatKes(st.finance.totalOutCents)}`} />
        <div style={{ borderTop: '1px solid var(--line)', margin: '3px 0' }} />
        <Row k="Closing balance" v={formatKes(st.finance.closingCents)} strong />
      </div>

      {st.resolutions.length > 0 && (
        <>
          <h4 style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--forest-deep)', marginTop: 22 }}>4. RESOLUTIONS PASSED</h4>
          <ul style={{ marginTop: 8, paddingLeft: 18, display: 'grid', gap: 5 }}>
            {st.resolutions.map((r, i) => <li key={i} style={{ fontSize: 13, lineHeight: 1.6 }}>{r}</li>)}
          </ul>
        </>
      )}
      <p style={{ marginTop: 20, fontSize: 10.5, color: 'var(--faint)', textAlign: 'center' }}>Generated by Stawi · Harmonised reconciliation of {st.period.label}. A supporting record for credit and formalization.</p>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return <div style={{ padding: 12, background: 'var(--bone-2)', borderRadius: 12, textAlign: 'center' }}><div className="mono" style={{ fontSize: 17, fontWeight: 800, color: 'var(--forest-deep)' }}>{v}</div><div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>{k}</div></div>;
}
