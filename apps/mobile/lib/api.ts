/**
 * Mobile → web JSON API client (Pillar 1).
 *
 * Base URL comes from EXPO_PUBLIC_API_BASE (set it in app config / .env). If the
 * API is unreachable — or unset — every call resolves to `null` and the caller
 * falls back to the bundled seed, so the app is always usable offline.
 *
 * When you deploy, also set EXPO_PUBLIC_API_KEY to match the server's
 * MOBILE_API_KEY. Locally against `expo start`, point BASE at your machine's LAN
 * IP, e.g. http://192.168.1.20:3000 (localhost won't resolve from a phone).
 */
import type { GroupCharter, Meeting, MemberGroupLink } from '@stawi/core';

const BASE = (process.env.EXPO_PUBLIC_API_BASE ?? '').replace(/\/$/, '');
const KEY = process.env.EXPO_PUBLIC_API_KEY ?? '';

// Optional Clerk session-token provider (set by App when Clerk is configured).
let getBearer: (() => Promise<string | null>) | null = null;
export function setAuthTokenProvider(fn: (() => Promise<string | null>) | null) { getBearer = fn; }

export const apiConfigured = () => BASE.length > 0;

async function headers(json = false): Promise<Record<string, string>> {
  const h: Record<string, string> = {};
  if (json) h['Content-Type'] = 'application/json';
  if (KEY) h['x-stawi-mobile-key'] = KEY;
  if (getBearer) { const t = await getBearer(); if (t) h['Authorization'] = `Bearer ${t}`; }
  return h;
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  if (!BASE) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const auth = await headers(false);
    const res = await fetch(BASE + path, { ...init, headers: { ...auth, ...(init.headers as Record<string, string> | undefined) }, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // offline → caller uses seed
  }
}

export interface CockpitPayload { groupId: string; groupName: string; charter: GroupCharter; meetings: Meeting[]; }

export const api = {
  configured: apiConfigured,
  async groupsByPhone(phone: string): Promise<MemberGroupLink[] | null> {
    const r = await req<{ links: MemberGroupLink[] }>(`/api/mobile/groups?phone=${encodeURIComponent(phone)}`);
    return r ? r.links : null;
  },
  async cockpit(groupId: string): Promise<CockpitPayload | null> {
    return req<CockpitPayload>(`/api/mobile/cockpit?groupId=${encodeURIComponent(groupId)}`);
  },
  async saveCharter(groupId: string, charter: GroupCharter) {
    return req<{ ok: boolean; persisted: boolean }>(`/api/mobile/charter`, { method: 'POST', headers: await headers(true), body: JSON.stringify({ groupId, charter }) });
  },
  async saveMeeting(groupId: string, meeting: Meeting) {
    return req<{ ok: boolean; persisted: boolean }>(`/api/mobile/meeting`, { method: 'POST', headers: await headers(true), body: JSON.stringify({ groupId, meeting }) });
  },
  async postMeeting(groupId: string, meetingNo: number, generatedDoc: string) {
    return req<{ ok: boolean; persisted: boolean }>(`/api/mobile/post-meeting`, { method: 'POST', headers: await headers(true), body: JSON.stringify({ groupId, meetingNo, generatedDoc }) });
  },
};
