'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MESSAGE_MAX_CHARS, type MessageChannel, type ValueLang } from '@stawi/core';
import type { MessagesView } from '@/lib/messages';
import { storedLang, track } from '@/components/track';
import { setUrlParams } from '@/lib/url-state';
import { Picture } from '@/components/Pictures';

/** Where reports go (Play user-generated-content policy: an in-app way to report). */
const REPORT_TO = 'telpeninfo@gmail.com';

/**
 * Two places to write: the whole group, and "Ask the officials" (seen by the
 * asker and the officials only). The list refreshes by itself while the screen
 * is open. The server decides what each person may read.
 */

const T = {
  title: { en: 'Messages', sw: 'Ujumbe' },
  all: { en: 'Whole group', sw: 'Kikundi chote' },
  officials: { en: 'Ask the officials', sw: 'Uliza viongozi' },
  allHint: { en: 'Everyone in the group can read this.', sw: 'Kila mwanachama anaweza kusoma hapa.' },
  askHint: { en: 'Only you and the officials can read this.', sw: 'Ni wewe na viongozi tu mnaoweza kusoma hapa.' },
  pick: { en: 'Choose a member to read and answer.', sw: 'Chagua mwanachama usome na ujibu.' },
  nobody: { en: 'No member has written to the officials yet.', sw: 'Bado hakuna mwanachama aliyewaandikia viongozi.' },
  empty: { en: 'No messages yet. Write the first one.', sw: 'Bado hakuna ujumbe. Andika wa kwanza.' },
  write: { en: 'Write a message', sw: 'Andika ujumbe' },
  ask: { en: 'Write your question', sw: 'Andika swali lako' },
  answer: { en: 'Write your answer', sw: 'Andika jibu lako' },
  send: { en: 'Send', sw: 'Tuma' },
  waiting: { en: 'Waiting for an answer', sw: 'Inasubiri jibu' },
  back: { en: 'All questions', sw: 'Maswali yote' },
  official: { en: 'Official', sw: 'Kiongozi' },
  you: { en: 'You', sw: 'Wewe' },
  none: { en: 'Messages are not switched on for your group. An official can switch them on under “Choose what you use”.', sw: 'Ujumbe haujawashwa kwa kikundi chenu. Kiongozi anaweza kuuwasha chini ya “Chagueni mnachotumia”.' },
  fail: { en: 'Could not send. Please try again.', sw: 'Haikutumwa. Tafadhali jaribu tena.' },
  report: { en: 'Report', sw: 'Ripoti' },
  reportHint: { en: 'Something wrong or abusive? Tap Report on the message, or write to', sw: 'Kuna ujumbe mbaya au wa matusi? Gusa Ripoti kwenye ujumbe, au andika kwa' },
} as const;

