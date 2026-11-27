'use client';

import { useEffect, useState } from 'react';
import { shareLink, shareMessage, shareTargets, valueLang, type ShareChannel, type ValueLang } from '@stawi/core';
import { storedLang, track } from './track';
import { Picture } from './Pictures';
import { ArrowOut } from './ArrowOut';

/**
 * Tell family, friends and other groups (owner 20/11/26) where people actually
 * are (owner 26/11/26): WhatsApp and Facebook first, then X, Telegram,
 * LinkedIn, SMS and email, copy link, and "TikTok, Instagram & more" (the
 * phone's own share sheet on a phone; on a computer it copies the link with a
 * hint, never the computer's OneNote/Outlook box). The link says only which
 * button was used (?via=facebook), never who shared it.
 */

const WORDS: Record<ValueLang, { title: string; more: string; copy: string; copied: string; hint: string; manual: string; sms: string; email: string }> = {
  en: { title: 'Tell another group', more: 'TikTok, Instagram & more', copy: 'Copy link', copied: 'Copied', hint: 'Link copied. Paste it into TikTok, Instagram, YouTube or any chat.', manual: 'Hold the link below to copy it', sms: 'Text message', email: 'Email' },
  sw: { title: 'Waambie kikundi kingine', more: 'TikTok, Instagram na zaidi', copy: 'Nakili kiungo', copied: 'Imenakiliwa', hint: 'Kiungo kimenakiliwa. Kibandike TikTok, Instagram, YouTube au gumzo lolote.', manual: 'Bonyeza kiungo hapa chini kwa muda kukinakili', sms: 'Ujumbe mfupi', email: 'Barua pepe' },
};

function phoneSheet(): boolean {
  const touch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return touch && typeof navigator.share === 'function';
}

export function ShareBar({ lang: langProp, compact = false }: { lang?: string; compact?: boolean }) {
  const [saved, setSaved] = useState<ValueLang>('en');
  const [origin, setOrigin] = useState('');
  const [note, setNote] = useState('');
  // Some phones refuse the clipboard: show the link so it can still be copied by hand.
  const [manual, setManual] = useState(false);
  useEffect(() => {
    setSaved(storedLang());
    setOrigin(window.location.origin);
  }, []);
  const lang = langProp ? valueLang(langProp) : saved;
  const w = WORDS[lang];
  const base = origin || 'https://getstawi.com';
  const link = (channel: ShareChannel) => shareLink(base, channel);
  const text = (channel: ShareChannel) => shareMessage(lang, link(channel));

  // Each button carries its own ?via= so the counts show which one works.
  const targets = shareTargets({ text: text('whatsapp'), url: link('whatsapp'), title: 'Stawi' }).map((t) => {
    const own = shareTargets({ text: text(t.id), url: link(t.id), title: 'Stawi' }).find((x) => x.id === t.id) ?? t;
    return { ...own, label: t.id === 'sms' ? w.sms : t.id === 'email' ? w.email : own.label };
  });

  async function copy(hint: string) {
    try {
      await navigator.clipboard.writeText(text('copy'));
      setNote(hint);
      setManual(false);
      setTimeout(() => setNote(''), 4000);
    } catch {
      setNote('');
      setManual(true);
    }
  }
  async function more() {
    track('share', 'share-device');
    if (!phoneSheet()) return copy(w.hint);
    try {
      await navigator.share({ title: 'Stawi', text: text('device') });
    } catch {
      // Closed the share sheet: nothing to do.
    }
  }

  return (
    <div className="share-bar" aria-label={w.title}>
      {!compact && <strong style={{ fontSize: 15 }}><Picture name="share" size={22} /> {w.title}</strong>}
      {targets.map((t) => (
        <a
          key={t.id}
          className="share-btn"
          href={t.href}
          target={t.href.startsWith('http') ? '_blank' : undefined}
          rel="noopener noreferrer"
          onClick={() => track('share', `share-${t.id}`)}
          style={{ background: t.color, borderColor: t.color, color: '#fff' }}
        >
          {t.label}
        </a>
      ))}
      <button type="button" className="share-btn" onClick={more}><ArrowOut /> {w.more}</button>
      <button type="button" className="share-btn" onClick={() => { track('share', 'share-copy'); void copy(w.copied); }} aria-live="polite">
        <Picture name="link" size={20} /> {w.copy}
      </button>
      {note && <p role="status" style={{ width: '100%', margin: 0, fontSize: 13 }}>{note}</p>}
      {manual && (
        <label style={{ display: 'grid', gap: 4, width: '100%', fontSize: 13 }}>
          {w.manual}
          <input readOnly value={link('copy')} onFocus={(e) => e.currentTarget.select()} style={{ font: 'inherit', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--line, #dcd3c2)' }} />
        </label>
      )}
    </div>
  );
}
