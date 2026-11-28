/**
 * Group Charter — Pillar 1 identity capture.
 *
 * The charter is the standardized, editable profile every group fills once: who
 * they are, where and when they meet, who the members and officials are, and the
 * governing documents (constitution/by-laws, motto, mission, vision, core values).
 *
 * It is the root record the rest of Stawi reads from: matching (Pillar 2) uses the
 * membership + capital, accounting/compliance (Pillar 3) uses the officials and
 * registration intent, and SACCO+ (Pillar 4) uses the constitution and roster.
 *
 * Everything here is pure and deterministic so it can run offline on a cheap phone
 * and be unit-tested. No network, no keys.
 */

export type OfficialDesignation =
  | 'Chairperson'
  | 'Vice Chairperson'
  | 'Secretary'
  | 'Assistant Secretary'
  | 'Treasurer'
  | 'Assistant Treasurer'
  | 'Organising Secretary'
  | 'Signatory'
  | 'Committee Member'
  | 'Member';

export const OFFICIAL_DESIGNATIONS: OfficialDesignation[] = [
  'Chairperson',
  'Vice Chairperson',
  'Secretary',
  'Assistant Secretary',
  'Treasurer',
  'Assistant Treasurer',
  'Organising Secretary',
  'Signatory',
  'Committee Member',
  'Member',
];

/** An official position is anything other than a plain Member. */
export function isOfficial(d: OfficialDesignation): boolean {
  return d !== 'Member' && d !== 'Committee Member';
}

export interface CharterMember {
  /** Stable id, auto-assigned as rows are added (the "auto-increment" roster). */
  id: string;
  /** 1-indexed serial number shown in the roster. */
  serial: number;
  fullName: string;
  designation: OfficialDesignation;
  phone: string;
  /** Optional national ID / membership number. */
  idNumber?: string;
}

export interface MeetingSchedule {
  /** e.g. "At Zawadi Hotel" or "Grace's home, Kayole". */
  venue: string;
  /** Days the group meets, e.g. ['Friday'] or ['Wednesday','Saturday']. */
  days: string[];
  /** Free text as entered, e.g. "4:00 PM". */
  startTime: string;
  /** Free text as entered, e.g. "6:00 PM". */
  endTime: string;
  /** How often, e.g. 'Weekly' | 'Fortnightly' | 'Monthly'. */
  frequency?: string;
}

export interface GroupCharter {
  groupId: string;
  name: string;
  /** data: URL or hosted URL. Optional. */
  logoUrl?: string;
  schedule: MeetingSchedule;
  members: CharterMember[];
  /** The full text of the constitution & by-laws (or a note that a file is attached). */
  constitution: string;
  /** URL of an uploaded constitution document, if provided instead of/again with text. */
  constitutionFileUrl?: string;
  motto: string;
  mission: string;
  vision: string;
  /** Short phrases, e.g. ['Integrity','Unity','Diligence']. */
  coreValues: string[];
  /** Anything else the group wants on record. */
  notes?: string;
  registeredNumber?: string;
  countryCode: string;
}

export const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/** A blank charter to seed the editable form. */
export function emptyCharter(groupId: string, name = '', countryCode = 'KE'): GroupCharter {
  return {
    groupId,
    name,
    schedule: { venue: '', days: [], startTime: '', endTime: '', frequency: 'Weekly' },
    members: [],
    constitution: '',
    motto: '',
    mission: '',
    vision: '',
    coreValues: [],
    countryCode,
  };
}

/** Append a member to the roster, auto-assigning id + serial. */
export function addMember(
  members: CharterMember[],
  input: { fullName?: string; designation?: OfficialDesignation; phone?: string; idNumber?: string } = {},
): CharterMember[] {
  const serial = members.length + 1;
  const row: CharterMember = {
    id: `m${serial}-${Math.random().toString(36).slice(2, 8)}`,
    serial,
    fullName: input.fullName?.trim() ?? '',
    designation: input.designation ?? 'Member',
    phone: input.phone?.trim() ?? '',
    idNumber: input.idNumber?.trim() || undefined,
  };
  return [...members, row];
}

/** Remove a member and renumber the serials so the roster stays 1..n. */
export function removeMember(members: CharterMember[], id: string): CharterMember[] {
  return members
    .filter((m) => m.id !== id)
    .map((m, i) => ({ ...m, serial: i + 1 }));
}

/** The officials only, in canonical designation order. */
export function officials(members: CharterMember[]): CharterMember[] {
  const rank = new Map(OFFICIAL_DESIGNATIONS.map((d, i) => [d, i]));
  return members
    .filter((m) => isOfficial(m.designation))
    .sort((a, b) => (rank.get(a.designation)! - rank.get(b.designation)!));
}

/** Basic Kenyan/E.African phone normalisation for display (2547XXXXXXXX). */
export function normalisePhone(raw: string, countryCode = 'KE'): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (countryCode === 'KE') {
    if (/^0\d{9}$/.test(digits)) return '254' + digits.slice(1);
    if (/^\+?254\d{9}$/.test(digits)) return digits.replace('+', '');
  }
  return digits.replace('+', '');
}

export interface CharterField {
  key: string;
  label: string;
  present: boolean;
  /** A plain-language nudge shown when the field is empty (self-directing form). */
  prompt: string;
  weight: number;
}

/**
 * Score how complete a charter is and surface the next thing to fill.
 * Drives the "self-directing" form: the app always tells the user what to do next.
 */
