import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection, CONTACT_EMAIL } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Delete your Stawi account',
  description: 'How to delete your Stawi account and personal data, in the app or by email.',
};

const ol: React.CSSProperties = { margin: '6px 0 0', paddingLeft: 20 };

/** Public (no sign-in) account-deletion instructions — the Google Play deletion URL. */
export default function DeleteAccountInfoPage() {
  return (
    <LegalPage kicker="Your data" title="Delete your Stawi account" updated="07/11/26">
      <LegalSection h="Delete it in the app (fastest)">
        <ol style={ol}>
          <li><Link href="/sign-in?next=/account/delete">Sign in</Link> with your phone number and the SMS code.</li>
          <li>Open <Link href="/account/delete">/account/delete</Link> (Account → Delete account).</li>
          <li>Type <b>DELETE</b> and confirm. You are signed out straight away.</li>
        </ol>
      </LegalSection>

      <LegalSection h="Can't sign in? Ask by email">
        <p style={{ margin: 0 }}>
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from any address with the subject
          “Delete my Stawi account” and the phone number you signed in with — or use{' '}
          <a href="/delete-account/email">this pre-filled email</a>. We confirm the number belongs to you (we may text
          it a code) and complete the deletion within 30 days.
        </p>
      </LegalSection>

      <LegalSection h="What is deleted">
        <ul style={ol}>
          <li>Your sign-in (phone login).</li>
          <li>Your name, phone number and photo on every group you belong to.</li>
        </ul>
      </LegalSection>

      <LegalSection h="What is kept, and for how long">
        <p style={{ margin: 0 }}>
          Contributions, statements and minutes are your group&apos;s shared financial records, so they stay with the
          group — shown as “Deleted member”, without your name or number — for as long as the group uses Stawi and up
          to 7 years afterwards. Server logs are kept up to 90 days. See the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
