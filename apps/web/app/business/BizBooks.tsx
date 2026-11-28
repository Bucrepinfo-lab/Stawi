'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BIZ_LEVELS, bizBrief, bizStatement, moneyOwed, previousRange, type BizKind, type BizLevel } from '@stawi/core';
import { FeedbackBanner, type Feedback } from '@/components/FeedbackBanner';
import { LiveRefresh } from '@/components/LiveRefresh';
import { Picture } from '@/components/Pictures';
import { storedLang, track } from '@/components/track';
import type { BizBooksView } from '@/lib/biz';
import { setBizLevelAction } from './actions';
import { CloseDay } from './CloseDay';
import { RecordSheet } from './RecordSheet';
import { Reports } from './Reports';
import { AccountantPanel, BranchesPanel, DailyBook, ItemsPanel, OwedPanel } from './Panels';
import { KIND, MAIN_KINDS, MORE_KINDS, OWNER_ONLY_KINDS, kes, type Lang } from './biz-ui';

type Tab = 'today' | 'reports' | 'items' | 'owed' | 'branches' | 'accountant' | 'book' | 'settings';
const TAB_LABEL: Record<Tab, { en: string; sw: string }> = {
  today: { en: 'Today', sw: 'Leo' },
  reports: { en: 'Statements', sw: 'Taarifa' },
  items: { en: 'Items', sw: 'Bidhaa' },
  owed: { en: 'Money owed', sw: 'Madeni' },
  branches: { en: 'Branches', sw: 'Matawi' },
  accountant: { en: 'For the accountant', sw: 'Kwa mhasibu' },
  book: { en: 'Daily book', sw: 'Kitabu cha siku' },
  settings: { en: 'Settings', sw: 'Mipangilio' },
};

/**
 * The business books home (owner 28/11/26): today's numbers, the big buttons
 * to write what happened, and the statements. Simple, Growing and Busy show
 * more or less of the same books; staff see only their own branch's day.
 */
