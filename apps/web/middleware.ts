import { NextResponse, type NextRequest } from 'next/server';
import { resolveTenantSlug, isSaccoPlusEnabled, isSaccoPlusPath, DEVICE_COOKIE, PIN_SKIP_COOKIE } from '@stawi/core';
import { updateSupabaseSession } from '@/lib/supabase/middleware';

const PUBLIC: RegExp[] = [
  /^\/$/,
  /^\/sign-in/,
  /^\/sign-up/,
  /^\/terms/,
  /^\/privacy(?:\/|$)/,
  /^\/delete-account(?:\/|$)/,
  /^\/subscribe/,
  /^\/api\/health/,
  /^\/\.well-known\//,
  /^\/api\/assetlinks/,
  /^\/offline\.html$/,
  /^\/api\/mpesa\/callback/,
  /^\/api\/billing\/webhook/,
  /^\/api\/webhooks\/clerk/,
  /^\/api\/auth\/send-sms/,
  /^\/api\/auth\/otp\/(send|verify)$/,
  /^\/api\/auth\/pin\/(status|sign-in)$/,
  /^\/api\/mobile/,
];

const isPublic = (pathname: string) => PUBLIC.some((re) => re.test(pathname));

export async function middleware(request: NextRequest) {
  // Liveness probe (Fly health check + deploy workflow): answer without touching
  // Supabase, so health reflects the server itself, not an auth provider.
  if (request.nextUrl.pathname === '/api/health') return NextResponse.next();
  // Digital Asset Links must be served to Google's verifier without auth.
  if (request.nextUrl.pathname === '/.well-known/assetlinks.json' || request.nextUrl.pathname === '/api/assetlinks') {
    return NextResponse.next();
  }

  // SACCO+ (loans, interest, scoring) is off unless SACCO_PLUS_ENABLED=true:
  // its routes answer 404 for everyone. The pages, server actions and db repo
  // refuse again on their own (defence in depth).
  if (isSaccoPlusPath(request.nextUrl.pathname) && !isSaccoPlusEnabled(process.env)) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Resolve the active tenant from subdomain or /t/{slug} and forward it downstream.
  const slug = resolveTenantSlug({
    host: request.headers.get('host'),
    pathname: request.nextUrl.pathname,
    rootDomain: process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'stawi.app',
  });
  const forwardHeaders = new Headers(request.headers);
  if (slug) forwardHeaders.set('x-stawi-tenant-slug', slug);

  const { response, user } = await updateSupabaseSession(request, forwardHeaders);
  const { pathname } = request.nextUrl;

  if (!isPublic(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Owner rule 07/11/26: after the first verified SMS sign-in on a device the
  // user sets a 4-digit PIN (which trusts this device). Until then, app pages
  // send them to /pin/setup. Only when the PIN feature is configured.
  const pinOn = !!(process.env.DATABASE_URL && process.env.AUTH_DEVICE_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (
    pinOn &&
    user &&
    !isPublic(pathname) &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/pin/') &&
    !pathname.startsWith('/account/') &&
    !request.cookies.get(DEVICE_COOKIE) &&
    !request.cookies.get(PIN_SKIP_COOKIE)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/pin/setup';
    url.search = '';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
