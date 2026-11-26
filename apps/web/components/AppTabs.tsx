'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { shareLink, shareMessage, type ValueLang } from '@stawi/core';
import { ShareBar } from './ShareBar';
import { storedLang, track } from './track';
import { TABS_HINT_EVENT, readTabsHint, type TabsHintValue } from './TabsHint';
import { TabPicture, type TabPictureName } from './TabPictures';

/**
 * The main tabs (owner 20/11/26): the same four big buttons on every working
 * screen — at the bottom on a phone, along the top on a computer. Pictures and
 * plain words, so nobody needs to read a menu. The pictures are Stawi's own
 * drawings (owner 24/11/26), not emoji, so every phone shows the same thing. Links prefetch, so a tab opens
 * at once.
 */

const TABS: { href: string; match: RegExp; picture: TabPictureName; key: string; needs: keyof TabsHintValue; label: Record<ValueLang, string> }[] = [
  { href: '/dashboard', match: /^\/(dashboard|groups|formalize)(\/|$)/, picture: 'group', key: 'tab-group', needs: 'records', label: { en: 'My group', sw: 'Kikundi' } },
  { href: '/match', match: /^\/match(\/|$)/, picture: 'ideas', key: 'tab-ideas', needs: 'ideas', label: { en: 'Ideas', sw: 'Mawazo' } },
  { href: '/books', match: /^\/books(\/|$)/, picture: 'books', key: 'tab-books', needs: 'books', label: { en: 'Books', sw: 'Hesabu' } },
  { href: '/messages', match: /^\/messages(\/|$)/, picture: 'messages', key: 'tab-messages', needs: 'messages', label: { en: 'Messages', sw: 'Ujumbe' } },
];

const SHOW_ON = /^\/(dashboard|groups|formalize|match|books|messages|sacco|community)(\/|$)/;
const SHARE_LABEL: Record<ValueLang, string> = { en: 'Share', sw: 'Shiriki' };

export function AppTabs() {
  const pathname = usePathname() ?? '/';
  const visible = SHOW_ON.test(pathname);
  const [lang, setLang] = useState<ValueLang>('en');
  const [panel, setPanel] = useState(false);
  useEffect(() => { setLang(storedLang()); }, []);
  // Show only the tabs for the sections the group on screen uses (see TabsHint).
  const [hint, setHint] = useState<TabsHintValue | null>(null);
  useEffect(() => {
    const read = () => setHint(readTabsHint());
    read();
    window.addEventListener(TABS_HINT_EVENT, read);
    return () => window.removeEventListener(TABS_HINT_EVENT, read);
  }, []);
  useEffect(() => {
    document.body.classList.toggle('has-app-tabs', visible);
    return () => document.body.classList.remove('has-app-tabs');
  }, [visible]);
  if (!visible) return null;

  async function share() {
    track('share', 'share-tab');
    // On a phone: the phone's own share sheet (WhatsApp, Facebook, TikTok…).
    // On a computer: our own panel, never the computer's OneNote/Outlook box.
    const touch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    if (touch && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Stawi', text: shareMessage(lang, shareLink(window.location.origin, 'device')) });
      } catch {
        // Closed the share sheet.
      }
      return;
    }
    setPanel(true);
  }

  return (
    <nav className="app-tabs" aria-label="Main">
      {TABS.filter((t) => !hint || hint[t.needs] || t.match.test(pathname)).map((t) => (
        <Link key={t.href} href={t.href} className="app-tab" aria-current={t.match.test(pathname) ? 'page' : undefined} onClick={() => track('tab', t.key)}>
          <span className="i pic" aria-hidden><TabPicture name={t.picture} /></span>
          <span>{t.label[lang]}</span>
        </Link>
      ))}
      <button type="button" className="app-tab" onClick={share}>
        <span className="i pic" aria-hidden><TabPicture name="share" /></span>
        <span>{SHARE_LABEL[lang]}</span>
      </button>
      {panel && (
        <div role="dialog" aria-label={SHARE_LABEL[lang]} onClick={() => setPanel(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'grid', placeItems: 'end center', zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--paper)', borderRadius: '16px 16px 0 0', padding: 16, width: 'min(560px, 100%)', boxShadow: 'var(--shadow)' }}>
            <ShareBar lang={lang} />
            <button type="button" className="share-btn" onClick={() => setPanel(false)} style={{ marginTop: 10 }}>✕</button>
          </div>
        </div>
      )}
    </nav>
  );
}
