/**
 * Use only what you need (owner 20/11/26).
 *
 * Stawi is one house with separate rooms, and every group or business chooses
 * which rooms it opens. A group that only wants well-kept meetings switches the
 * money off. A group that does not want its officials' posts shown switches
 * that off. A butcher, a shop, a hotel or a pub opens the books alone, with no
 * group at all. Nobody has to save or borrow with Stawi to use the rest.
 *
 * The group's officials choose; the choice is stored with the group and the
 * server applies it. Pure: no I/O.
 */

import type { EscalationRuleId } from './escalation';

export type ModuleId = 'meetings' | 'agendas' | 'officials' | 'money' | 'messages' | 'ideas' | 'books' | 'savings_credit';
export type GroupModules = Record<ModuleId, boolean>;
type Words = { en: string; sw: string };

export interface ModuleInfo {
  id: ModuleId;
  icon: string;
  pillar: 1 | 2 | 3 | 4;
  name: Words;
  /** What switching it ON gives, in plain words. */
  on: Words;
  /** What switching it OFF does — said plainly so nobody is surprised. */
  off: Words;
  /** Works only while this other switch is on. */
  needs?: ModuleId;
  /** Offered only where savings and credit is available at all. */
  platformSavingsCredit?: boolean;
}

export const MODULES: ModuleInfo[] = [
  {
    id: 'meetings', icon: '📝', pillar: 1,
    name: { en: 'Meetings and minutes', sw: 'Mikutano na kumbukumbu' },
    on: { en: 'Record each meeting and get clear, formal minutes.', sw: 'Rekodi kila mkutano na upate kumbukumbu rasmi zilizo wazi.' },
    off: { en: 'The meetings and documents tabs are hidden. What you already wrote is kept.', sw: 'Sehemu za mikutano na nyaraka zinafichwa. Mlichoandika kinabaki.' },
  },
  {
    id: 'agendas', icon: '🗒️', pillar: 1, needs: 'meetings',
    name: { en: 'Agenda items', sw: 'Ajenda' },
    on: { en: 'Write what was discussed and what was agreed, item by item.', sw: 'Andika kilichojadiliwa na kilichokubaliwa, jambo kwa jambo.' },
    off: { en: 'Minutes keep attendance and other business only. Agenda items are not asked for.', sw: 'Kumbukumbu zinabaki na mahudhurio na mengineyo tu. Ajenda haziulizwi.' },
  },
  {
    id: 'officials', icon: '🪪', pillar: 1,
    name: { en: 'Show officials’ posts', sw: 'Onyesha vyeo vya viongozi' },
    on: { en: 'Members see who is Chairperson, Secretary and Treasurer.', sw: 'Wanachama wanaona nani ni Mwenyekiti, Katibu na Mweka hazina.' },
    off: { en: 'Members see the member list without posts. Officials still see them, and minutes still name who chaired.', sw: 'Wanachama wanaona orodha bila vyeo. Viongozi bado wanaviona, na kumbukumbu bado zinamtaja aliyeongoza.' },
  },
  {
    id: 'money', icon: '💰', pillar: 1,
    name: { en: 'Contributions and money statements', sw: 'Michango na taarifa za fedha' },
    on: { en: 'Write contributions, fines and payouts, and get statements by day, week and month.', sw: 'Andika michango, faini na malipo, na upate taarifa kwa siku, wiki na mwezi.' },
    off: { en: 'No money is asked for or shown. Good for a group that keeps its money elsewhere.', sw: 'Hakuna pesa inayoulizwa wala kuonyeshwa. Inafaa kikundi kinachoweka pesa zake kwingine.' },
  },
  {
    id: 'messages', icon: '💬', pillar: 1,
    name: { en: 'Messages', sw: 'Ujumbe' },
    on: { en: 'Members and officials write to each other inside Stawi, and members can ask the officials a question.', sw: 'Wanachama na viongozi wanaandikiana ndani ya Stawi, na wanachama wanaweza kuwauliza viongozi swali.' },
    off: { en: 'The Messages tab is hidden. Messages already written are kept.', sw: 'Sehemu ya Ujumbe inafichwa. Ujumbe ulioandikwa unabaki.' },
  },
  {
    id: 'ideas', icon: '💡', pillar: 2,
    name: { en: 'Business ideas', sw: 'Mawazo ya biashara' },
    on: { en: 'Match the money you have to a business you can run.', sw: 'Linganisha pesa mlizonazo na biashara mnayoweza kuendesha.' },
    off: { en: 'The Ideas tab is hidden.', sw: 'Sehemu ya Mawazo inafichwa.' },
  },
  {
    id: 'books', icon: '📒', pillar: 3,
    name: { en: 'Business books', sw: 'Vitabu vya biashara' },
    on: { en: 'Sales, costs, stock and tax estimates for a shop, butchery, hotel, pub or any business.', sw: 'Mauzo, gharama, bidhaa na makadirio ya kodi kwa duka, bucha, hoteli, baa au biashara yoyote.' },
    off: { en: 'The Books tab is hidden. What you already wrote is kept.', sw: 'Sehemu ya Hesabu inafichwa. Mlichoandika kinabaki.' },
  },
  {
    id: 'savings_credit', icon: '🤝', pillar: 4, platformSavingsCredit: true,
    name: { en: 'Savings and credit', sw: 'Akiba na mikopo' },
    on: { en: 'Save and borrow through Stawi, using the records you already keep here.', sw: 'Weka akiba na ukope kupitia Stawi, kwa kutumia rekodi mnazoweka hapa.' },
    off: { en: 'Nothing about savings and credit is shown. Keep your bank or SACCO; everything else works the same.', sw: 'Hakuna cha akiba na mikopo kinachoonyeshwa. Baki na benki au SACCO yenu; mengine yote yanafanya kazi vilevile.' },
  },
];

