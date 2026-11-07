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
