import type { Metadata } from 'next';
import { LegalPage, LegalSection, CONTACT_EMAIL } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy — Stawi',
  description: 'How Telpen Systems Ltd collects, uses, shares, keeps and deletes personal data in Stawi.',
};

const ul: React.CSSProperties = { margin: '6px 0 0', paddingLeft: 20 };

export default function PrivacyPage() {
  return (
    <LegalPage kicker="Legal" title="Privacy Policy" updated="07/11/26">
      <LegalSection h="1. Who we are">
        <p style={{ margin: 0 }}>
          Stawi is a record-keeping app for savings groups (chamas) operated by <b>Telpen Systems Ltd</b>, a company
          registered in Kenya, which is the <b>data controller</b> for the personal data described here under the
          Kenya <b>Data Protection Act, 2019</b>. Contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection h="2. What we collect">
        <ul style={ul}>
          <li><b>Phone number</b> — your sign-in identity and the number used for M-Pesa contribution requests. The first time you sign in on a phone we verify it with a 6-digit SMS code (valid 5 minutes, used once); after that you sign in on that phone with a 4-digit PIN.</li>
          <li><b>PIN and trusted devices</b> — your PIN is stored only as a one-way (bcrypt) hash, never in readable form. Each phone you trust gets a secure sign-in cookie, and we keep a hashed copy of it with its browser type and last-used date so you can see and sign out of your devices. Five wrong PINs lock PIN sign-in until you verify a new SMS code.</li>
          <li><b>Name</b> and, if your group adds them, your <b>role</b> (e.g. treasurer) and <b>photo</b>, plus the group&apos;s <b>logo</b> an official uploads. A photo of written meeting notes is read on your device to fill in the minutes.</li>
          <li><b>Group membership</b> — which groups you belong to and the group&apos;s charter, roster and meeting minutes that officials record (officials may enter a member&apos;s ID number in the roster for registration paperwork).</li>
          <li><b>Contributions</b> — amounts, dates and channel (cash or M-Pesa) recorded for you, fines and payouts, and the month-end statements built from them.</li>
          <li><b>M-Pesa transaction metadata</b> — for treasurer-initiated payment requests: the paying phone number, amount, M-Pesa receipt number, request IDs and result status returned by Safaricom. We never see or store your M-Pesa PIN.</li>
          <li><b>Technical data</b> — sign-in session and trusted-device cookies, and standard server logs (IP address, time, page) used for security, rate limiting and troubleshooting.</li>
        </ul>
        <p style={{ margin: '8px 0 0' }}>We do not collect your contacts, location, SMS inbox, photos library or device identifiers, and we show no advertising.</p>
      </LegalSection>

      <LegalSection h="3. Why we use it (lawful basis)">
        <ul style={ul}>
          <li>To provide the service you and your group signed up for — keeping group records, contributions and statements (performance of a contract).</li>
          <li>To sign you in securely and prevent fraud or abuse (legitimate interests).</li>
          <li>To send service SMS such as sign-in codes and payment confirmations (contract).</li>
          <li>To meet legal obligations, e.g. record-keeping or lawful requests from authorities (legal obligation).</li>
        </ul>
        <p style={{ margin: '8px 0 0' }}>Stawi does not offer loans, credit scoring or interest-bearing accounts, and we do not sell personal data.</p>
      </LegalSection>

      <LegalSection h="4. Who sees it">
        <ul style={ul}>
          <li><b>Your group</b> — members and officials of a group see that group&apos;s records; officials can edit them. Groups never see each other&apos;s data.</li>
          <li><b>Service providers</b> acting on our instructions: Supabase (sign-in), Africa&apos;s Talking (SMS delivery), Safaricom M-Pesa (payment requests), our cloud hosting and database providers, and — only if your group turns on statement explanations — Anthropic (to phrase a member&apos;s own monthly figures in plain language).</li>
          <li>Authorities, where the law requires it.</li>
        </ul>
        <p style={{ margin: '8px 0 0' }}>
          Some providers process data outside Kenya (for example in the EU or US). Where that happens we rely on the
          safeguards required by sections 48–50 of the Data Protection Act. Data is encrypted in transit (HTTPS).
        </p>
      </LegalSection>

      <LegalSection h="5. How long we keep it">
        <ul style={ul}>
          <li>Account and profile data: while your account is active; removed or anonymised within 30 days of a deletion request.</li>
          <li>Group financial records (contributions, statements, minutes): kept for as long as the group uses Stawi and up to 7 years afterwards, because they are shared records other members rely on and may be needed for audits or registration. After you delete your account they no longer carry your name or phone number.</li>
          <li>Server logs: up to 90 days.</li>
        </ul>
      </LegalSection>

      <LegalSection h="6. Your rights">
        <p style={{ margin: 0 }}>
          Under the Data Protection Act you may ask to access, correct or delete your personal data, object to or
          restrict its processing, and ask for a copy in a portable format. Email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>; we reply within 30 days. You can also complain to the
          Office of the Data Protection Commissioner (ODPC), Kenya.
        </p>
      </LegalSection>

      <LegalSection h="7. Deleting your account">
        <p style={{ margin: 0 }}>
          Sign in and open <a href="/account/delete">Account → Delete account</a>, or follow the steps at{' '}
          <a href="/delete-account">/delete-account</a> (including how to ask by email if you can no longer sign in).
          Deletion removes your sign-in, your PIN and trusted devices, and your name, phone number and photo from your groups; the group&apos;s
          shared financial records stay with the group without your personal details.
        </p>
      </LegalSection>

      <LegalSection h="8. Children">
        <p style={{ margin: 0 }}>Stawi is for adults (18+). We do not knowingly collect data from children.</p>
      </LegalSection>

      <LegalSection h="9. Changes">
        <p style={{ margin: 0 }}>We will post any change here with a new date, and tell you in the app if it is significant.</p>
      </LegalSection>
    </LegalPage>
  );
}
