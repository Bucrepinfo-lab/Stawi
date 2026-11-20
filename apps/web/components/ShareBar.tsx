'use client';

import { useEffect, useState } from 'react';
import { shareLink, shareMessage, smsShareUrl, valueLang, whatsappShareUrl, type ShareChannel, type ValueLang } from '@stawi/core';
import { storedLang, track } from './track';

/**
 * Tell family, friends and other groups (owner 20/11/26). The link says only
 * which button was used (?via=whatsapp), never who shared it.
 */

const WORDS: Record<ValueLang, { title: string; share: string; whatsapp: string; sms: string; copy: string; copied: string }> = {
  en: { title: 'Tell another group', share: 'Share', whatsapp: 'WhatsApp', sms: 'Text message', copy: 'Copy link', copied: 'Copied' },
  sw: { title: 'Waambie kikundi kingine', share: 'Shiriki', whatsapp: 'WhatsApp', sms: 'Ujumbe mfupi', copy: 'Nakili kiungo', copied: 'Imenakiliwa' },
};

export function ShareBar({ lang: langProp, compact = false }: { lang?: string; compact?: boolean }) {
  const [saved, setSaved] = useState<ValueLang>('en');
  const [origin, setOrigin] = useState('');
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
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
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="share-bar" aria-label={w.title}>
      {!compact && <strong style={{ fontSize: 15 }}>📣 {w.title}</strong>}
      {canShare && (
        <button type="button" className="share-btn primary" onClick={deviceShare}>↗ {w.share}</button>
      )}
      <a className={`share-btn${canShare ? '' : ' primary'}`} href={whatsappShareUrl(text('whatsapp'))} target="_blank" rel="noopener noreferrer" onClick={() => track('share', 'share-whatsapp')}>
        💬 {w.whatsapp}
      </a>
      <a className="share-btn" href={smsShareUrl(text('sms'))} onClick={() => track('share', 'share-sms')}>✉️ {w.sms}</a>
      <button type="button" className="share-btn" onClick={copy} aria-live="polite">{copied ? `✓ ${w.copied}` : `🔗 ${w.copy}`}</button>
    </div>
  );
}
