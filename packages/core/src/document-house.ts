/**
 * One house, four rooms (owner 20/11/26).
 *
 * A group writes its papers ONCE — in its group records (pillar 1) or its
 * business books (pillar 3). Every other section of Stawi reads the same
 * papers instead of asking for them again: starting a business (pillar 2),
 * showing records to a bank or fund (pillar 3), or starting savings and credit
 * (pillar 4). Nobody is sent back to fetch a document Stawi already holds.
 *
 * This module lists the papers a group holds, says how complete each one is,
 * and checks them against what a purpose needs. It reads; it never writes,
 * never moves money and never approves anything.
 *
 * Honest limit: inside Stawi the papers pass from section to section as they
 * are. An outside office (a registrar, a bank) may still ask for signatures or
 * a stamp on the printed pack — the pack leaves room for them.
 *
 * Pure: no I/O.
 */

import type { GroupCharter } from './charter';
import type { Meeting } from './minutes';
import type { MonthEndStatement } from './statement';

export type HouseLang = 'en' | 'sw';
type Words = Record<HouseLang, string>;

export type HouseDocId =
  | 'registration'
  | 'officials'
  | 'rules'
  | 'member_list'
  | 'member_ids'
  | 'minutes'
  | 'resolution'
  | 'money_record'
  | 'statements'
  | 'business_profile'
  | 'business_books'
  | 'stock_list';

/** The room a paper is written in. */
export type HouseRoom = 1 | 3;
export type HouseState = 'ready' | 'part' | 'missing';
/** Where the group goes to finish a paper. */
export type HousePlace = 'charter' | 'minutes' | 'statement' | 'books';

export interface HouseDocument {
  id: HouseDocId;
  room: HouseRoom;
  name: Words;
  state: HouseState;
  /** How much the group holds (meetings, months, members…). */
  count: number;
  /** What the group holds today, in plain words. */
  have: Words;
  /** What to do when it is not complete. */
  fix: Words;
  place: HousePlace;
  /** First and last date the paper covers (ISO), when it has dates. */
  from?: string;
  to?: string;
}

export interface HouseBusiness {
  name: string;
  /** ISO dates of the entries written in the books. */
  entryDates: string[];
  stockItems: number;
}

export interface HouseInput {
  charter: GroupCharter;
  meetings: readonly Meeting[];
  business?: HouseBusiness | null;
}

const d = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;
const span = (from?: string, to?: string): Words =>
  from && to ? { en: ` (${d(from)} to ${d(to)})`, sw: ` (${d(from)} hadi ${d(to)})` } : { en: '', sw: '' };
const validDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s);

function doc(
  id: HouseDocId, room: HouseRoom, place: HousePlace, state: HouseState, count: number,
  name: Words, have: Words, fix: Words, from?: string, to?: string,
): HouseDocument {
  return { id, room, place, state, count, name, have, fix, from, to };
}

/**
 * What the group's meetings add up to — worked out from the meetings
 * themselves, or from the month-end statements made from them.
 */
export interface HouseFacts {
  /** Posted meetings on record. */
  sittings: number;
  /** Posted meetings (or months) with a written decision. */
  withDecision: number;
  /** Posted meetings (or months) with contributions written. */
  withMoney: number;
  /** Months that have a statement. */
  months: number;
  first?: string;
  last?: string;
  moneyFirst?: string;
  moneyLast?: string;
}

export function houseFactsFromMeetings(meetings: readonly Meeting[]): HouseFacts {
  const posted = meetings.filter((m) => m.status === 'POSTED' && validDate(m.date)).sort((a, b) => a.date.localeCompare(b.date));
  const withMoney = posted.filter((m) => (m.tableBanking?.contributions ?? []).length > 0);
  return {
    sittings: posted.length,
    withDecision: posted.filter((m) => m.agendas.some((a) => a.resolution?.trim())).length,
    withMoney: withMoney.length,
    months: new Set(posted.map((m) => m.date.slice(0, 7))).size,
    first: posted[0]?.date.slice(0, 10),
    last: posted[posted.length - 1]?.date.slice(0, 10),
    moneyFirst: withMoney[0]?.date.slice(0, 10),
    moneyLast: withMoney[withMoney.length - 1]?.date.slice(0, 10),
  };
}

/** The same facts from month-end statements (each is built from posted meetings only). */
export function houseFactsFromStatements(statements: readonly MonthEndStatement[]): HouseFacts {
  return {
    sittings: statements.reduce((n, st) => n + Math.max(0, Math.round(st.meetingsHeld ?? 0)), 0),
    withDecision: statements.filter((st) => (st.resolutions?.length ?? 0) > 0).length,
    withMoney: statements.filter((st) => (st.finance?.contributionsCents ?? 0) > 0).length,
    months: statements.length,
  };
}

