/**
 * Content-safety gate — blocks abusive, inciteful, and hateful language.
 *
 * Evasion-resistant: normalizes leetspeak, repeated characters, and punctuation
 * before matching. Categories: hate, harassment (abuse), incitement (calls to
 * violence), threats, and profanity. High-severity categories are BLOCKED;
 * profanity alone is allowed-but-flagged.
 *
 * This is a deterministic first-line filter. For production scale, pair it with a
 * managed classifier (e.g. a hosted moderation API) behind the same interface —
 * `moderateText` is the seam. No wordlist catches everything; tune over time.
 */

export type ModerationCategory =
  | 'hate'
  | 'harassment'
  | 'incitement'
  | 'threat'
  | 'profanity';

export type ModerationSeverity = 'none' | 'low' | 'high';

export interface ModerationResult {
  allowed: boolean;
  severity: ModerationSeverity;
  categories: ModerationCategory[];
  /** Human-readable reason for the UI when blocked. */
  reason: string | null;
}

/** Normalize text to defeat common evasion tactics. */
export function normalizeForModeration(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[@4]/g, 'a')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[0]/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/(.)\1{2,}/g, '$1$1') // collapse 3+ repeats
    .replace(/[^a-z\s]/g, ' ')      // strip remaining non-letters
    .replace(/\s+/g, ' ')
    .trim();
}

// Pattern sets. Kept compact and category-based rather than exhaustive lists;
// incitement/threat rely on structure so they generalize across targets.
const PROFANITY = ['fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'crap'];

// Slurs/hate are matched via a small masked set + targeted-hate structure.
const HATE_TERMS = ['nigger', 'faggot', 'retard', 'kike', 'chink', 'spic', 'tranny'];
const HATE_STRUCTURE = [
  /\b(all|those|these)\s+\w+\s+(are|should)\s+(animals|vermin|subhuman|scum|cockroaches)\b/,
  /\bgo back to (your|where)\b/,
  /\b(hate|exterminate|cleanse)\s+(all\s+)?(the\s+)?\w+(s)?\b/,
];

const INCITEMENT = [
  /\b(kill|burn|attack|lynch|eliminate|wipe out|slaughter)\s+(all\s+|the\s+|them|those|these)?\w*/,
  /\blet'?s\s+(kill|attack|burn|destroy)\b/,
  /\b(rise up|take up arms)\s+(and|to)\s+(kill|attack|burn)\b/,
];

const THREAT = [
  /\bi('|\s*a)?m\s+going to\s+(kill|hurt|harm|find|beat)\s+you\b/,
  /\bi will\s+(kill|hurt|harm|beat|destroy|end)\s+you\b/,
  /\byou('|\s*a)?re\s+(dead|finished)\b/,
  /\bwatch your back\b/,
];

const HARASSMENT = [
  /\byou('|\s*a)?re\s+(worthless|pathetic|stupid|an idiot|a loser|trash|garbage|disgusting)\b/,
  /\b(kill|kys)\s+yourself\b/,
  /\bnobody\s+(likes|wants)\s+you\b/,
];

function hits(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}
function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => new RegExp(`\\b${w}\\b`).test(text));
}

export function moderateText(input: string): ModerationResult {
  const t = normalizeForModeration(input);
  const categories: ModerationCategory[] = [];

  if (includesAny(t, HATE_TERMS) || hits(t, HATE_STRUCTURE)) categories.push('hate');
  if (hits(t, INCITEMENT)) categories.push('incitement');
  if (hits(t, THREAT)) categories.push('threat');
  if (hits(t, HARASSMENT)) categories.push('harassment');
  if (includesAny(t, PROFANITY)) categories.push('profanity');

  const highCats = categories.filter((c) => c !== 'profanity');
  if (highCats.length > 0) {
    const labels: Record<ModerationCategory, string> = {
      hate: 'hateful language',
      incitement: 'incitement to violence',
      threat: 'a threat',
      harassment: 'abusive/harassing language',
      profanity: 'profanity',
    };
    return {
      allowed: false,
      severity: 'high',
      categories,
      reason: `This message can't be posted: it contains ${highCats.map((c) => labels[c]).join(' and ')}. Please keep Stawi respectful and safe for everyone.`,
    };
  }

  if (categories.includes('profanity')) {
    return { allowed: true, severity: 'low', categories, reason: null };
  }
  return { allowed: true, severity: 'none', categories: [], reason: null };
}

/** Throwing guard for server-side use. */
export function assertClean(input: string): void {
  const r = moderateText(input);
  if (!r.allowed) throw new Error(r.reason ?? 'Content blocked by moderation policy.');
}
