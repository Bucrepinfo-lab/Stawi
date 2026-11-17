/**
 * Android Trusted Web Activity (TWA) — Digital Asset Links.
 *
 * `/.well-known/assetlinks.json` proves the web origin trusts the Play app, so
 * the TWA opens full-screen without a browser bar. Fingerprints come from env
 * (ANDROID_CERT_FINGERPRINTS, comma-separated): include BOTH the upload key and
 * the Google Play app-signing key SHA-256 values.
 */

export const ANDROID_PACKAGE_NAME = 'ke.stawi.app';

const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

/** Parse, normalise (upper-case) and de-duplicate SHA-256 cert fingerprints; drops malformed ones. */
export function parseCertFingerprints(csv: string | undefined): string[] {
  if (!csv) return [];
  const out: string[] = [];
  for (const raw of csv.split(/[,\s]+/)) {
    const fp = raw.trim().toUpperCase();
    if (FINGERPRINT.test(fp) && !out.includes(fp)) out.push(fp);
  }
  return out;
}

export interface AssetLinkStatement {
  relation: string[];
  target: { namespace: 'android_app'; package_name: string; sha256_cert_fingerprints: string[] };
}

/** The assetlinks.json body. Empty array when no valid fingerprint is configured. */
export function buildAssetLinks(csv: string | undefined, packageName: string = ANDROID_PACKAGE_NAME): AssetLinkStatement[] {
  const fingerprints = parseCertFingerprints(csv);
  if (fingerprints.length === 0) return [];
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: fingerprints },
    },
  ];
}

/**
 * Google Play payments policy (owner instruction 17/11/26: "streamline each to
 * comply with Play Store policies") — PURE. Inside the Play app (TWA), Stawi
 * does not sell its own subscription plans: Kenya is not in Play's
 * alternative-billing programmes, so plans are bought on the web only, with no
 * in-app link steering there. Group M-Pesa contributions (real money between
 * members and their group's own paybill) are not Stawi's digital service and
 * are unaffected. Same approach as HarvestHub and Telpen Edu.
 *
 * Signal: the TWA's launch request carries `Referer: android-app://ke.stawi.app`;
 * the middleware remembers it in a session cookie.
 */
export const PLAY_APP_COOKIE = 'stawi_play_app';
export const PLAY_APP_REFERRER_PREFIX = 'android-app://';
export const PLAY_APP_PURCHASE_UNAVAILABLE = "Stawi plans can't be bought in the Android app.";

export function isPlayAppSignal(s: { cookie?: string | null; referrer?: string | null }): boolean {
  if (s.cookie === '1') return true;
  return (s.referrer ?? '').startsWith(PLAY_APP_REFERRER_PREFIX);
}

export function shouldMarkPlayApp(referrer: string | null | undefined, cookie: string | null | undefined): boolean {
  return cookie !== '1' && (referrer ?? '').startsWith(PLAY_APP_REFERRER_PREFIX);
}

/** Stawi's own plan purchases are allowed only outside the Play app. */
export function planPurchasesAllowed(s: { cookie?: string | null; referrer?: string | null }): boolean {
  return !isPlayAppSignal(s);
}
