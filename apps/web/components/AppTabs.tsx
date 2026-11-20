'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { shareLink, shareMessage, whatsappShareUrl, type ValueLang } from '@stawi/core';
import { storedLang, track } from './track';
import { TABS_HINT_EVENT, readTabsHint, type TabsHintValue } from './TabsHint';

/**
 * The main tabs (owner 20/11/26): the same four big buttons on every working
 * screen — at the bottom on a phone, along the top on a computer. Pictures and
 * plain words, so nobody needs to read a menu. Links prefetch, so a tab opens
 * at once.
 */

const TABS: { href: string; match: RegExp; icon: string; key: string; needs: keyof TabsHintValue; label: Record<ValueLang, string> }[] = [
  { href: '/dashboard', match: /^\/(dashboard|groups|formalize)(\/|$)/, icon: '👥', key: 'tab-group', needs: 'records', label: { en: 'My group', sw: 'Kikundi' } },
  { href: '/match', match: /^\/match(\/|$)/, icon: '💡', key: 'tab-ideas', needs: 'ideas', label: { en: 'Ideas', sw: 'Mawazo' } },
  { href: '/books', match: /^\/books(\/|$)/, icon: '📒', key: 'tab-books', needs: 'books', label: { en: 'Books', sw: 'Hesabu' } },
];

const SHOW_ON = /^\/(dashboard|groups|formalize|match|books|sacco|community)(\/|$)/;
const SHARE_LABEL: Record<ValueLang, string> = { en: 'Share', sw: 'Shiriki' };

export function AppTabs() {
  const pathname = usePathname() ?? '/';
  const visible = SHOW_ON.test(pathname);
  const [lang, setLang] = useState<ValueLang>('en');
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
    const text = shareMessage(lang, shareLink(window.location.origin, typeof navigator.share === 'function' ? 'device' : 'whatsapp'));
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Stawi', text });
      } catch {
        // Closed the share sheet.
      }
      return;
    }
    window.open(whatsappShareUrl(text), '_blank', 'noopener');
  }

  return (
    <nav className="app-tabs" aria-label="Main">
      {TABS.filter((t) => !hint || hint[t.needs] || t.match.test(pathname)).map((t) => (
        <Link key={t.href} href={t.href} className="app-tab" aria-current={t.match.test(pathname) ? 'page' : undefined} onClick={() => track('tab', t.key)}>
          <span className="i" aria-hidden>{t.icon}</span>
          <span>{t.label[lang]}</span>
        </Link>
      ))}
      <button type="button" className="app-tab" onClick={share}>
        <span className="i" aria-hidden>📣</span>
        <span>{SHARE_LABEL[lang]}</span>
      </button>
    </nav>
  );
}
