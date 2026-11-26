'use client';

import { useEffect, useRef, useState } from 'react';
import { SPEECH_LANGS, speechLangFor, type SpeechLang } from '@stawi/core';
import { storedLang } from './track';

/**
 * Speak instead of write (owner 26/11/26). Pick Kiswahili or English, tap the
 * microphone and talk; the words appear in the box as you speak and can be
 * corrected by hand. Uses the phone's own speech recognition (Chrome on
 * Android and the Play app) where it exists; where it does not, the box still
 * works with the keyboard's microphone key (Gboard voice typing knows
 * Kiswahili). The chosen language is remembered for the whole app.
 */
type Rec = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void;
};

function recogniser(): (new () => Rec) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const T = {
  en: { lang: 'I will speak in', start: 'Tap and speak', stop: 'Stop', listening: 'Listening… speak clearly, close to the phone', none: 'Your phone cannot listen inside the app. Tap the box, then the microphone key on your keyboard, and speak.', denied: 'The microphone is blocked for Stawi. Allow it in your phone settings, or use the keyboard microphone.', fix: 'Read it through and correct any wrong words before you continue.' },
  sw: { lang: 'Nitaongea kwa', start: 'Bonyeza uongee', stop: 'Simamisha', listening: 'Ninasikiliza… ongea wazi, karibu na simu', none: 'Simu yako haiwezi kusikiliza ndani ya programu. Gusa kisanduku, kisha kitufe cha maikrofoni kwenye kibodi, uongee.', denied: 'Maikrofoni imezuiwa kwa Stawi. Iruhusu kwenye mipangilio ya simu, au tumia maikrofoni ya kibodi.', fix: 'Soma tena na urekebishe maneno yasiyo sahihi kabla ya kuendelea.' },
} as const;

export function DictateBox({ value, onChange, placeholder, rows = 7 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  const [lang, setLang] = useState<SpeechLang>('en-KE');
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [interim, setInterim] = useState('');
  const rec = useRef<Rec | null>(null);
  const base = useRef('');
  const supported = typeof window !== 'undefined' && !!recogniser();
  const t = T[lang === 'sw-KE' ? 'sw' : 'en'];

  useEffect(() => { setLang(speechLangFor(storedLang())); }, []);
  useEffect(() => () => rec.current?.stop(), []);

  function pick(l: SpeechLang) {
    setLang(l);
    try { localStorage.setItem('stawiLang', l === 'sw-KE' ? 'sw' : 'en'); } catch { /* private mode */ }
    if (listening) { rec.current?.stop(); }
  }

  function start() {
    const R = recogniser();
    if (!R) { setNote(t.none); return; }
    const r = new R();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    base.current = value ? `${value.trimEnd()} ` : '';
    r.onresult = (e) => {
      let finalText = '';
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        if (res.isFinal) finalText += res[0].transcript + ' ';
        else live += res[0].transcript;
      }
      if (finalText) { base.current += finalText; onChange(base.current); }
      setInterim(live);
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setNote(t.denied);
      else if (e.error === 'language-not-supported') setNote(t.none);
    };
    r.onend = () => { setListening(false); setInterim(''); setNote(T[lang === 'sw-KE' ? 'sw' : 'en'].fix); };
    try {
      r.start();
      rec.current = r;
      setListening(true);
      setNote(null);
    } catch {
      setNote(t.none);
    }
  }

  return (
    <div className="dc">
      <div className="dc-lang" role="radiogroup" aria-label={t.lang}>
        <span>{t.lang}</span>
        {SPEECH_LANGS.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={lang === l.id} className={lang === l.id ? 'on' : ''} onClick={() => pick(l.id)}>{l.native}</button>
        ))}
      </div>
      {supported && (
        <button type="button" className={`dc-mic${listening ? ' live' : ''}`} onClick={() => (listening ? rec.current?.stop() : start())} aria-pressed={listening}>
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          {listening ? t.stop : t.start}
        </button>
      )}
      {listening && <p className="dc-live" role="status"><span className="wr-dot" aria-hidden />{t.listening}{interim ? ` — “${interim}”` : ''}</p>}
      <textarea className="mr-input dc-text" rows={rows} lang={lang === 'sw-KE' ? 'sw' : 'en'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {(note || !supported) && <p className="mr-meta">{note ?? t.none}</p>}
    </div>
  );
}
