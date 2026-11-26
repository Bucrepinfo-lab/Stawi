import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/write { kind, image?: dataUrl, text?, groupId? }
 * "Write it for me" (owner 26/11/26). With the AI on, Claude reads the photo
 * (or the words) and writes the formal document. With it off, a photo comes
 * back as { needText: true } — the page reads it on the phone and sends the
 * words, which get the no-AI formal frame. Signed-in members only; output is
 * screened like every other text in Stawi; nothing is stored.
 */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ ok: false, error: 'Please sign in.' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { kind?: unknown; image?: unknown; text?: unknown; groupId?: unknown } | null;
  if (!body) return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  const { formalKind, formalWriterPrompt, cleanFormalOutput, formalTemplate, assertClean, FORMAL_MAX_INPUT_CHARS } = await import('@stawi/core');
  const kind = formalKind(body.kind);

  // Who it is written for: the person's name and role in the chosen group, when they belong to it.
  const p = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const ctx: { groupName: string | null; author: string | null; role: string | null; date: string } = {
    groupName: null, author: null, role: null, date: `${p(now.getDate())}/${p(now.getMonth() + 1)}/${String(now.getFullYear()).slice(2)}`,
  };
  if (process.env.DATABASE_URL && typeof body.groupId === 'string' && body.groupId) {
    const { myMembershipIds } = await import('@/lib/group-access');
    const mine = await myMembershipIds(body.groupId);
    if (mine.length) {
      const { prisma } = await import('@stawi/db');
      const m = await prisma.membership.findFirst({ where: { id: { in: mine } }, select: { fullName: true, role: true, group: { select: { name: true } } } });
      if (m) {
        ctx.groupName = m.group.name;
        ctx.author = m.fullName === 'Group founder' ? null : m.fullName;
        ctx.role = m.role === 'CHAIRMAN' ? 'Chairperson' : m.role.charAt(0) + m.role.slice(1).toLowerCase();
      }
    }
  }

  const text = typeof body.text === 'string' ? body.text.slice(0, FORMAL_MAX_INPUT_CHARS).trim() : '';
  let image: { mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; base64: string } | undefined;
  if (typeof body.image === 'string') {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(body.image);
    if (!m || m[2]!.length > 7_000_000) return NextResponse.json({ ok: false, error: 'Use a photo (JPEG or PNG) under 5 MB.' }, { status: 400 });
    image = { mediaType: m[1] as 'image/jpeg', base64: m[2]! };
  }
  if (!image && text.length < 3) return NextResponse.json({ ok: false, error: 'Take a photo of the notes, or say what the document is about.' }, { status: 400 });

  const { writeWithAi, formalAiEnabled } = await import('@/lib/formal-writer-ai');
  let doc: string | null = null;
  let by: 'ai' | 'frame' = 'frame';
  if (formalAiEnabled()) {
    const out = await writeWithAi(userId, formalWriterPrompt(kind, ctx, image ? undefined : text), image);
    if (out === 'limit') return NextResponse.json({ ok: false, error: 'You have used today’s documents. Try again tomorrow, or type it below.' }, { status: 429 });
    doc = cleanFormalOutput(out);
    if (doc) by = 'ai';
    else if (image && out?.trim() === 'UNREADABLE') return NextResponse.json({ ok: false, error: 'The photo could not be read. Take it again in good light, flat and close.' }, { status: 422 });
  }
  if (!doc) {
    if (image && !text) return NextResponse.json({ ok: true, needText: true });
    doc = formalTemplate(kind, text, ctx);
  }
  if (!doc) return NextResponse.json({ ok: false, error: 'There were not enough words to write a document. Add a few more.' }, { status: 422 });
  try {
    assertClean(doc);
  } catch {
    return NextResponse.json({ ok: false, error: 'This text cannot be written as it is. Please keep it respectful.' }, { status: 422 });
  }
  return NextResponse.json({ ok: true, doc, by, kind });
}
