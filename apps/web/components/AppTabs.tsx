'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ValueLang } from '@stawi/core';
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

const SHOW_ON = /^\/(dashboard|groups|formalize|match|books|messages|sacco|community|profile|search|write|proposal)(\/|$)/;
const ME_LABEL: Record<ValueLang, string> = { en: 'Me', sw: 'Mimi' };
const SEARCH_LABEL: Record<ValueLang, string> = { en: 'Search', sw: 'Tafuta' };

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

  return (
    <nav className="app-tabs" aria-label="Main">
      {TABS.filter((t) => !hint || hint[t.needs] || t.match.test(pathname)).map((t) => (
        <Link key={t.href} href={t.href} className="app-tab" aria-current={t.match.test(pathname) ? 'page' : undefined} onClick={() => track('tab', t.key)}>
          <span className="i pic" aria-hidden><TabPicture name={t.picture} /></span>
          <span>{t.label[lang]}</span>
        </Link>
      ))}
      {/* Five tabs at most (Material navigation bar: three to five destinations). "Me" holds
          profile, language, alerts, sign-in and Share; Search sits above the tabs on every screen. */}
      <Link href="/profile" className="app-tab" aria-current={/^\/profile(\/|$)/.test(pathname) ? 'page' : undefined} onClick={() => track('tab', 'tab-me')}>
        <span className="i pic" aria-hidden><TabPicture name="me" /></span>
        <span>{ME_LABEL[lang]}</span>
      </Link>
      <Link href="/search" className="app-search" aria-label={SEARCH_LABEL[lang]} aria-current={/^\/search(\/|$)/.test(pathname) ? 'page' : undefined} onClick={() => track('tab', 'tab-search')}>
        <TabPicture name="search" size={28} />
        <span>{SEARCH_LABEL[lang]}</span>
      </Link>
    </nav>
  );
}
