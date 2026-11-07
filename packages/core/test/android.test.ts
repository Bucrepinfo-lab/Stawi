import { describe, it, expect } from 'vitest';
import { buildAssetLinks, parseCertFingerprints, ANDROID_PACKAGE_NAME } from '../src/android';

const A = Array.from({ length: 32 }, (_, i) => (i * 7 % 256).toString(16).padStart(2, '0')).join(':');
const B = Array.from({ length: 32 }, () => 'AB').join(':');

describe('assetlinks', () => {
  it('returns [] when no fingerprints are configured', () => {
    expect(buildAssetLinks(undefined)).toEqual([]);
    expect(buildAssetLinks('')).toEqual([]);
    expect(buildAssetLinks('not-a-fingerprint')).toEqual([]);
  });

  it('normalises to upper case, de-duplicates and keeps upload + Play signing keys', () => {
    expect(parseCertFingerprints(`${A}, ${B} ,${A.toUpperCase()}`)).toEqual([A.toUpperCase(), B]);
  });

  it('targets the ke.stawi.app package with handle_all_urls', () => {
    const [s] = buildAssetLinks(`${A},${B}`);
    expect(ANDROID_PACKAGE_NAME).toBe('ke.stawi.app');
    expect(s?.relation).toEqual(['delegate_permission/common.handle_all_urls']);
    expect(s?.target.package_name).toBe('ke.stawi.app');
    expect(s?.target.sha256_cert_fingerprints).toEqual([A.toUpperCase(), B]);
  });
});
