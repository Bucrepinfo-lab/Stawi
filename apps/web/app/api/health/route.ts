import { NextResponse } from 'next/server';

// Health check for DigitalOcean App Platform.
export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'stawi-web',
    time: new Date().toISOString(),
  });
}
