/**
 * Server-side feature flags.
 *
 * SACCO+ (Pillar 4: loan products, credit scoring, loan applications, deposit
 * interest accrual, withdrawals/remittances and their marketing) is OFF unless
 * the deployment sets `SACCO_PLUS_ENABLED=true`. Stawi v1 ships to Google Play
 * without lending: Play does not list Kenyan loan apps without a CBK digital
 * credit licence. Turning the flag off hides nothing destructively — existing
 * SACCO+ rows stay in the database untouched; the server simply refuses to
 * read, write or advertise them.
 *
 * Pure: the environment is passed in (defaults to `process.env` when present),
 * so the same check runs in route handlers, server actions, middleware, the db
 * layer and tests.
 */

export type FlagEnv = Record<string, string | undefined>;

export const SACCO_PLUS_FLAG = 'SACCO_PLUS_ENABLED';

function defaultEnv(): FlagEnv {
  const p = (globalThis as { process?: { env?: FlagEnv } }).process;
  return p?.env ?? {};
}

/** Truthy only for an explicit opt-in: "true", "1", "yes", "on" (any case). */
export function isFlagOn(value: string | undefined): boolean {
  if (!value) return false;
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
}

/** Is SACCO+ (lending, interest, scoring, withdrawals) enabled? Default: no. */
export function isSaccoPlusEnabled(env: FlagEnv = defaultEnv()): boolean {
  return isFlagOn(env[SACCO_PLUS_FLAG]);
}

/** Thrown by server paths that belong to a disabled feature. Maps to HTTP 404. */
export class FeatureDisabledError extends Error {
  readonly code = 'FEATURE_DISABLED';
  readonly status = 404;
  constructor(readonly feature: string) {
    super(`${feature} is not available.`);
    this.name = 'FeatureDisabledError';
  }
}

/** Guard for every SACCO+ server path. Throws FeatureDisabledError when off. */
export function assertSaccoPlusEnabled(env: FlagEnv = defaultEnv()): void {
  if (!isSaccoPlusEnabled(env)) throw new FeatureDisabledError('SACCO+');
}

/** User-facing message returned by server actions when SACCO+ is off. */
export const SACCO_PLUS_DISABLED_MESSAGE = 'This feature is not available.';

/**
 * Request paths that belong to SACCO+. Middleware answers 404 for these when
 * the flag is off (the pages and actions also refuse on their own).
 */
const SACCO_PLUS_PATHS: RegExp[] = [/^\/sacco(?:\/|$)/, /^\/api\/sacco(?:\/|$)/, /^\/api\/loans?(?:\/|$)/];

export function isSaccoPlusPath(pathname: string): boolean {
  return SACCO_PLUS_PATHS.some((re) => re.test(pathname));
}