export const MODULE_IDS: ModuleId[] = MODULES.map((m) => m.id);

// ── Ways to start ────────────────────────────────────────────────────────

export type StartChoiceId = 'everything' | 'organise' | 'books_only';

export interface StartChoice {
  id: StartChoiceId;
  icon: string;
  name: Words;
  about: Words;
  /** The kind of account it opens. */
  type: 'CHAMA' | 'BUSINESS';
  modules: GroupModules;
}

const all = (on: boolean): GroupModules => ({ meetings: on, agendas: on, officials: on, money: on, messages: on, ideas: on, books: on, savings_credit: on });

export const START_CHOICES: StartChoice[] = [
  {
    id: 'everything', icon: '👥', type: 'CHAMA',
    name: { en: 'A group — meetings, money and more', sw: 'Kikundi — mikutano, pesa na zaidi' },
    about: { en: 'Members, minutes, contributions, statements, business ideas and books. Switch off what you do not need later.', sw: 'Wanachama, kumbukumbu, michango, taarifa, mawazo ya biashara na vitabu. Zima msichohitaji baadaye.' },
    modules: all(true),
  },
  {
    id: 'organise', icon: '📝', type: 'CHAMA',
    name: { en: 'A group — meetings and minutes only', sw: 'Kikundi — mikutano na kumbukumbu tu' },
    about: { en: 'Agendas, attendance and formal minutes. No money is asked for. Keep your bank or SACCO as it is.', sw: 'Ajenda, mahudhurio na kumbukumbu rasmi. Hakuna pesa inayoulizwa. Bakini na benki au SACCO yenu.' },
    modules: { ...all(false), meetings: true, agendas: true, officials: true, messages: true },
  },
  {
    id: 'books_only', icon: '📒', type: 'BUSINESS',
    name: { en: 'A business — the books only', sw: 'Biashara — vitabu tu' },
    about: { en: 'For a shop, butchery, bookshop, hotel, pub or guest house. No group is needed.', sw: 'Kwa duka, bucha, duka la vitabu, hoteli, baa au nyumba ya wageni. Hakuna kikundi kinachohitajika.' },
    modules: { ...all(false), books: true },
  },
];

export function startChoice(id: string | null | undefined): StartChoice {
  return START_CHOICES.find((c) => c.id === id) ?? START_CHOICES[0]!;
}

/** What a group or business has when nothing was ever chosen. */
export function defaultModules(groupType?: string | null): GroupModules {
  const business = (groupType ?? '').toUpperCase() === 'BUSINESS';
  return business ? { ...START_CHOICES[2]!.modules } : all(true);
}

/** Keep only known switches with true/false values; anything else is dropped. */
export function sanitizeModules(input: unknown): Partial<GroupModules> {
  const out: Partial<GroupModules> = {};
  if (!input || typeof input !== 'object') return out;
  for (const id of MODULE_IDS) {
    const v = (input as Record<string, unknown>)[id];
    if (typeof v === 'boolean') out[id] = v;
  }
  return out;
}

/**
 * The switches in force: the saved choice over the default, with two rules —
 * a switch that needs another is off while that one is off, and savings and
 * credit is off wherever it is not available at all.
 */
export function resolveModules(saved: unknown, opts: { groupType?: string | null; savingsCredit?: boolean } = {}): GroupModules {
  const m: GroupModules = { ...defaultModules(opts.groupType), ...sanitizeModules(saved) };
  for (const info of MODULES) if (info.needs && !m[info.needs]) m[info.id] = false;
  if (!opts.savingsCredit) m.savings_credit = false;
  return m;
}

/** The switches to offer on the settings card. */
export function offeredModules(opts: { savingsCredit: boolean }): ModuleInfo[] {
  return MODULES.filter((m) => !m.platformSavingsCredit || opts.savingsCredit);
}

