'use server';

/**
 * "Research deeper on the web" for the shortlist (owner 28/11/26). Signed-in
 * people only; ideas are re-read from the shortlist link format so only
 * catalogue ideas with sane numbers are ever sent. Capped per person per day.
 */
import type { WebResearch } from '@/lib/idea-research-ai';

export type WebResearchResult = { ok: true; research: WebResearch } | { ok: false; error: string };

export async function researchIdeasOnWebAction(params: string[], capitalCents: number): Promise<WebResearchResult> {
  const { getUserId } = await import('@/lib/auth');
  const userId = await getUserId();
  if (!userId) return { ok: false, error: 'Sign in to research on the web.' };
  const { ideasFromParams } = await import('@stawi/core');
  const ideas = ideasFromParams(Array.isArray(params) ? params.map(String) : []);
  if (ideas.length < 2) return { ok: false, error: 'Save at least two ideas to research them together.' };
  const cap = Number.isSafeInteger(capitalCents) && capitalCents > 0 && capitalCents < 1e13 ? capitalCents : 0;
  const { researchIdeasOnWeb, ideaResearchEnabled } = await import('@/lib/idea-research-ai');
  if (!ideaResearchEnabled()) return { ok: false, error: 'Web research is not switched on yet. Stawi’s own research above still applies.' };
  const out = await researchIdeasOnWeb(userId, ideas, cap);
  if (out === 'limit') return { ok: false, error: 'You have used today’s web research. Try again tomorrow; Stawi’s own research above still applies.' };
  if (!out) return { ok: false, error: 'The web research did not finish this time. Try again in a minute.' };
  return { ok: true, research: out };
}
