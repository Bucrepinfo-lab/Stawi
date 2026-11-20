'use client';

import { useEffect } from 'react';

/**
 * Tells the main tabs which sections the group on screen uses, so a group that
 * switched Ideas or Books off, or a business with no group, sees only its own
 * tabs. A per-viewer convenience kept in this browser tab; the server still
 * decides what each page shows.
 */
export const TABS_HINT_KEY = 'stawiTabs';
export const TABS_HINT_EVENT = 'stawi:tabs';

export interface TabsHintValue { records: boolean; ideas: boolean; books: boolean }

export function readTabsHint(): TabsHintValue | null {
  try {
    const raw = sessionStorage.getItem(TABS_HINT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<TabsHintValue>;
    return { records: v.records !== false, ideas: v.ideas !== false, books: v.books !== false };
  } catch {
    return null;
  }
}

export function TabsHint({ records, ideas, books }: TabsHintValue) {
  useEffect(() => {
    try {
      sessionStorage.setItem(TABS_HINT_KEY, JSON.stringify({ records, ideas, books }));
    } catch {
      // No storage: the tabs simply show everything.
    }
    window.dispatchEvent(new Event(TABS_HINT_EVENT));
  }, [records, ideas, books]);
  return null;
}