export function BizBooks({ view }: { view: BizBooksView }) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('en');
  useEffect(() => { setLang(storedLang() === 'sw' ? 'sw' : 'en'); }, []);
  const { access, branches, entries, items, today, level } = view;
  const [branchSel, setBranchSel] = useState<string>(access.seeAll ? 'all' : branches[0]?.id ?? '');
  const branchId = branchSel === 'all' ? undefined : branchSel;
  const writeBranch = branchId ?? branches[0]?.id ?? '';
  const [tab, setTab] = useState<Tab>('today');
  const [sheet, setSheet] = useState<{ kind: BizKind; party?: string; amountCents?: number } | 'close' | null>(null);
  const [more, setMore] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const seeProfit = access.seeAll;

  const st = useMemo(() => bizStatement(entries, { from: today, to: today }, branchId), [entries, today, branchId]);
  const prev = useMemo(() => bizStatement(entries, previousRange(today, 'day'), branchId), [entries, today, branchId]);
  const brief = bizBrief(st, prev, 'day');
  const parties = useMemo(() => [...moneyOwed(entries, 'CUSTOMERS'), ...moneyOwed(entries, 'SUPPLIERS')].map((p) => p.party), [entries]);
  const closedToday = view.closes.some((c) => c.day === today && (branchId ? c.branchId === branchId : branches.length === 1 && c.branchId === branches[0]!.id));
  const firstTime = entries.length === 0;

  const tabs: Tab[] = access.seeAll
    ? ['today', 'reports', ...(level !== 'SIMPLE' || items.length ? (['items'] as Tab[]) : []), 'owed', ...(level === 'BUSY' || branches.length > 1 ? (['branches'] as Tab[]) : []), 'book', 'accountant', 'settings']
    : ['today', 'book'];
  const kinds = (list: BizKind[]) => list.filter((k) => access.manage || !OWNER_ONLY_KINDS.includes(k));

  const done = (message: string, tone: 'success' | 'error' = 'success') => {
    setFeedback({ tone, title: tone === 'success' ? 'Saved' : 'Not saved', detail: message });
    if (tone === 'success') { setSheet(null); router.refresh(); }
  };
  const open = (kind: BizKind, preset?: { party?: string; amountCents?: number }) => {
    track('cta', `biz-${kind.toLowerCase()}`);
    setSheet({ kind, ...preset });
    setMore(false);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bk">
      <LiveRefresh channel={`g:${view.groupId}`} />
      <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} float />

      <header className="bk-head">
        <div>
          <p className="bk-kicker">{lang === 'sw' ? 'Biashara yangu' : 'My business'} · {BIZ_LEVELS.find((l) => l.id === level)![lang]}</p>
          <h1 className="display">{view.name}</h1>
        </div>
        {branches.length > 1 && (
          <label className="bk-branch">
            <span className="sr-only">Branch</span>
            <select value={branchSel} onChange={(e) => setBranchSel(e.target.value)}>
              {access.seeAll && <option value="all">{lang === 'sw' ? 'Matawi yote' : 'All branches'}</option>}
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.town ? `, ${b.town}` : ''}</option>)}
            </select>
          </label>
        )}
      </header>

      {sheet === 'close' ? (
        <CloseDay groupId={view.groupId} branches={branches} branchId={writeBranch} entries={entries} day={today} closedDays={view.closes} lang={lang} onDone={done} onCancel={() => setSheet(null)} />
      ) : sheet ? (
        <RecordSheet key={`${sheet.kind}-${sheet.party ?? ''}`} groupId={view.groupId} kind={sheet.kind} branches={branches} branchId={writeBranch} items={items}
          parties={parties} today={today} canPickDay={access.manage} lang={lang} preset={sheet} onDone={done} onCancel={() => setSheet(null)} />
      ) : null}

      <nav className="bk-tabs" aria-label="Books">
        {tabs.map((t) => <button key={t} type="button" aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>{TAB_LABEL[t][lang]}</button>)}
      </nav>

      {tab === 'today' && (
        <>
          {firstTime && (
            <section className="bk-start" aria-label="Start in one minute">
              <h2 className="display">{lang === 'sw' ? 'Anza kwa dakika moja' : 'Start in one minute'}</h2>
              <ol>
                <li><b>Tap “I sold”</b> after your next sale and write the amount. Your profit shows straight away.</li>
                {access.manage && <li><b>Optional: “What I have today”.</b> The cash in the till, your M-Pesa balance and goods on the shelf, so the books start where you are.</li>}
                <li><b>At night, “Close the day”.</b> Count the money; Stawi tells you if anything is missing.</li>
              </ol>
              <div className="bk-start-go">
                <button type="button" className="bk-big go" onClick={() => open('SALE')}><Picture name="basket" size={44} /><span>{KIND.SALE[lang]}</span></button>
                {access.manage && <button type="button" className="bk-big" onClick={() => open('OPENING')}><Picture name="books" size={44} /><span>{KIND.OPENING[lang]}</span></button>}
              </div>
            </section>
          )}

          <section className="bk-today" aria-label="Today">
            <div className="bk-kpis">
              <div><span>{lang === 'sw' ? 'Mauzo leo' : 'Sales today'}</span><b className="mono">{kes(st.salesCents)}</b></div>
              {seeProfit && <div className="hero"><span>{lang === 'sw' ? 'Faida leo' : 'Profit today'}</span><b className={`mono ${st.netProfitCents < 0 ? 'neg' : ''}`}>{kes(st.netProfitCents)}</b></div>}
              <div><span>{lang === 'sw' ? 'Pesa taslimu' : 'Cash in till'}</span><b className="mono">{kes(st.money.CASH.closingCents)}</b></div>
              <div><span>M-Pesa</span><b className="mono">{kes(st.money.MPESA.closingCents)}</b></div>
            </div>
            {!firstTime && seeProfit && <ul className="bk-brief">{brief.map((b) => <li key={b.text} className={b.tone}>{b.text}</li>)}</ul>}
          </section>

          <section className="bk-actgrid" aria-label="Write what happened">
            {kinds(MAIN_KINDS).map((k) => (
              <button key={k} type="button" className={`bk-big${k === 'SALE' ? ' go' : ''}`} onClick={() => open(k)}>
                <Picture name={KIND[k].pic} size={44} /><span>{KIND[k][lang]}</span>
              </button>
            ))}
            <button type="button" className={`bk-big close${closedToday ? ' done' : ''}`} onClick={() => { track('cta', 'biz-close'); setSheet('close'); }} disabled={closedToday}>
              <Picture name="scales" size={44} /><span>{closedToday ? (lang === 'sw' ? 'Siku imefungwa' : 'Day closed') : lang === 'sw' ? 'Funga siku' : 'Close the day'}</span>
            </button>
            <button type="button" className="bk-big" aria-expanded={more} onClick={() => setMore(!more)}>
              <Picture name="folder" size={44} /><span>{lang === 'sw' ? 'Zaidi' : 'More'}</span>
            </button>
          </section>
          {more && (
            <section className="bk-moregrid" aria-label="More entries">
              {kinds(MORE_KINDS).map((k) => (
                <button key={k} type="button" className="bk-small" onClick={() => open(k)}><Picture name={KIND[k].pic} size={30} /><span>{KIND[k][lang]}</span></button>
              ))}
            </section>
          )}
        </>
      )}

      {tab === 'reports' && (
        <Reports entries={entries} items={items} today={today} branchId={branchId} branchName={branchId ? branches.find((b) => b.id === branchId)?.name ?? '' : 'All branches'}
          closedDays={view.closes} seeProfit={seeProfit} vatRegistered={view.vatRegistered} lang={lang} />
      )}
      {tab === 'items' && <ItemsPanel groupId={view.groupId} entries={entries} items={items} today={today} branchId={branchId} manage={access.manage} lang={lang} onDone={done} />}
      {tab === 'owed' && <OwedPanel entries={entries} today={today} branchId={branchId} onPay={(side, party, cents) => open(side === 'in' ? 'DEBT_PAID_IN' : 'DEBT_PAID_OUT', { party, amountCents: cents })} />}
      {tab === 'branches' && <BranchesPanel groupId={view.groupId} entries={entries} branches={branches} closes={view.closes} staff={view.staff} today={today} owner={access.owner} lang={lang} onDone={done} />}
      {tab === 'accountant' && <AccountantPanel entries={entries} branches={branches} today={today} name={view.name} />}
      {tab === 'book' && <DailyBook groupId={view.groupId} entries={branchId ? entries.filter((e) => e.branchId === branchId) : entries} items={items} branches={branches} today={today} manage={access.manage} lang={lang} onDone={done} />}
      {tab === 'settings' && <LevelPicker groupId={view.groupId} level={level} lang={lang} onDone={done} />}
    </div>
  );
}