/** Every paper the group holds today, and how complete each one is. */
export function buildHouse(input: HouseInput): HouseDocument[] {
  return buildHouseFromFacts(input.charter, houseFactsFromMeetings(input.meetings), input.business);
}

/** The same list of papers, from facts already worked out. */
export function buildHouseFromFacts(c: GroupCharter, facts: HouseFacts, business?: HouseBusiness | null): HouseDocument[] {
  const members = c.members ?? [];
  const { first, last } = facts;
  const when = span(first, last);

  const has = (...names: string[]) => members.some((m) => names.includes(m.designation));
  const posts = [has('Chairperson'), has('Secretary', 'Assistant Secretary'), has('Treasurer', 'Assistant Treasurer')].filter(Boolean).length;
  const withId = members.filter((m) => (m.idNumber ?? '').trim()).length;
  const withPhone = members.filter((m) => (m.phone ?? '').trim()).length;
  const rules = !!(c.constitution?.trim() || c.constitutionFileUrl);
  const reg = (c.registeredNumber ?? '').trim();
  const resolutions = facts.withDecision;
  const months = facts.months;

  const biz = business ?? null;
  const entryDates = (biz?.entryDates ?? []).filter(validDate).map((x) => x.slice(0, 10)).sort();
  const bizMonths = new Set(entryDates.map((x) => x.slice(0, 7))).size;
  const bizWhen = span(entryDates[0], entryDates[entryDates.length - 1]);

  return [
    doc('registration', 1, 'charter', reg ? 'ready' : 'missing', reg ? 1 : 0,
      { en: 'Registration number', sw: 'Namba ya usajili' },
      reg ? { en: `Registered: ${reg}`, sw: `Imesajiliwa: ${reg}` } : { en: 'Not written yet', sw: 'Bado haijaandikwa' },
      { en: 'Write the registration number on the group page once the group is registered.', sw: 'Andika namba ya usajili kwenye ukurasa wa kikundi baada ya kusajiliwa.' }),
    doc('officials', 1, 'charter', posts === 3 ? 'ready' : posts > 0 ? 'part' : 'missing', posts,
      { en: 'List of officials', sw: 'Orodha ya viongozi' },
      { en: `${posts} of 3 named (Chairperson, Secretary, Treasurer)`, sw: `${posts} kati ya 3 wametajwa (Mwenyekiti, Katibu, Mweka hazina)` },
      { en: 'Name a Chairperson, a Secretary and a Treasurer in the member list.', sw: 'Taja Mwenyekiti, Katibu na Mweka hazina kwenye orodha ya wanachama.' }),
    doc('rules', 1, 'charter', rules ? 'ready' : 'missing', rules ? 1 : 0,
      { en: 'Group rules', sw: 'Sheria za kikundi' },
      rules ? { en: 'Written and kept', sw: 'Zimeandikwa na kuhifadhiwa' } : { en: 'Not written yet', sw: 'Bado hazijaandikwa' },
      { en: 'Write the group rules, or add a photo of them.', sw: 'Andikeni sheria za kikundi, au ongezeni picha yake.' }),
    doc('member_list', 1, 'charter', members.length === 0 ? 'missing' : withPhone === members.length ? 'ready' : 'part', members.length,
      { en: 'Member list', sw: 'Orodha ya wanachama' },
      { en: `${members.length} members, ${withPhone} with a phone number`, sw: `Wanachama ${members.length}, ${withPhone} wana namba ya simu` },
      { en: 'Add every member with a phone number.', sw: 'Ongeza kila mwanachama pamoja na namba ya simu.' }),
    doc('member_ids', 1, 'charter', members.length === 0 || withId === 0 ? 'missing' : withId === members.length ? 'ready' : 'part', withId,
      { en: 'Members’ ID numbers', sw: 'Namba za vitambulisho vya wanachama' },
      { en: `${withId} of ${members.length} members have an ID number`, sw: `Wanachama ${withId} kati ya ${members.length} wana namba ya kitambulisho` },
      { en: 'Add the ID number of each member in the member list.', sw: 'Ongeza namba ya kitambulisho ya kila mwanachama kwenye orodha.' }),
    doc('minutes', 1, 'minutes', facts.sittings === 0 ? 'missing' : 'ready', facts.sittings,
      { en: 'Meeting minutes', sw: 'Kumbukumbu za mikutano' },
      { en: `${facts.sittings} meetings on record${when.en}`, sw: `Mikutano ${facts.sittings} imerekodiwa${when.sw}` },
      { en: 'Record a meeting and post its minutes.', sw: 'Rekodi mkutano na uchapishe kumbukumbu zake.' }, first, last),
    doc('resolution', 1, 'minutes', resolutions > 0 ? 'ready' : 'missing', resolutions,
      { en: 'Decisions the group agreed', sw: 'Maamuzi ya kikundi' },
      { en: `${resolutions} meetings with a written decision`, sw: `Mikutano ${resolutions} yenye uamuzi ulioandikwa` },
      { en: 'Write what the group agreed in the minutes, with who proposed and who seconded.', sw: 'Andika kile kikundi kilikubaliana kwenye kumbukumbu, pamoja na aliyependekeza na aliyeunga mkono.' }),
    doc('money_record', 1, 'minutes', facts.withMoney === 0 ? 'missing' : 'ready', facts.withMoney,
      { en: 'Record of contributions', sw: 'Rekodi ya michango' },
      { en: `Contributions written at ${facts.withMoney} meetings`, sw: `Michango imeandikwa katika mikutano ${facts.withMoney}` },
      { en: 'Write each member’s contribution at every meeting.', sw: 'Andika mchango wa kila mwanachama katika kila mkutano.' },
      facts.moneyFirst, facts.moneyLast),
    doc('statements', 1, 'statement', months === 0 ? 'missing' : 'ready', months,
      { en: 'Monthly money statements', sw: 'Taarifa za fedha za kila mwezi' },
      { en: `${months} months can be shown${when.en}`, sw: `Miezi ${months} inaweza kuonyeshwa${when.sw}` },
      { en: 'Post your meetings; a statement is made for every month that has one.', sw: 'Chapisheni mikutano yenu; taarifa hutengenezwa kwa kila mwezi wenye mkutano.' }, first, last),
    doc('business_profile', 3, 'books', biz?.name?.trim() ? 'ready' : 'missing', biz ? 1 : 0,
      { en: 'Business name and details', sw: 'Jina na maelezo ya biashara' },
      biz?.name?.trim() ? { en: biz.name.trim(), sw: biz.name.trim() } : { en: 'No business in the books yet', sw: 'Bado hakuna biashara kwenye vitabu' },
      { en: 'Open the books and add the group’s business.', sw: 'Fungua vitabu na uongeze biashara ya kikundi.' }),
    doc('business_books', 3, 'books', bizMonths === 0 ? 'missing' : 'ready', bizMonths,
      { en: 'Business sales and costs', sw: 'Mauzo na gharama za biashara' },
      { en: `${bizMonths} months of sales and costs${bizWhen.en}`, sw: `Miezi ${bizMonths} ya mauzo na gharama${bizWhen.sw}` },
      { en: 'Write each day’s sales and costs in the books.', sw: 'Andika mauzo na gharama za kila siku kwenye vitabu.' },
      entryDates[0], entryDates[entryDates.length - 1]),
    doc('stock_list', 3, 'books', (biz?.stockItems ?? 0) > 0 ? 'ready' : 'missing', biz?.stockItems ?? 0,
      { en: 'Stock list', sw: 'Orodha ya bidhaa' },
      { en: `${biz?.stockItems ?? 0} items listed`, sw: `Bidhaa ${biz?.stockItems ?? 0} zimeorodheshwa` },
      { en: 'List what the business keeps in stock.', sw: 'Orodhesha bidhaa ambazo biashara inaweka.' }),
  ];
}

