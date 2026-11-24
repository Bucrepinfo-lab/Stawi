'use client';

import { useEffect, useState } from 'react';
import { shareLink, shareMessage, smsShareUrl, valueLang, whatsappShareUrl, type ShareChannel, type ValueLang } from '@stawi/core';
import { storedLang, track } from './track';
import { Picture } from './Pictures';

/**
 * Tell family, friends and other groups (owner 20/11/26). The link says only
 * which button was used (?via=whatsapp), never who shared it.
 */

const WORDS: Record<ValueLang, { title: string; share: string; whatsapp: string; sms: string; copy: string; copied: string; manual: string }> = {
  en: { title: 'Tell another group', share: 'Share', whatsapp: 'WhatsApp', sms: 'Text message', copy: 'Copy link', copied: 'Copied', manual: 'Hold the link below to copy it' },
  sw: { title: 'Waambie kikundi kingine', share: 'Shiriki', whatsapp: 'WhatsApp', sms: 'Ujumbe mfupi', copy: 'Nakili kiungo', copied: 'Imenakiliwa', manual: 'Bonyeza kiungo hapa chini kwa muda kukinakili' },
};

export function ShareBar({ lang: langProp, compact = false }: { lang?: string; compact?: boolean }) {
  const [saved, setSaved] = useState<ValueLang>('en');
  const [origin, setOrigin] = useState('');
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
  // Some phones refuse the clipboard: show the link so it can still be copied by hand.
  const [manual, setManual] = useState(false);
  useEffect(() => {
    setSaved(storedLang());
    setOrigin(window.location.origin);
    setCanShare(typeof navigator.share === 'function');
  }, []);
  const lang = langProp ? valueLang(langProp) : saved;
  const w = WORDS[lang];
  const text = (channel: ShareChannel) => shareMessage(lang, shareLink(origin || 'https://stawi.fly.dev', channel));

  async function deviceShare() {
    track('share', 'share-device');
    try {
      await navigator.share({ title: 'Stawi', text: text('device') });
    } catch {
      // Closed the share sheet: nothing to do.
    }
  }
  async function copy() {
    track('share', 'share-copy');
    try {
      await navigator.clipboard.writeText(text('copy'));
      setCopied(true);
      setManual(false);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
      setManual(true);
    }
  }

  return (
    <div className="share-bar" aria-label={w.title}>
      {!compact && <strong style={{ fontSize: 15 }}><Picture name="share" size={22} /> {w.title}</strong>}
      {canShare && (
        <button type="button" className="share-btn primary" onClick={deviceShare}>↗ {w.share}</button>
      )}
      <a className={`share-btn${canShare ? '' : ' primary'}`} href={whatsappShareUrl(text('whatsapp'))} target="_blank" rel="noopener noreferrer" onClick={() => track('share', 'share-whatsapp')}>
        <Picture name="messages" size={20} /> {w.whatsapp}
      </a>
      <a className="share-btn" href={smsShareUrl(text('sms'))} onClick={() => track('share', 'share-sms')}><Picture name="envelope" size={20} /> {w.sms}</a>
      <button type="button" className="share-btn" onClick={copy} aria-live="polite">{copied ? `✓ ${w.copied}` : <><Picture name="link" size={20} /> {w.copy}</>}</button>
      {manual && (
        <label style={{ display: 'grid', gap: 4, width: '100%', fontSize: 13 }}>
          {w.manual}
          <input readOnly value={shareLink(origin || 'https://stawi.fly.dev', 'copy')} onFocus={(e) => e.currentTarget.select()} style={{ font: 'inherit', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--line, #dcd3c2)' }} />
        </label>
      )}
    </div>
  );
}
