import {
  type MemberStatementGenerate,
  MEMBER_STATEMENT_MODEL,
  MEMBER_STATEMENT_MAX_TOKENS,
} from '@stawi/core';

/**
 * Optional Anthropic generator for member statement explanations.
 *
 * Provider-neutral and opt-in: returns `undefined` for the default build (no
 * provider / no key), so `explainMemberStatement` uses the deterministic
 * template — offline, free, no secrets. When enabled it only rephrases the
 * member's own figures; the core re-screens and falls back to the template on
 * any empty/unsafe output or error. It never moves money and gives no advice.
 */

const LIVE_PROVIDERS = new Set(['anthropic', 'live']);
const DISABLED_PROVIDERS = new Set(['development', 'memory', 'off', 'none']);
const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const REQUEST_TIMEOUT_MS = 12_000;

/** First non-empty text block (skips any leading 5.x `thinking` block). */
function extractText(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const content = (body as { content?: unknown }).content;
  if (!Array.isArray(content)) return '';
  for (const block of content) {
    if (block && typeof block === 'object' && (block as { type?: unknown }).type === 'text') {
      const text = (block as { text?: unknown }).text;
      if (typeof text === 'string' && text.trim()) return text;
    }
  }
  return '';
}

export function createMemberStatementGenerate(): MemberStatementGenerate | undefined {
  const provider = (process.env.MEMBER_EXPLANATION_PROVIDER ?? '').trim().toLowerCase();
  if (DISABLED_PROVIDERS.has(provider)) return undefined;

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  // Opt-in: only an explicit live provider WITH a key turns the AI pass on.
  if (!LIVE_PROVIDERS.has(provider) || !apiKey) return undefined;

  const model = process.env.MEMBER_EXPLANATION_MODEL?.trim() || MEMBER_STATEMENT_MODEL;

  return async (prompt: string): Promise<string | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(ANTHROPIC_MESSAGES_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: MEMBER_STATEMENT_MAX_TOKENS,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const text = extractText(await res.json());
      return text || null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
}
