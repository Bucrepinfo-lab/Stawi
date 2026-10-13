/**
 * Member statement explainer — plain-language "what this means for me".
 *
 * Takes a single member's month figures (already computed, integer cents) and
 * produces a short, warm explanation the member can understand. Same discipline
 * as the minutes paraphraser: FULLY DETERMINISTIC by default (same input → same
 * text, offline, no keys), with an OPTIONAL live-on-key AI pass that only
 * rephrases the figures. The member is never blocked on it.
 *
 * STRICT read-only / propose-only: this explains the member's OWN existing
 * numbers. It never moves money, never gives financial advice, never
 * recommends saving/borrowing, and never projects or invents figures. The AI
 * output is re-screened by the moderation core before it is trusted.
 */

import { formatKes } from './minutes-prose';
import { moderateText } from './moderation';
import type { MemberMonthStat, MonthFinance } from './statement';

export interface MemberStatementExplanationInput {
  groupName: string;
  /** Period label, e.g. "October 2026". */
  periodLabel: string;
  /** Currency code for formatting; defaults to KES. */
  currency?: string;
  /** Meetings the group held in the period (for the attendance line). */
  meetingsHeld: number;
  /** The member's own figures for the period. */
  member: MemberMonthStat;
  /** The group's month finance (closing balance context only). */
  finance: MonthFinance;
}

/** Keep it short — a few sentences a member reads on a phone. */
export const MEMBER_STATEMENT_MAX_CHARS = 600;

/** Cheapest suitable tier; override with MEMBER_EXPLANATION_MODEL. */
export const MEMBER_STATEMENT_MODEL = 'claude-haiku-5-5';
/**
 * Output ceiling. Current (5.x) models emit a `thinking` block before the text,
 * so a tight budget leaves no room for the explanation; `max_tokens` only caps
 * output and billing is per token produced, so this does not raise cost.
 * Override with MEMBER_EXPLANATION_MAX_TOKENS.
 */
export const MEMBER_STATEMENT_MAX_TOKENS = 1024;

function clamp(value: string, max: number): string {
  const text = value.trim().replace(/\s+/g, ' ');
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * The deterministic, advice-free explanation. Always available, costs nothing,
 * states only the member's own figures.
 */
export function memberStatementTemplate(input: MemberStatementExplanationInput): string {
  const currency = input.currency ?? 'KES';
  const m = input.member;
  const name = (m.name || 'Member').trim();
  const attended = m.meetingsPresent;
  const parts: string[] = [];

  parts.push(`Hello ${name}. Here is your ${input.periodLabel} summary for ${input.groupName}.`);
  parts.push(`You contributed ${formatKes(m.contributedCents, currency)}.`);
  if (m.finesCents > 0) {
    parts.push(`Fines recorded against your name came to ${formatKes(m.finesCents, currency)}.`);
  }
  if (input.meetingsHeld > 0) {
    parts.push(
      `You attended ${attended} of ${input.meetingsHeld} meeting(s) (${Math.round(m.attendancePct)}% attendance).`,
    );
  }
  parts.push(`The group's balance at the end of the month was ${formatKes(input.finance.closingCents, currency)}.`);
  parts.push('Thank you for being part of the group.');

  return clamp(parts.join(' '), MEMBER_STATEMENT_MAX_CHARS);
}

/**
 * The instruction for the optional AI pass. The template is the seed so the
 * model rephrases rather than inventing, and the rules forbid advice outright.
 */
export function memberStatementPrompt(input: MemberStatementExplanationInput): string {
  const currency = input.currency ?? 'KES';
  return [
    `You rewrite a savings-group member's monthly figures into a short, warm, plain-English note they can understand on their phone.`,
    'Rules:',
    `- At most ${MEMBER_STATEMENT_MAX_CHARS} characters. Plain text only, no markdown.`,
    '- Use ONLY the figures provided. Never invent or project numbers, balances, interest or dividends.',
    '- This is NOT financial advice. Never recommend saving more, borrowing, investing, or any action. Never give an opinion on the member\'s finances.',
    '- Warm and respectful. Do not add a greeting beyond the member\'s name.',
    '',
    'Figures:',
    JSON.stringify(
      {
        group: input.groupName,
        period: input.periodLabel,
        currency,
        meetingsHeld: input.meetingsHeld,
        member: {
          name: input.member.name,
          contributed: input.member.contributedCents,
          fines: input.member.finesCents,
          meetingsPresent: input.member.meetingsPresent,
          attendancePct: input.member.attendancePct,
        },
        groupClosingBalance: input.finance.closingCents,
      },
      null,
      0,
    ),
    '',
    'A correct baseline (improve its wording, keep its facts, add nothing):',
    memberStatementTemplate(input),
  ].join('\n');
}

/**
 * Clean the model reply into a single safe line. Returns null when empty or when
 * the moderation core flags it, so the caller falls back to the template.
 */
export function parseMemberStatementExplanation(text: string): string | null {
  if (!text) return null;
  const cleaned = clamp(text.replace(/^["'\s]+|["'\s]+$/g, ''), MEMBER_STATEMENT_MAX_CHARS);
  if (!cleaned) return null;
  if (!moderateText(cleaned).allowed) return null;
  return cleaned;
}

/** The optional AI text generator; returns the model's raw reply, or null. */
export type MemberStatementGenerate = (prompt: string) => Promise<string | null>;

export interface MemberStatementExplanation {
  text: string;
  /** True when the AI pass produced the text; false when the template was used. */
  usedModel: boolean;
}

/**
 * Produce the explanation. With no `generate` (the default build) this is the
 * deterministic template. With one, it runs the AI pass, re-screens the output,
 * and falls back to the template on empty/unsafe output or any error — so a
 * member always gets a correct, advice-free summary.
 */
export async function explainMemberStatement(
  input: MemberStatementExplanationInput,
  generate?: MemberStatementGenerate,
): Promise<MemberStatementExplanation> {
  const fallback = memberStatementTemplate(input);
  if (!generate) return { text: fallback, usedModel: false };

  try {
    const raw = await generate(memberStatementPrompt(input));
    const parsed = raw ? parseMemberStatementExplanation(raw) : null;
    if (!parsed) return { text: fallback, usedModel: false };
    return { text: parsed, usedModel: true };
  } catch {
    return { text: fallback, usedModel: false };
  }
}
