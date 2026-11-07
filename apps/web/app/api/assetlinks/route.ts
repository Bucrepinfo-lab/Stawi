import { NextResponse } from 'next/server';
import { buildAssetLinks } from '@stawi/core';

// Served at /.well-known/assetlinks.json (rewrite in next.config.mjs).
// Read per request so a fingerprint change needs only `fly secrets set`.
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(buildAssetLinks(process.env.ANDROID_CERT_FINGERPRINTS), {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}