// ── What each purpose needs ──────────────────────────────────────────────

export type HousePurposeId = 'register' | 'bank_account' | 'start_business' | 'funding' | 'savings_credit';

export interface HouseNeed {
  doc: HouseDocId;
  /** 'must' counts toward ready; 'helps' makes the case stronger. */
  kind: 'must' | 'helps';
  /** The paper must hold at least this many (meetings, months…). */
  atLeast?: number;
}

export interface HousePurpose {
  id: HousePurposeId;
  /** The section the papers go to. */
  pillar: 1 | 2 | 3 | 4;
  icon: string;
  name: Words;
  /** Shown only when savings and credit is switched on. */
  needsSavingsCredit?: boolean;
  needs: HouseNeed[];
}

/**
 * Kenya first (Department of Social Development group registration; what banks
 * and public funds ask of a group). Indicative: an office may ask for more.
 */
export const HOUSE_PURPOSES: HousePurpose[] = [
  {
    id: 'register', pillar: 1, icon: '📜',
    name: { en: 'Register the group', sw: 'Kusajili kikundi' },
    needs: [
      { doc: 'officials', kind: 'must' }, { doc: 'rules', kind: 'must' }, { doc: 'member_list', kind: 'must' },
      { doc: 'member_ids', kind: 'must' }, { doc: 'minutes', kind: 'must', atLeast: 1 }, { doc: 'resolution', kind: 'helps' },
    ],
  },
  {
    id: 'bank_account', pillar: 1, icon: '🏦',
    name: { en: 'Open a group bank account', sw: 'Kufungua akaunti ya benki ya kikundi' },
    needs: [
      { doc: 'registration', kind: 'must' }, { doc: 'officials', kind: 'must' }, { doc: 'rules', kind: 'must' },
      { doc: 'resolution', kind: 'must' }, { doc: 'member_ids', kind: 'must' }, { doc: 'minutes', kind: 'helps', atLeast: 3 },
    ],
  },
  {
    id: 'start_business', pillar: 2, icon: '💡',
    name: { en: 'Start a group business', sw: 'Kuanzisha biashara ya kikundi' },
    needs: [
      { doc: 'officials', kind: 'must' }, { doc: 'resolution', kind: 'must' }, { doc: 'money_record', kind: 'must', atLeast: 3 },
      { doc: 'statements', kind: 'must', atLeast: 3 }, { doc: 'rules', kind: 'helps' }, { doc: 'registration', kind: 'helps' },
    ],
  },
  {
    id: 'funding', pillar: 3, icon: '📈',
    name: { en: 'Show our records to a bank or a fund', sw: 'Kuonyesha rekodi zetu kwa benki au mfuko' },
    needs: [
      { doc: 'registration', kind: 'must' }, { doc: 'officials', kind: 'must' }, { doc: 'minutes', kind: 'must', atLeast: 6 },
      { doc: 'statements', kind: 'must', atLeast: 6 }, { doc: 'business_profile', kind: 'must' },
      { doc: 'business_books', kind: 'must', atLeast: 3 }, { doc: 'member_ids', kind: 'helps' }, { doc: 'stock_list', kind: 'helps' },
    ],
  },
  {
    id: 'savings_credit', pillar: 4, icon: '🤝', needsSavingsCredit: true,
    name: { en: 'Start savings and credit', sw: 'Kuanza akiba na mikopo' },
    needs: [
      { doc: 'registration', kind: 'must' }, { doc: 'officials', kind: 'must' }, { doc: 'rules', kind: 'must' },
      { doc: 'resolution', kind: 'must' }, { doc: 'minutes', kind: 'must', atLeast: 3 }, { doc: 'statements', kind: 'must', atLeast: 3 },
      { doc: 'member_ids', kind: 'must' }, { doc: 'business_books', kind: 'helps', atLeast: 3 },
    ],
  },
];

