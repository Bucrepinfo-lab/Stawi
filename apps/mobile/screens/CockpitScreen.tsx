/**
 * Pillar 1 cockpit — mobile. Tabs: Charter · Minutes · Documents · Month-End.
 * All logic from @stawi/core (charter completeness, paraphraser, reconciliation).
 */
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  charterCompleteness,
  isOfficial,
  attendanceTally,
  tableBankingSummary,
  meetingCompleteness,
  paraphraseMinutes,
  reconcileMonth,
  formatKes,
  type GroupCharter,
  type Meeting,
  type AttendanceStatus,
  type ProfessionalMinutes,
  parseImportedNotes,
} from '@stawi/core';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors, radius, spacing } from '../theme/tokens';

type Tab = 'charter' | 'minutes' | 'documents' | 'statement';
const money = (c: number) => formatKes(c);
const toCents = (v: string) => { const n = parseFloat((v || '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : Math.round(n * 100); };
const fromCents = (c: number) => (c ? String(Math.round(c) / 100) : '');

export function CockpitScreen({ charter, meetings, canEdit, onSaveMeeting, onPostMeeting }: { charter: GroupCharter; meetings: Meeting[]; canEdit: boolean; onSaveMeeting?: (m: Meeting) => void; onPostMeeting?: (m: Meeting, generatedDoc: string) => void }) {
  const [tab, setTab] = useState<Tab>('charter');
  const [list, setList] = useState<Meeting[]>(meetings);
  const tabs: [Tab, string][] = [['charter', '📋 Charter'], ['minutes', '📝 Minutes'], ['documents', '📄 Docs'], ['statement', '📊 Month-End']];

  return (
    <View style={{ flex: 1 }}>
      <View style={g.tabs}>
        {tabs.map(([k, lbl]) => (
          <TouchableOpacity key={k} style={[g.tab, tab === k && g.tabOn]} onPress={() => setTab(k)}>
            <Text style={[g.tabTxt, tab === k && g.tabTxtOn]}>{lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'charter' && <CharterTab charter={charter} canEdit={canEdit} />}
      {tab === 'minutes' && <MinutesTab charter={charter} list={list} setList={setList} canEdit={canEdit} onSaveMeeting={onSaveMeeting} onPostMeeting={onPostMeeting} />}
      {tab === 'documents' && <DocumentsTab charter={charter} list={list} />}
      {tab === 'statement' && <StatementTab charter={charter} list={list} />}
    </View>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return <View style={g.barBg}><View style={[g.barFill, { width: `${pct}%` }]} /></View>;
}
function Hint({ text }: { text?: string }) {
  if (!text) return null;
  return <View style={g.hint}><Text style={g.hintTxt}>👉 Next: {text}</Text></View>;
}
function Badge({ label, kind }: { label: string; kind: 'official' | 'member' | 'draft' | 'posted' }) {
  const map = { official: ['rgba(224,163,46,0.16)', colors.goldDeep], member: [colors.bone2, colors.dim], draft: [colors.bone2, colors.dim], posted: ['rgba(47,125,82,0.15)', colors.good] } as const;
  const [bg, fg] = map[kind];
  return <View style={[g.badge, { backgroundColor: bg }]}><Text style={[g.badgeTxt, { color: fg }]}>{label}</Text></View>;
}

// ── Charter ──────────────────────────────────────────────────────────────
function CharterTab({ charter, canEdit }: { charter: GroupCharter; canEdit: boolean }) {
  const comp = useMemo(() => charterCompleteness(charter), [charter]);
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      <View style={g.card}>
        <View style={g.rowBetween}><Text style={g.cardTitle}>Charter completeness</Text><Text style={[g.mono, { color: comp.readyForDocument ? colors.good : colors.goldDeep, fontWeight: '800' }]}>{comp.pct}%</Text></View>
        <View style={{ marginTop: 8 }}><ProgressBar pct={comp.pct} /></View>
        {comp.readyForDocument ? <Text style={g.ok}>✓ Bank-ready profile complete.</Text> : <Hint text={comp.nextPrompt} />}
      </View>

      <View style={g.card}>
        <Text style={g.gName}>{charter.name}</Text>
        <Text style={g.meta}>{charter.schedule.venue} · {charter.schedule.days.join(', ')} · {charter.schedule.startTime}–{charter.schedule.endTime}</Text>
        <View style={g.chips}>{charter.coreValues.map((v) => <View key={v} style={g.chip}><Text style={g.chipTxt}>{v}</Text></View>)}</View>
        <Text style={g.kv}><Text style={g.kvK}>Motto  </Text><Text style={{ fontStyle: 'italic' }}>“{charter.motto}”</Text></Text>
        <Text style={g.kv}><Text style={g.kvK}>Mission  </Text>{charter.mission}</Text>
        <Text style={g.kv}><Text style={g.kvK}>Vision  </Text>{charter.vision}</Text>
      </View>

      <View style={g.card}>
        <View style={g.rowBetween}><Text style={g.cardTitle}>Members & officials</Text><Text style={g.meta}>{charter.members.length} on roster</Text></View>
        {charter.members.map((m) => (
          <View key={m.id} style={g.memberRow}>
            <View style={{ flex: 1 }}>
              <Text style={g.memberName}>{m.serial}. {m.fullName}</Text>
              <Text style={[g.mono, g.meta]}>{m.phone}</Text>
            </View>
            <Badge label={m.designation} kind={isOfficial(m.designation) ? 'official' : 'member'} />
          </View>
        ))}
        <Text style={[g.meta, { marginTop: 10 }]}>These phone numbers are the join key — each member sees this group when they sign in with their number.</Text>
        {canEdit && <Text style={g.constitution}>{charter.constitution}</Text>}
      </View>
    </ScrollView>
  );
}

// ── Minutes ──────────────────────────────────────────────────────────────
function MinutesTab({ charter, list, setList, canEdit, onSaveMeeting, onPostMeeting }: { charter: GroupCharter; list: Meeting[]; setList: (m: Meeting[]) => void; canEdit: boolean; onSaveMeeting?: (m: Meeting) => void; onPostMeeting?: (m: Meeting, doc: string) => void }) {
  const [editing, setEditing] = useState<Meeting | null>(null);
  if (!canEdit) {
    return <ScrollView contentContainerStyle={{ padding: spacing.lg }}><View style={g.card}><Text style={g.meta}>You are a member of this group. Only officials (Chairperson, Secretary, Treasurer) can record and post minutes.</Text></View></ScrollView>;
  }
  if (editing) {
    return <MinutesForm charter={charter} meeting={editing} onSaveMeeting={onSaveMeeting} onPostMeeting={onPostMeeting} onCancel={() => setEditing(null)} onCommit={(m) => { setList([m, ...list.filter((x) => x.id !== m.id)].sort((a, b) => b.meetingNo - a.meetingNo)); setEditing(null); }} />;
  }
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      {list.map((m) => {
        const t = attendanceTally(m.attendance);
        return (
          <View key={m.id} style={g.card}>
            <View style={g.rowBetween}>
              <Text style={g.cardTitle}>Meeting No. {m.meetingNo}</Text>
              <Badge label={m.status} kind={m.status === 'POSTED' ? 'posted' : 'draft'} />
            </View>
            <Text style={g.meta}>{m.date} · {t.present}/{t.total} present · {m.agendas.filter((a) => a.title.trim()).length} agenda</Text>
            <TouchableOpacity style={g.ghost} onPress={() => setEditing(JSON.parse(JSON.stringify(m)))}><Text style={g.ghostTxt}>{m.status === 'POSTED' ? 'View →' : 'Continue →'}</Text></TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}

function MinutesForm({ charter, meeting, onCancel, onCommit, onSaveMeeting, onPostMeeting }: { charter: GroupCharter; meeting: Meeting; onCancel: () => void; onCommit: (m: Meeting) => void; onSaveMeeting?: (m: Meeting) => void; onPostMeeting?: (m: Meeting, doc: string) => void }) {
  const [m, setM] = useState<Meeting>(meeting);
  const [preview, setPreview] = useState<{ doc: ProfessionalMinutes; text: string } | null>(null);
  const comp = useMemo(() => meetingCompleteness(m), [m]);
  const fin = useMemo(() => tableBankingSummary(m.tableBanking), [m.tableBanking]);
  const setTB = (patch: Partial<Meeting['tableBanking']>) => setM({ ...m, tableBanking: { ...m.tableBanking, ...patch } });

  function applyParsed(pp: ReturnType<typeof parseImportedNotes>) {
    const norm = (x: string) => x.toLowerCase();
    const inList = (list: string[], name: string) => list.some((n) => { const a = norm(n), b = norm(name); return !!a && (b.includes(a) || a.includes(b.split(' ')[0]!)); });
    const attendance = m.attendance.map((a) => ({ ...a, status: (inList(pp.apology, a.name) ? 'apology' : inList(pp.absent, a.name) ? 'absent' : 'present') as typeof a.status }));
    const agendas = pp.agendas.length ? pp.agendas.map((pa, i) => ({ id: 'imp' + i, order: i + 1, title: pa.title, discussion: '', proposedBy: '', secondedBy: '', resolution: pa.resolution })) : m.agendas;
    setM({ ...m, attendance, agendas, date: pp.date || m.date });
  }

  function cycle(id: string) {
    const order: AttendanceStatus[] = ['present', 'apology', 'absent'];
    setM({ ...m, attendance: m.attendance.map((a) => (a.memberId === id ? { ...a, status: order[(order.indexOf(a.status) + 1) % 3]! } : a)) });
  }

  if (preview) {
    return (
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={g.rowBetween}><Text style={g.h3}>Review before posting</Text><TouchableOpacity onPress={() => setPreview(null)}><Text style={g.link}>← Edit</Text></TouchableOpacity></View>
        <Text style={[g.meta, { marginBottom: 8 }]}>Stawi paraphrased your entries into formal minutes. Fine-tune, then post.</Text>
        <DocView doc={preview.doc} charter={charter} />
        <View style={g.card}>
          <Text style={g.label}>✎ Fine-tune wording (official edit)</Text>
          <TextInput style={g.mlInput} multiline value={preview.text} onChangeText={(t) => setPreview({ ...preview, text: t })} />
          <TouchableOpacity style={g.cta} onPress={() => { const posted = { ...m, status: 'POSTED' as const }; onPostMeeting?.(posted, preview.text); onCommit(posted); }}><Text style={g.ctaTxt}>✓ Post minutes to group</Text></TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      <View style={g.rowBetween}><Text style={g.h3}>Meeting No. {m.meetingNo}</Text><TouchableOpacity onPress={onCancel}><Text style={g.link}>← All</Text></TouchableOpacity></View>
      <NotesImport onApply={applyParsed} />

      <View style={g.card}>
        <Text style={g.cardTitle}>Attendance</Text>
        <Text style={[g.meta, { marginBottom: 8 }]}>Tap to cycle: Present → Apology → Absent.</Text>
        {m.attendance.map((a) => {
          const col = a.status === 'present' ? colors.good : a.status === 'apology' ? colors.warn : colors.danger;
          return (
            <TouchableOpacity key={a.memberId} style={[g.att, { borderColor: col }]} onPress={() => cycle(a.memberId)}>
              <Text style={g.attName}>{a.name}</Text>
              <Text style={[g.attState, { color: col }]}>{a.status === 'present' ? '✓ Present' : a.status === 'apology' ? '⚑ Apology' : '✕ Absent'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={g.card}>
        <Text style={g.cardTitle}>Agenda</Text>
        {m.agendas.map((a, i) => (
          <View key={a.id} style={g.agenda}>
            <TextInput style={g.input} value={a.title} placeholder="Agenda title" placeholderTextColor={colors.faint} onChangeText={(v) => setM({ ...m, agendas: m.agendas.map((x, j) => (j === i ? { ...x, title: v } : x)) })} />
            <TextInput style={[g.input, { marginTop: 6 }]} value={a.discussion} placeholder="What was discussed (plain words)" placeholderTextColor={colors.faint} onChangeText={(v) => setM({ ...m, agendas: m.agendas.map((x, j) => (j === i ? { ...x, discussion: v } : x)) })} />
            <TextInput style={[g.input, { marginTop: 6 }]} value={a.resolution} placeholder="What was agreed (e.g. buy 20 chairs)" placeholderTextColor={colors.faint} onChangeText={(v) => setM({ ...m, agendas: m.agendas.map((x, j) => (j === i ? { ...x, resolution: v } : x)) })} />
          </View>
        ))}
      </View>

      <View style={g.card}>
        <Text style={g.cardTitle}>Table-banking</Text>
        {m.tableBanking.contributions.map((x, i) => (
          <View key={x.memberId} style={g.rowBetween}>
            <Text style={g.contribName}>{x.name}</Text>
            <TextInput style={g.amt} keyboardType="numeric" value={fromCents(x.amountCents)} onChangeText={(v) => setTB({ contributions: m.tableBanking.contributions.map((c, j) => (j === i ? { ...c, amountCents: toCents(v) } : c)) })} />
          </View>
        ))}
        <View style={g.finBox}>
          <View style={g.rowBetween}><Text style={g.meta}>Contributions</Text><Text style={g.mono}>{money(fin.contributionsCents)}</Text></View>
          <View style={g.rowBetween}><Text style={g.meta}>Fines</Text><Text style={g.mono}>{money(fin.finesCents)}</Text></View>
          <View style={g.rowBetween}><Text style={g.meta}>Payout</Text><Text style={g.mono}>− {money(fin.payoutCents)}</Text></View>
          <View style={[g.rowBetween, g.finTotal]}><Text style={{ fontWeight: '800' }}>Closing</Text><Text style={[g.mono, { color: colors.forestDeep, fontWeight: '800' }]}>{money(fin.closingBalanceCents)}</Text></View>
        </View>
      </View>

      {!comp.readyForDocument && <Hint text={comp.nextPrompt} />}
      <TouchableOpacity style={[g.cta, !comp.readyForDocument && { opacity: 0.5 }]} disabled={!comp.readyForDocument} onPress={() => { const doc = paraphraseMinutes(m, charter); setPreview({ doc, text: doc.plainText }); }}>
        <Text style={g.ctaTxt}>⚙ Generate professional minutes</Text>
      </TouchableOpacity>
      <TouchableOpacity style={g.ghost} onPress={() => { onSaveMeeting?.(m); onCommit(m); }}>
        <Text style={g.ghostTxt}>Save draft</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function NotesImport({ onApply }: { onApply: (p: ReturnType<typeof parseImportedNotes>) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string>();
  const [msg, setMsg] = useState<string>();

  async function pickPhoto() {
    try {
      const r = await ImagePicker.launchCameraAsync({ quality: 0.6 }).catch(() => ImagePicker.launchImageLibraryAsync({ quality: 0.6 }));
      const a = (r as any)?.assets?.[0];
      if (a) { setFileName(a.fileName ?? 'photo.jpg'); setMsg('Photo attached. Type the key points below — on-device text reading runs server-side in production.'); }
    } catch { setMsg('Could not open the camera.'); }
  }
  async function pickFile() {
    try {
      const r: any = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'text/plain', 'image/*'] });
      const a = r?.assets?.[0];
      if (a) {
        setFileName(a.name);
        if (a.mimeType === 'text/plain' && a.uri) { try { const res = await fetch(a.uri); setText(await res.text()); return; } catch { /* ignore */ } }
        setMsg('File attached. Type the key points below.');
      }
    } catch { setMsg('Could not open the file picker.'); }
  }

  if (!open) {
    return (
      <TouchableOpacity style={g.ghost} onPress={() => setOpen(true)}>
        <Text style={g.ghostTxt}>Import written notes (photo or file)</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={g.card}>
      <View style={g.rowBetween}><Text style={g.cardTitle}>Import written notes</Text><TouchableOpacity onPress={() => setOpen(false)}><Text style={g.link}>Close</Text></TouchableOpacity></View>
      <Text style={[g.meta, { marginTop: 4, marginBottom: 10 }]}>Snap your paper minutes or upload a file. Review the text, then it pre-fills the form.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={[g.cta, { flex: 1, marginTop: 0 }]} onPress={pickPhoto}><Text style={g.ctaTxt}>Photo</Text></TouchableOpacity>
        <TouchableOpacity style={[g.ghost, { flex: 1, marginTop: 0 }]} onPress={pickFile}><Text style={g.ghostTxt}>File</Text></TouchableOpacity>
      </View>
      {!!fileName && <Text style={[g.meta, { marginTop: 8 }]}>{fileName}</Text>}
      {!!msg && <Text style={[g.meta, { marginTop: 6 }]}>{msg}</Text>}
      <TextInput style={[g.input, { minHeight: 120, textAlignVertical: 'top', marginTop: 10, fontSize: 12.5 }]} multiline value={text} onChangeText={setText}
        placeholder={'Present: Amina, Grace\nApologies: David\nAgenda 1: Buy chairs\nResolved that we buy 20 chairs'} placeholderTextColor={colors.faint} />
      <TouchableOpacity style={g.cta} onPress={() => { onApply(parseImportedNotes(text)); setOpen(false); }}><Text style={g.ctaTxt}>Use these notes</Text></TouchableOpacity>
    </View>
  );
}

// ── Document renderer ──────────────────────────────────────────────────────
function DocView({ doc, charter }: { doc: ProfessionalMinutes; charter: GroupCharter }) {
  return (
    <View style={g.docCard}>
      <View style={g.docHead}>
        <View style={g.docLogo}><Text style={{ fontSize: 18 }}>🪙</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={g.docGroup}>{charter.name}</Text>
          {!!charter.motto && <Text style={g.docMotto}>“{charter.motto}”</Text>}
        </View>
        <Badge label="Official" kind="official" />
      </View>
      <Text style={g.docTitle}>{doc.documentTitle}</Text>
      <Text style={g.docSub}>{[doc.dateLong, doc.venue, doc.timeRange].filter(Boolean).join(' · ')}</Text>
      <Text style={g.docAtt}>{doc.attendanceLine}</Text>
      {doc.sections.map((sec, i) => (
        <View key={i} style={{ marginTop: 12 }}>
          <Text style={g.docH4}>{sec.heading}</Text>
          {sec.paragraphs.map((p, j) => <Text key={j} style={g.docP}>{p}</Text>)}
          {sec.heading.startsWith('5.') && (
            <View style={{ marginTop: 6 }}>
              {doc.financeRows.map((r, k) => (
                <View key={k} style={g.finRow}>
                  <Text style={g.meta}>{r.label}</Text>
                  <Text style={[g.mono, r.emphasis && { fontWeight: '800', color: colors.forestDeep }]}>{r.amountDisplay}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
      <View style={g.sigRow}>
        {doc.signatories.map((s2, i) => (
          <View key={i} style={{ flex: 1 }}>
            <View style={g.sigLine} />
            <Text style={g.meta}>{s2.role}: {s2.name}</Text>
          </View>
        ))}
      </View>
      <Text style={g.docFoot}>Generated by Stawi · A supporting record of the group’s activities.</Text>
    </View>
  );
}

// ── Documents ──────────────────────────────────────────────────────────────
function DocumentsTab({ charter, list }: { charter: GroupCharter; list: Meeting[] }) {
  const posted = list.filter((m) => m.status === 'POSTED');
  if (posted.length === 0) return <ScrollView contentContainerStyle={{ padding: spacing.lg }}><View style={g.card}><Text style={g.meta}>No posted documents yet. Record a meeting, generate the minutes and post them — they appear here, ready to present to a bank or SACCO.</Text></View></ScrollView>;
  const doc = paraphraseMinutes(posted[0]!, charter);
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={[g.meta, { marginBottom: 8 }]}>{posted.length} posted document(s). Export/share is available in the full build.</Text>
      <DocView doc={doc} charter={charter} />
    </ScrollView>
  );
}

// ── Month-End ──────────────────────────────────────────────────────────────
function StatementTab({ charter, list }: { charter: GroupCharter; list: Meeting[] }) {
  const st = useMemo(() => reconcileMonth(list, charter, { year: 2026, month: 6 }), [list, charter]);
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      <View style={g.docCard}>
        <View style={g.docHead}><View style={g.docLogo}><Text style={{ fontSize: 18 }}>🪙</Text></View><View style={{ flex: 1 }}><Text style={g.docGroup}>{charter.name}</Text></View><Badge label="Month-End" kind="official" /></View>
        <Text style={g.docTitle}>Statement for {st.period.label}</Text>
        <View style={g.statRow}>
          {[[String(st.meetingsHeld), 'Meetings'], [String(st.membersOnRegister), 'Members'], [`${st.avgAttendancePct}%`, 'Avg att.'], [money(st.finance.closingCents), 'Closing']].map(([v, k], i) => (
            <View key={i} style={g.stat}><Text style={g.statV}>{v}</Text><Text style={g.statK}>{k}</Text></View>
          ))}
        </View>
        <Text style={g.docH4}>1. NARRATIVE</Text>
        {st.narrative.map((p, i) => <Text key={i} style={g.docP}>{p}</Text>)}
        <Text style={g.docH4}>2. ATTENDANCE & CONTRIBUTIONS</Text>
        <View style={g.thead}><Text style={[g.th, { flex: 2 }]}>Member</Text><Text style={[g.th, g.tRight]}>Att.%</Text><Text style={[g.th, g.tRight]}>Contrib.</Text></View>
        {st.members.map((m) => (
          <View key={m.memberId} style={g.trow}><Text style={[g.td, { flex: 2 }]}>{m.name}</Text><Text style={[g.td, g.tRight, g.mono]}>{m.attendancePct}%</Text><Text style={[g.td, g.tRight, g.mono]}>{money(m.contributedCents)}</Text></View>
        ))}
        <Text style={g.docH4}>3. FINANCIAL RECONCILIATION</Text>
        <View style={g.finBox}>
          <View style={g.rowBetween}><Text style={g.meta}>Opening</Text><Text style={g.mono}>{money(st.finance.openingCents)}</Text></View>
          <View style={g.rowBetween}><Text style={g.meta}>Contributions</Text><Text style={g.mono}>{money(st.finance.contributionsCents)}</Text></View>
          <View style={g.rowBetween}><Text style={g.meta}>Fines</Text><Text style={g.mono}>{money(st.finance.finesCents)}</Text></View>
          <View style={[g.rowBetween, g.finTotal]}><Text style={{ fontWeight: '800' }}>Closing</Text><Text style={[g.mono, { color: colors.forestDeep, fontWeight: '800' }]}>{money(st.finance.closingCents)}</Text></View>
        </View>
        {st.resolutions.length > 0 && (<>
          <Text style={g.docH4}>4. RESOLUTIONS PASSED</Text>
          {st.resolutions.map((r, i) => <Text key={i} style={g.docP}>• {r}</Text>)}
        </>)}
        <Text style={g.docFoot}>Generated by Stawi · Harmonised reconciliation of {st.period.label}.</Text>
      </View>
    </ScrollView>
  );
}

const g = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 4, backgroundColor: colors.bone2, padding: 5, borderRadius: 13, margin: spacing.md },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  tabOn: { backgroundColor: colors.forestDeep },
  tabTxt: { fontSize: 11.5, fontWeight: '700', color: colors.ink2 },
  tabTxtOn: { color: colors.bone },
  card: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md },
  cardTitle: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mono: { fontVariant: ['tabular-nums'], color: colors.ink, fontWeight: '600' },
  meta: { color: colors.dim, fontSize: 12.5 },
  ok: { color: colors.good, fontWeight: '700', fontSize: 12.5, marginTop: 10 },
  barBg: { height: 8, borderRadius: 8, backgroundColor: colors.bone2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 8, backgroundColor: colors.gold },
  hint: { marginTop: 10, backgroundColor: 'rgba(224,163,46,0.12)', borderWidth: 1, borderColor: 'rgba(224,163,46,0.35)', borderRadius: 10, padding: 10 },
  hintTxt: { color: colors.ink2, fontSize: 12.5, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  badgeTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  gName: { fontSize: 17, fontWeight: '700', color: colors.forestDeep },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8, marginBottom: 4 },
  chip: { backgroundColor: colors.bone2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipTxt: { fontSize: 12, fontWeight: '600', color: colors.ink2 },
  kv: { color: colors.ink, fontSize: 13, marginTop: 6 },
  kvK: { color: colors.dim, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.line },
  memberName: { fontSize: 13, fontWeight: '700', color: colors.ink },
  constitution: { marginTop: 12, color: colors.ink2, fontSize: 12.5, lineHeight: 19 },
  ghost: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  ghostTxt: { color: colors.forestDeep, fontWeight: '700' },
  h3: { fontSize: 18, fontWeight: '700', color: colors.forestDeep },
  link: { color: colors.forest, fontWeight: '700' },
  label: { color: colors.dim, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 11, paddingVertical: 10, fontSize: 13.5, color: colors.ink },
  mlInput: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: '#fff', padding: 11, minHeight: 130, textAlignVertical: 'top', fontSize: 11.5, color: colors.ink },
  att: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  attName: { fontSize: 13, color: colors.ink, fontWeight: '600' },
  attState: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  agenda: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, marginTop: 8 },
  contribName: { fontSize: 12.5, color: colors.ink2, flex: 1 },
  amt: { width: 110, borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: colors.ink, marginBottom: 5 },
  finBox: { backgroundColor: colors.bone2, borderRadius: 12, padding: 12, marginTop: 10, gap: 4 },
  finTotal: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 4, paddingTop: 6 },
  cta: { backgroundColor: colors.gold, borderRadius: radius.sm, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  ctaTxt: { color: colors.forestDeep, fontWeight: '800', fontSize: 14 },
  docCard: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.lg },
  docHead: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 2, borderBottomColor: colors.forestDeep, paddingBottom: 10 },
  docLogo: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.bone2, alignItems: 'center', justifyContent: 'center' },
  docGroup: { fontSize: 16, fontWeight: '700', color: colors.forestDeep },
  docMotto: { fontSize: 12, fontStyle: 'italic', color: colors.dim },
  docTitle: { fontSize: 13.5, fontWeight: '800', color: colors.ink, textAlign: 'center', marginTop: 12 },
  docSub: { fontSize: 12, color: colors.dim, textAlign: 'center', marginTop: 3 },
  docAtt: { fontSize: 11.5, color: colors.forest, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  docH4: { fontSize: 12.5, fontWeight: '800', color: colors.forestDeep, marginTop: 14 },
  docP: { fontSize: 12.5, lineHeight: 19, color: colors.ink, marginTop: 4 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  sigRow: { flexDirection: 'row', gap: 16, marginTop: 18 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: colors.ink, height: 26 },
  docFoot: { fontSize: 10, color: colors.faint, textAlign: 'center', marginTop: 14 },
  statRow: { flexDirection: 'row', gap: 7, marginTop: 12 },
  stat: { flex: 1, backgroundColor: colors.bone2, borderRadius: 11, padding: 10, alignItems: 'center' },
  statV: { fontVariant: ['tabular-nums'], fontSize: 14, fontWeight: '800', color: colors.forestDeep },
  statK: { fontSize: 9.5, color: colors.dim, marginTop: 2 },
  thead: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: colors.forestDeep, paddingVertical: 6, marginTop: 6 },
  th: { fontSize: 11, fontWeight: '800', color: colors.ink, flex: 1 },
  trow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  td: { fontSize: 12, color: colors.ink, flex: 1 },
  tRight: { textAlign: 'right' },
});
