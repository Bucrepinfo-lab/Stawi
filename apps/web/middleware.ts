import { NextResponse, type NextRequest } from 'next/server';
import { resolveTenantSlug } from '@stawi/core';
import { updateSupabaseSession } from '@/lib/supabase/middleware';

const PUBLIC: RegExp[] = [
  /^\/$/,
  /^\/sign-in/,
  /^\/sign-up/,
  /^\/terms/,
  /^\/subscribe/,
  /^\/api\/health/,
  /^\/api\/mpesa\/callback/,
  /^\/api\/billing\/webhook/,
  /^\/api\/webhooks\/clerk/,
  /^\/api\/auth\/send-sms/,
  /^\/api\/mobile/,
];

const isPublic = (pathname: string) => PUBLIC.some((re) => re.test(pathname));

export async function middleware(request: NextRequest) {
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

  return response;
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