function LevelPicker({ groupId, level, lang, onDone }: { groupId: string; level: BizLevel; lang: Lang; onDone: (m: string, t?: 'success' | 'error') => void }) {
  const [busy, setBusy] = useState(false);
  async function pick(l: BizLevel) {
    if (busy || l === level) return;
    setBusy(true);
    const res = await setBizLevelAction({ groupId, level: l }).catch(() => ({ ok: false, error: 'Not saved. Try again.' }));
    setBusy(false);
    if (!res.ok) { onDone(res.error ?? 'Not saved.', 'error'); return; }
    onDone(`Your books now show the ${BIZ_LEVELS.find((x) => x.id === l)!.en} view. Nothing written before changes.`);
  }
  return (
    <section className="bk-panel" aria-label="How much to show">
      <h3>How much should the books show?</h3>
      <p className="bk-note">The same books underneath. Move up or down any day; nothing is lost.</p>
      <div className="bk-levels" role="radiogroup">
        {BIZ_LEVELS.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={level === l.id} disabled={busy} className="bk-level" onClick={() => void pick(l.id)}>
            <strong>{l[lang]}</strong>
            <span>{lang === 'sw' ? l.aboutSw : l.about}</span>
            <ul>{l.features.map((f) => <li key={f}>{f}</li>)}</ul>
          </button>
        ))}
      </div>
    </section>
  );
}