export function charterCompleteness(c: GroupCharter): {
  pct: number;
  fields: CharterField[];
  missing: CharterField[];
  readyForDocument: boolean;
  nextPrompt?: string;
} {
  const hasConstitution = c.constitution.trim().length >= 40 || !!c.constitutionFileUrl;
  const fields: CharterField[] = [
    { key: 'name', label: 'Group name', present: c.name.trim().length > 1, prompt: 'Enter the full name of your group.', weight: 2 },
    { key: 'venue', label: 'Meeting place', present: c.schedule.venue.trim().length > 1, prompt: 'Where do you meet? e.g. "At Zawadi Hotel".', weight: 1 },
    { key: 'days', label: 'Meeting day(s)', present: c.schedule.days.length > 0, prompt: 'Which day(s) do you meet? e.g. Friday.', weight: 1 },
    { key: 'time', label: 'Meeting time', present: c.schedule.startTime.trim().length > 0, prompt: 'What time? e.g. 4:00 PM to 6:00 PM.', weight: 1 },
    { key: 'members', label: 'Members & officials', present: c.members.filter((m) => m.fullName.trim()).length >= 3, prompt: 'Add at least three members with their roles and phone numbers.', weight: 2 },
    { key: 'officials', label: 'Officials named', present: officials(c.members).length >= 2, prompt: 'Name your officials — at least a Chairperson and a Treasurer or Secretary.', weight: 1 },
    { key: 'constitution', label: 'Constitution & by-laws', present: hasConstitution, prompt: 'Write or upload your constitution and by-laws.', weight: 2 },
    { key: 'motto', label: 'Motto', present: c.motto.trim().length > 1, prompt: 'Add your group motto — one short line.', weight: 1 },
    { key: 'mission', label: 'Mission', present: c.mission.trim().length > 5, prompt: 'Write your mission — what the group exists to do.', weight: 1 },
    { key: 'vision', label: 'Vision', present: c.vision.trim().length > 5, prompt: 'Write your vision — where the group is going.', weight: 1 },
    { key: 'values', label: 'Core values', present: c.coreValues.filter((v) => v.trim()).length >= 1, prompt: 'List your core values, e.g. Integrity, Unity, Diligence.', weight: 1 },
  ];
  const total = fields.reduce((s, f) => s + f.weight, 0);
  const got = fields.filter((f) => f.present).reduce((s, f) => s + f.weight, 0);
  const missing = fields.filter((f) => !f.present);
  // Bank-ready document needs identity, roster, officials and the governing documents.
  const requiredKeys = ['name', 'venue', 'days', 'time', 'members', 'officials', 'constitution'];
  const readyForDocument = requiredKeys.every((k) => fields.find((f) => f.key === k)?.present);
  return {
    pct: Math.round((got / total) * 100),
    fields,
    missing,
    readyForDocument,
    nextPrompt: missing[0]?.prompt,
  };
}

// ───────────────────────────── Who keeps the member list (owner 28/11/26) ─────────────────────────────

/**
 * The register of members is kept by the secretary (chama and co-operative
 * rules: the secretary keeps the records and strikes names off the register),
 * with the chairperson able to stand in. The treasurer keeps the money records
 * but does not add, change or remove members. Enforced on the server.
 */
export const ROSTER_ROLES: readonly string[] = ['SECRETARY', 'CHAIRMAN'];

export function canEditRoster(role: string | null | undefined): boolean {
  return !!role && ROSTER_ROLES.includes(role.trim().toUpperCase());
}

/** Rows with neither a name nor a phone are left out (an empty "Add member" row is not a member). */
export function cleanRoster(members: CharterMember[]): CharterMember[] {
  return members
    .filter((m) => (m.fullName ?? '').trim() || (m.phone ?? '').trim())
    .map((m, i) => ({ ...m, fullName: (m.fullName ?? '').trim(), phone: (m.phone ?? '').trim(), serial: i + 1 }));
}

const rosterKey = (m: CharterMember) => `${m.id}|${m.fullName.trim().toLowerCase()}|${m.designation}|${m.phone.replace(/\D/g, '')}`;

/** True when two rosters list the same people with the same roles and phones. */
export function sameRoster(a: CharterMember[], b: CharterMember[]): boolean {
  const x = cleanRoster(a).map(rosterKey).sort();
  const y = cleanRoster(b).map(rosterKey).sort();
  return x.length === y.length && x.every((k, i) => k === y[i]);
}

/** A plain reason a new or changed member cannot be saved, or null. */
export function rosterMemberProblem(m: { fullName: string; phone: string }, others: CharterMember[]): string | null {
  const name = m.fullName.trim();
  if (name.length < 2) return 'Write the member’s full name.';
  const digits = m.phone.replace(/\D/g, '');
  if (digits.length < 9) return 'Write the member’s full phone number. It is how they sign in.';
  const key = digits.slice(-9);
  if (others.some((o) => o.phone.replace(/\D/g, '').slice(-9) === key)) return 'This phone number is already on the list.';
  return null;
}

const key9 = (phone: string) => phone.replace(/\D/g, '').slice(-9);

/**
 * Who leaves and who stays when the list changes (owner 28/11/26): phone keys
 * (last nine digits) on the old list but not the new one have left the group;
 * every key on the new list has (or regains) access.
 */
export function rosterAccessChanges(before: CharterMember[], after: CharterMember[]): { left: string[]; onList: string[] } {
  const now = new Set(cleanRoster(after).map((m) => key9(m.phone)).filter((k) => k.length === 9));
  const was = cleanRoster(before).map((m) => key9(m.phone)).filter((k) => k.length === 9);
  return { left: [...new Set(was.filter((k) => !now.has(k)))], onList: [...now] };
}
