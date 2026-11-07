import { NextResponse } from 'next/server';
import { CONTACT_EMAIL } from '@/lib/contact';

/**
 * GET /delete-account/email — public, stable link that opens a pre-filled
 * deletion-request email to the data controller. Nothing is stored here.
 */
export function GET() {
  const subject = 'Delete my Stawi account';
  const body =
    'Please delete my Stawi account and personal data.\n\nPhone number I signed in with: \n\n(You may text this number a code to confirm it is mine.)';
  const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return NextResponse.redirect(href, 302);
}