const time = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** A pre-filled email to Stawi about one message; the person can add why. */
export function reportLink(groupId: string, messageId: string, body: string): string {
  const subject = 'Report a message in Stawi';
  const text = `Group: ${groupId}\nMessage: ${messageId}\n\n"${body.slice(0, 300)}"\n\nWhy I am reporting it:\n`;
  return `mailto:${REPORT_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}

export function MessagesClient({ groups, initialId }: { groups: { id: string; name: string }[]; initialId: string }) {
  const [lang, setLang] = useState<ValueLang>('en');
  const [groupId, setGroupIdState] = useState(initialId);
  const [channel, setChannel] = useState<MessageChannel>('ALL');
  const [thread, setThread] = useState<string | null>(null);
  const [view, setView] = useState<MessagesView | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const endRef = useRef<HTMLDivElement>(null);
  const count = useRef(0);

  useEffect(() => { setLang(storedLang()); }, []);
  const setGroupId = (id: string) => { setGroupIdState(id); setThread(null); setView(null); setUrlParams({ group: id }); };

  const load = useCallback(async () => {
    if (!groupId) return;
    try {
      const q = new URLSearchParams({ channel });
      if (thread) q.set('thread', thread);
      const r = await fetch(`/api/groups/${encodeURIComponent(groupId)}/messages?${q.toString()}`);
      if (r.ok) setView((await r.json()) as MessagesView);
    } catch {
      // Offline: keep what is on screen.
    }
  }, [groupId, channel, thread]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 12_000);
    return () => clearInterval(timer);
  }, [load]);

  // Follow the newest message when one arrives.
  useEffect(() => {
    const n = view?.messages.length ?? 0;
    if (n !== count.current) endRef.current?.scrollIntoView({ block: 'nearest' });
    count.current = n;
  }, [view]);

  if (groups.length === 0) return <p className="msg-none">{T.none[lang]}</p>;

  const official = view?.me.official ?? false;
  const pickingThread = channel === 'OFFICIALS' && official && !thread;

  async function send() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setErr(undefined);
    track('cta', channel === 'ALL' ? 'message-group' : 'message-officials');
    try {
      const r = await fetch(`/api/groups/${encodeURIComponent(groupId)}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channel, body, replyTo: thread }),
      });
      const d = (await r.json()) as { ok?: boolean; error?: string; errorSw?: string };
      if (d.ok) { setText(''); await load(); }
      else setErr((lang === 'sw' && d.errorSw) || d.error || T.fail[lang]);
    } catch {
      setErr(T.fail[lang]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="msg" aria-label={T.title[lang]}>
      <div className="msg-top">
        <h1 className="display msg-title">{T.title[lang]}</h1>
        {groups.length > 1 && (
          <select className="msg-group" value={groupId} onChange={(e) => setGroupId(e.target.value)} aria-label="Group">
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
      </div>

      <div className="s-tabs" role="tablist" aria-label={T.title[lang]} style={{ marginTop: 0 }}>
        {(['ALL', 'OFFICIALS'] as MessageChannel[]).map((c) => (
          <button key={c} type="button" role="tab" aria-selected={channel === c} className="s-tab" onClick={() => { setChannel(c); setThread(null); setView(null); track('tab', c === 'ALL' ? 'messages-group' : 'messages-officials'); }}>
            <Picture name={c === 'ALL' ? 'group' : 'messages'} size={22} />{c === 'ALL' ? T.all[lang] : T.officials[lang]}
          </button>
        ))}
      </div>
      <p className="msg-hint">{channel === 'ALL' ? T.allHint[lang] : official ? T.pick[lang] : T.askHint[lang]}</p>

      {pickingThread ? (
        <ul className="msg-threads">
          {(view?.threads ?? []).length === 0 && <li className="msg-empty">{T.nobody[lang]}</li>}
          {(view?.threads ?? []).map((t) => (
            <li key={t.memberId}>
              <button type="button" className={`msg-thread s-card plain ${t.waiting ? 'waiting' : ''}`} onClick={() => { setThread(t.memberId); setView(null); }}>
                <span className="who">{t.name}</span>
                <span className="last">{t.lastBody}</span>
                <span className="meta">{time(t.lastAt)}{t.waiting ? ` · ${T.waiting[lang]}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          {channel === 'OFFICIALS' && official && (
            <button type="button" className="msg-back" onClick={() => { setThread(null); setView(null); }}>← {T.back[lang]}</button>
          )}
          <div className="msg-list s-card plain" aria-live="polite">
            {view && view.messages.length === 0 && <p className="msg-empty">{T.empty[lang]}</p>}
            {(view?.messages ?? []).map((m) => (
              <div key={m.id} className={`msg-row ${m.mine ? 'mine' : ''}`}>
                <div className="msg-bubble">
                  <p className="msg-from">{m.mine ? T.you[lang] : m.name}{m.official && <span className="msg-badge">{T.official[lang]}</span>}</p>
                  <p className="msg-body">{m.body}</p>
                  <p className="msg-time">{time(m.at)}
                    {!m.mine && (
                      <a className="msg-report" href={reportLink(groupId, m.id, m.body)} onClick={() => track('cta', 'message-report')}>{T.report[lang]}</a>
                    )}
                  </p>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="msg-compose">
            <textarea value={text} maxLength={MESSAGE_MAX_CHARS} rows={2} aria-label={T.write[lang]}
              placeholder={channel === 'ALL' ? T.write[lang] : official ? T.answer[lang] : T.ask[lang]}
              onChange={(e) => setText(e.target.value)} />
            <button type="button" className="msg-send" disabled={busy || !text.trim()} onClick={send}>{T.send[lang]}</button>
          </div>
          {err && <p className="pay-note bad" role="alert">{err}</p>}
          <p className="msg-hint">{T.reportHint[lang]} <span style={{ userSelect: 'all' }}>{REPORT_TO}</span>.</p>
        </>
      )}
    </section>
  );
}
