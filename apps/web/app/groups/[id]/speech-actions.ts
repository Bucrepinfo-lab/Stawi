'use server';

/**
 * Spoken minutes → the minutes form (owner 26/11/26). Officials only. With
 * ANTHROPIC_API_KEY, Claude turns the spoken words (Kiswahili, English or
 * mixed) into formal English minutes fields; otherwise the same notes parser
 * the photo import uses. Nothing is stored here: the official checks the form
 * and posts the minutes as usual.
 */
import type { ParsedNotes } from '@stawi/core';

export async function minutesFromSpeechAction(input: { groupId: string; transcript: string }): Promise<{ ok: true; parsed: ParsedNotes; by: 'ai' | 'parser' } | { ok: false; error: string }> {
  const transcript = (input.transcript ?? '').trim().slice(0, 8000);
  if (transcript.length < 10) return { ok: false, error: 'Say a little more about the meeting first.' };
  const { parseImportedNotes, minutesFromSpeechPrompt, parseMinutesJson, assertClean } = await import('@stawi/core');
  try { assertClean(transcript); } catch { return { ok: false, error: 'Please keep the words respectful.' }; }
  let members: string[] = [];
  let groupName: string | null = null;
  if (process.env.DATABASE_URL) {
    // Minutes: the secretary only, or the stand-in the chair named (owner 27/11/26).
    const { minutesAccess, MINUTES_DENIED } = await import('@/lib/minutes-access');
    if (!(await minutesAccess(input.groupId)).allowed) return { ok: false, error: MINUTES_DENIED };
    const { prisma } = await import('@stawi/db');
    const g = await prisma.group.findUnique({ where: { id: input.groupId }, select: { name: true, members: { select: { fullName: true } } } });
    groupName = g?.name ?? null;
    members = (g?.members ?? []).map((m) => m.fullName).filter((n) => n && n !== 'Group founder');
  }
  const { formalAiEnabled, writeWithAi } = await import('@/lib/formal-writer-ai');
  if (formalAiEnabled()) {
    const { getUserId } = await import('@/lib/auth');
    const p = (n: number) => String(n).padStart(2, '0');
    const d = new Date();
    const reply = await writeWithAi((await getUserId()) ?? 'unknown', minutesFromSpeechPrompt(transcript, { groupName, members, date: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}` }));
    if (reply === 'limit') return { ok: false, error: 'Today’s limit is reached. Use “Use these notes” below, or try tomorrow.' };
    const parsed = parseMinutesJson(reply, transcript);
    if (parsed) {
      try { assertClean(parsed.agendas.map((a) => `${a.title} ${a.resolution}`).join(' ')); return { ok: true, parsed, by: 'ai' }; } catch { /* fall through */ }
    }
  }
  return { ok: true, parsed: parseImportedNotes(transcript), by: 'parser' };
}
