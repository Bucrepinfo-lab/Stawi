import { NextResponse, type NextRequest } from 'next/server';
import { sanitizeEngagement } from '@stawi/core';
import { recordEngagement } from '@/lib/engagement';

/**
 * Counts a view, open, tap or share (owner 20/11/26). Public, because the home
 * page is public — so it accepts only a known event with a short safe key
 * (sanitizeEngagement), ignores everything else in the body, stores no
 * personal data, and is rate-limited per address in memory (the address is
 * used for the limit only and never stored).
 */

export const dynamic = 'force-dynamic';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 90;
const MAX_BODY_BYTES = 512;
const g = globalThis as unknown as { __stawiTrackHits?: Map<string, { n: number; start: number }> };
const hits: Map<string, { n: number; start: number }> = (g.__stawiTrackHits ??= new Map());

function allowed(address: string, now: number): boolean {
  if (hits.size > 20_000) hits.clear();
  const h = hits.get(address);
  if (!h || now - h.start > WINDOW_MS) {
    hits.set(address, { n: 1, start: now });
    return true;
  }
  h.n += 1;
  return h.n <= MAX_PER_WINDOW;
}

const done = () => new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest) {
  const address = (request.headers.get('fly-client-ip') ?? request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0]!.trim();
  if (!allowed(address, Date.now())) return new NextResponse(null, { status: 429 });
  let raw = '';
  try {
    raw = await request.text();
  } catch {
    return done();
  }
  if (!raw || raw.length > MAX_BODY_BYTES) return done();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return done();
  }
  const hit = sanitizeEngagement(body);
  if (hit) await recordEngagement(hit);
  return done();
}