/** A stalled-work watch is only raised for a room the group has open. */
const WATCH_NEEDS: Record<EscalationRuleId, ModuleId | null> = {
  officials_missing: 'officials',
  rules_missing: null,
  meeting_overdue: 'meetings',
  minutes_not_posted: 'meetings',
  contributions_not_recorded: 'money',
  member_behind: 'money',
  member_absent: 'meetings',
};

export function watchAllowed(rule: EscalationRuleId, modules: GroupModules): boolean {
  const needs = WATCH_NEEDS[rule];
  return needs === null || modules[needs];
}

export type GroupTabKey = 'charter' | 'minutes' | 'documents' | 'statement' | 'sacco';

/** The record tabs a group shows. The member list is always there. */
export function groupTabsFor(modules: GroupModules): GroupTabKey[] {
  const tabs: GroupTabKey[] = ['charter'];
  if (modules.meetings) tabs.push('minutes', 'documents');
  if (modules.money) tabs.push('statement');
  if (modules.savings_credit) tabs.push('sacco');
  return tabs;
}

/** True when the account is a business with no group records at all. */
export function booksOnly(modules: GroupModules): boolean {
  return modules.books && !modules.meetings && !modules.money;
}

// ── An open door: honest welcome notes ───────────────────────────────────

export interface WelcomeNote {
  id: 'organise' | 'keep_bank' | 'business' | 'moving';
  icon: string;
  pillar: 1 | 3 | 4;
  title: Words;
  body: Words;
  cta: Words;
  /** Which way to start it opens. */
  start: StartChoiceId;
  /** Shown only where savings and credit is available. */
  needsSavingsCredit?: boolean;
}

/**
 * Every line here must stay true of the product: no pressure, no promise Stawi
 * does not keep. (Owner 20/11/26: warm and welcoming; standing rule 18: verifiable.)
 */
export const WELCOME_NOTES: WelcomeNote[] = [
  {
    id: 'organise', icon: '📝', pillar: 1, start: 'organise',
    title: { en: 'Only want well-run meetings?', sw: 'Mnataka mikutano iliyopangika tu?' },
    body: {
      en: 'You are most welcome. Use the agenda and minutes on their own and leave the rest switched off. Your group decides what it opens.',
      sw: 'Karibuni sana. Tumieni ajenda na kumbukumbu peke yake na mengine yabaki yamezimwa. Kikundi chenu ndicho kinaamua kinachofungua.',
    },
    cta: { en: 'Start with meetings only', sw: 'Anza na mikutano tu' },
  },
  {
    id: 'keep_bank', icon: '🏦', pillar: 1, start: 'organise',
    title: { en: 'Happy with your bank or SACCO?', sw: 'Mnaridhika na benki au SACCO yenu?' },
    body: {
      en: 'Stay right where you are. You do not have to move your money to use Stawi. Keep it where you trust it, and keep your records in order here.',
      sw: 'Bakini hapo hapo. Si lazima kuhamisha pesa zenu ili kutumia Stawi. Ziwekeni mnapopaamini, na rekodi zenu zikae sawa hapa.',
    },
    cta: { en: 'Keep our bank, organise our records', sw: 'Tubaki na benki, tupange rekodi' },
  },
  {
    id: 'business', icon: '📒', pillar: 3, start: 'books_only',
    title: { en: 'Run a shop, a butchery, a hotel or a pub?', sw: 'Una duka, bucha, hoteli au baa?' },
    body: {
      en: 'You do not need to belong to a group. Open the books on their own: write your sales and costs, watch your stock, and see what is left at the end of the day, the week and the month.',
      sw: 'Si lazima uwe kwenye kikundi. Fungua vitabu peke yake: andika mauzo na gharama, fuatilia bidhaa, na uone kinachobaki mwisho wa siku, wiki na mwezi.',
    },
    cta: { en: 'Open the books for my business', sw: 'Fungua vitabu vya biashara yangu' },
  },
  {
    id: 'moving', icon: '🤝', pillar: 4, start: 'everything', needsSavingsCredit: true,
    title: { en: 'Thinking of bringing your savings here?', sw: 'Mnafikiria kuleta akiba yenu hapa?' },
    body: {
      en: 'The door is open, in your own time. The minutes and statements you already keep in Stawi count from the first day, so you are not asked for the same papers again.',
      sw: 'Mlango uko wazi, kwa wakati wenu. Kumbukumbu na taarifa mnazoweka tayari ndani ya Stawi zinahesabiwa tangu siku ya kwanza, kwa hiyo hamuulizwi karatasi zilezile tena.',
    },
    cta: { en: 'See what we would need', sw: 'Ona tutakachohitaji' },
  },
];

export function welcomeNotes(opts: { savingsCredit: boolean }): WelcomeNote[] {
  return WELCOME_NOTES.filter((n) => !n.needsSavingsCredit || opts.savingsCredit);
}

/** How many groups or businesses one person may start themselves. */
export const MAX_SELF_STARTED = 3;
