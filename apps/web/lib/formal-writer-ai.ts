/**
 * Claude reads the photo (handwriting included) or the words, and writes the
 * formal document (owner 26/11/26). Provider-neutral and opt-in: with no
 * ANTHROPIC_API_KEY, or FORMAL_WRITER_PROVIDER=off, it returns undefined and
 * the page reads the photo on the phone (Tesseract) and uses the no-AI frame.
 * Spend cap: per person and per day, in memory (FORMAL_WRITER_DAILY_*).
 * Nothing is stored; the photo goes to Anthropic only to be read.
 */
import { WindowLimiter } from '@stawi/core';

const URL_MESSAGES = 'https://api.anthropic.com/v1/messages';
const TIMEOUT_MS = 45_000;
const DAY = 24 * 60 * 60 * 1000;
const perUser = new WindowLimiter({ max: Number(process.env.FORMAL_WRITER_DAILY_PER_USER) || 10, windowMs: DAY });
const perApp = new WindowLimiter({ max: Number(process.env.FORMAL_WRITER_DAILY_TOTAL) || 300, windowMs: DAY });

export type WriteImage = { mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; base64: string };

export function formalAiEnabled(): boolean {
  const provider = (process.env.FORMAL_WRITER_PROVIDER ?? '').trim().toLowerCase();
  if (['off', 'none', 'development', 'memory'].includes(provider)) return false;
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}

/** null = the AI could not help this time; 'limit' = today's cap is reached. */
export async function writeWithAi(userId: string, prompt: string, image?: WriteImage): Promise<string | null | 'limit'> {
  if (!formalAiEnabled()) return null;
  if (!perUser.hit(userId).allowed || !perApp.hit('all').allowed) return 'limit';
  const { FORMAL_MODEL, FORMAL_MAX_TOKENS } = await import('@stawi/core');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const content: unknown[] = [];
    if (image) content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } });
    content.push({ type: 'text', text: prompt });
    const res = await fetch(URL_MESSAGES, {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!.trim(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.FORMAL_WRITER_MODEL?.trim() || FORMAL_MODEL, max_tokens: FORMAL_MAX_TOKENS, messages: [{ role: 'user', content }] }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn('[write] AI answered', res.status);
      return null;
    }
    const body = (await res.json()) as { content?: { type?: string; text?: string }[] };
    return body.content?.find((b) => b.type === 'text' && b.text?.trim())?.text ?? null;
  } catch (err) {
    console.warn('[write] AI failed', err instanceof Error ? err.name : 'error');
    return null;
  } finally {
    clearTimeout(timer);
  }
}
