/**
 * "Research deeper on the web" for the Ideas shortlist (owner 28/11/26).
 * Claude searches the web (Anthropic web search tool) for current Kenyan
 * prices, demand, rules and risks for the 2–3 shortlisted ideas, and answers
 * with sources. Provider-neutral and opt-in: without ANTHROPIC_API_KEY, or
 * IDEA_RESEARCH_PROVIDER=off, the page shows Stawi's built-in research only.
 * Spend cap: per person and per app, per day, in memory
 * (IDEA_RESEARCH_DAILY_PER_USER, IDEA_RESEARCH_DAILY_TOTAL); at most
 * IDEA_RESEARCH_MAX_SEARCHES web searches per run (default 6, about US$0.06).
 * Nothing about the person or group is sent: only the idea names, rough
 * costs and the country.
 */
import { WindowLimiter, formatMoney, type Venture } from '@stawi/core';

const URL_MESSAGES = 'https://api.anthropic.com/v1/messages';
const TIMEOUT_MS = 90_000;
const DAY = 24 * 60 * 60 * 1000;
const perUser = new WindowLimiter({ max: Number(process.env.IDEA_RESEARCH_DAILY_PER_USER) || 3, windowMs: DAY });
const perApp = new WindowLimiter({ max: Number(process.env.IDEA_RESEARCH_DAILY_TOTAL) || 60, windowMs: DAY });
export const IDEA_RESEARCH_MODEL = 'claude-sonnet-5-5';

export interface WebResearch {
  /** Plain text with "## " headings, one section per idea plus a verdict. */
  text: string;
  sources: { title: string; url: string }[];
  searches: number;
}

export function ideaResearchEnabled(): boolean {
  const provider = (process.env.IDEA_RESEARCH_PROVIDER ?? process.env.FORMAL_WRITER_PROVIDER ?? '').trim().toLowerCase();
  if (['off', 'none', 'development', 'memory'].includes(provider)) return false;
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}

export function ideaResearchPrompt(ideas: Venture[], capitalCents: number): string {
  const list = ideas
    .map((v, i) => `${i + 1}. ${v.title} — rough startup KES ${formatMoney(v.startupCents)}, rough gross margin ${v.marginPct}%`)
    .join('\n');
  return [
    'A savings group (chama) in Kenya is choosing ONE business to invest in. Research these shortlisted ideas on the web, using current Kenyan sources (2025–2026 where possible):',
    list,
    capitalCents > 0 ? `The group has about KES ${formatMoney(capitalCents)} saved.` : '',
    '',
    'For EACH idea write a section that starts with "## " and the idea name, covering, in short plain sentences a non-expert can follow:',
    '- Current startup costs in Kenya (main items with KES prices you found) and running costs per month',
    '- Realistic monthly sales and profit for a small operator, and months to earn the money back',
    '- Demand and competition now, and who the buyers are',
    '- Licences and rules in Kenya (county permit, NEMA, KEBS, public health, NTSA, etc.) with any recent changes',
    '- The biggest risks and how small operators protect themselves',
    '- Ways to grow or branch out once it works',
    'Then a final section "## Verdict" that ranks the ideas: most favourable, second, weakest, each with one sentence why, and one sentence on what the group must check on the ground before deciding.',
    'Rules: use KES; say "about" for estimates; if sources disagree give the range; never invent a figure you did not find, say "not found" instead. No more than 650 words in total. No tables.',
  ]
    .filter((l) => l !== '')
    .join('\n');
}

type Block = { type?: string; text?: string; citations?: { url?: string; title?: string }[] };

/** Pure: join the text blocks and collect unique cited sources. */
export function readResearchAnswer(body: { content?: Block[]; usage?: { server_tool_use?: { web_search_requests?: number } } }): WebResearch | null {
  const blocks = body.content ?? [];
  const text = blocks
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text!)
    .join('')
    .trim();
  if (text.length < 200) return null;
  const seen = new Set<string>();
  const sources: WebResearch['sources'] = [];
  for (const b of blocks) {
    for (const c of b.citations ?? []) {
      if (!c.url || !/^https:\/\//.test(c.url) || seen.has(c.url)) continue;
      seen.add(c.url);
      sources.push({ url: c.url, title: (c.title || c.url).slice(0, 140) });
    }
  }
  // Drop any preamble before the first heading ("I'll search for…").
  const start = text.indexOf('## ');
  return { text: (start >= 0 ? text.slice(start) : text).slice(0, 8000), sources: sources.slice(0, 20), searches: body.usage?.server_tool_use?.web_search_requests ?? 0 };
}

/** null = could not research this time; 'limit' = today's cap reached. */
export async function researchIdeasOnWeb(userId: string, ideas: Venture[], capitalCents: number): Promise<WebResearch | null | 'limit'> {
  if (!ideaResearchEnabled() || ideas.length === 0) return null;
  if (!perUser.hit(userId).allowed || !perApp.hit('all').allowed) return 'limit';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const search: Record<string, unknown> = {
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: Math.min(10, Number(process.env.IDEA_RESEARCH_MAX_SEARCHES) || 6),
      // No user_location: the API refuses country code KE (Fly log 28/11/26). The prompt names Kenya.
    };
    const tools = [search];
    let triedWithoutPlace = false;
    const messages: { role: 'user' | 'assistant'; content: unknown }[] = [{ role: 'user', content: ideaResearchPrompt(ideas, capitalCents) }];
    // A long search turn can pause; send it back as it came, at most twice.
    for (let round = 0; round < 3; round++) {
      const res = await fetch(URL_MESSAGES, {
        method: 'POST',
        headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!.trim(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: process.env.IDEA_RESEARCH_MODEL?.trim() || IDEA_RESEARCH_MODEL, max_tokens: Math.min(16000, Number(process.env.IDEA_RESEARCH_MAX_TOKENS) || 12000), messages, tools }),
        signal: controller.signal,
      });
      if (!res.ok) {
        // Log the API's own reason (never the key) so a refusal is clear in the Fly logs.
        const why = await res.json().then((b: { error?: { type?: string; message?: string } }) => `${b.error?.type ?? ''}: ${b.error?.message ?? ''}`.slice(0, 240)).catch(() => '');
        console.warn('[ideas] research answered', res.status, why);
        // The search location is optional; some country codes are refused with a 400. Try once without it.
        if (res.status === 400 && !triedWithoutPlace && 'user_location' in search) {
          triedWithoutPlace = true;
          delete search.user_location;
          round--;
          continue;
        }
        return null;
      }
      const body = (await res.json()) as Parameters<typeof readResearchAnswer>[0] & { stop_reason?: string };
      if (body.stop_reason === 'pause_turn' && round < 2) {
        messages.push({ role: 'assistant', content: body.content });
        continue;
      }
      const out = readResearchAnswer(body);
      if (!out) console.warn("[ideas] research came back empty", body.stop_reason ?? "", (body.content ?? []).map((b) => b.type).join(","));
      return out;
    }
    return null;
  } catch (err) {
    console.warn('[ideas] research failed', err instanceof Error ? err.name : 'error');
    return null;
  } finally {
    clearTimeout(timer);
  }
}