export function housePurposes(opts: { savingsCredit: boolean }): HousePurpose[] {
  return HOUSE_PURPOSES.filter((p) => !p.needsSavingsCredit || opts.savingsCredit);
}

export interface HouseLine {
  doc: HouseDocument;
  kind: HouseNeed['kind'];
  atLeast?: number;
  /** Ready for THIS purpose (complete, and enough of it). */
  ok: boolean;
  /** When there is some but not enough: how many more are needed. */
  shortBy: number;
}

export interface HouseCheck {
  purpose: HousePurpose;
  lines: HouseLine[];
  mustReady: number;
  mustTotal: number;
  /** 0–100, from the papers that are a must. */
  pct: number;
  complete: boolean;
}

/** Check the group's papers against one purpose. Nothing is asked for twice. */
export function checkPurpose(house: readonly HouseDocument[], purpose: HousePurpose): HouseCheck {
  const byId = new Map(house.map((x) => [x.id, x]));
  const lines: HouseLine[] = [];
  for (const need of purpose.needs) {
    const paper = byId.get(need.doc);
    if (!paper) continue;
    const enough = need.atLeast === undefined || paper.count >= need.atLeast;
    lines.push({
      doc: paper,
      kind: need.kind,
      atLeast: need.atLeast,
      ok: paper.state === 'ready' && enough,
      shortBy: need.atLeast !== undefined && paper.count < need.atLeast ? need.atLeast - paper.count : 0,
    });
  }
  const musts = lines.filter((l) => l.kind === 'must');
  const mustReady = musts.filter((l) => l.ok).length;
  return {
    purpose,
    lines,
    mustReady,
    mustTotal: musts.length,
    pct: musts.length === 0 ? 100 : Math.round((mustReady / musts.length) * 100),
    complete: mustReady === musts.length,
  };
}

/** All purposes at once, for the card. */
export function checkHouse(house: readonly HouseDocument[], opts: { savingsCredit: boolean }): HouseCheck[] {
  return housePurposes(opts).map((p) => checkPurpose(house, p));
}

const ROOM_NAME: Record<HouseRoom, Words> = {
  1: { en: 'Group records', sw: 'Rekodi za kikundi' },
  3: { en: 'Business books', sw: 'Vitabu vya biashara' },
};

export function houseRoomName(room: HouseRoom, lang: HouseLang = 'en'): string {
  return ROOM_NAME[room][lang];
}
