import { NextResponse } from 'next/server';

// Health check for Fly.io (fly.toml [[http_service.checks]]) and the deploy workflow.
export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'stawi-web',
    time: new Date().toISOString(),
  });
}
