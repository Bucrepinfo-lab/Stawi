import { NextResponse } from 'next/server';
import { messageChannel } from '@stawi/core';
import { readMessages, sendMessage } from '@/lib/messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Messages inside the app (owner 20/11/26).
 * GET  ?channel=ALL|OFFICIALS&thread=<member>  → the messages this viewer may read.
 * POST { channel, body, replyTo? }             → send one.
 * Members of the group only; sign-in is enforced by the middleware and again here.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const result = await readMessages(id, messageChannel(url.searchParams.get('channel')), url.searchParams.get('thread'));
  if (result.status !== 200) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.view);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { channel?: unknown; body?: unknown; replyTo?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const result = await sendMessage(id, {
    channel: messageChannel(body.channel),
    body: body.body,
    replyTo: typeof body.replyTo === 'string' ? body.replyTo : null,
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error, errorSw: result.errorSw }, { status: result.status });
  return NextResponse.json({ ok: true });
}
