import Link from 'next/link';
import { Picture, type PictureName } from './Pictures';

/**
 * The homepage path for people who are not technical (owner 26/11/26): first
 * "What would you like to do?" with one big plain choice per reason people
 * come, then "How it works" in the order a new member really goes, then help.
 * English and Kiswahili; other languages fall back to English here.
 */
type Lang = 'en' | 'sw';

const COPY: Record<Lang, {
  choose: string; chooseSub: string;
  choices: { href: string; pic: PictureName; title: string; body: string }[];
  how: string; howSub: string;
  steps: { title: string; body: string }[];
  start: string; demo: string;
  help: string; helpBody: string;
}> = {
  en: {
    choose: 'What would you like to do?',
    chooseSub: 'Tap one to start. You can do the others later.',
    choices: [
      { href: '/dashboard', pic: 'moneybag', title: 'Run my chama’s money', body: 'Record contributions. Every member sees every shilling and confirms their own.' },
      { href: '/dashboard', pic: 'mic', title: 'Speak our minutes', body: 'Say what happened at the meeting in Kiswahili or English. Stawi writes the minutes.' },
      { href: '/match', pic: 'growth', title: 'Find a business to start', body: 'Ideas that fit your group’s money, and a funding proposal written for you.' },
      { href: '/books', pic: 'shop', title: 'Keep my shop’s books', body: 'Sales, stock and money in and out, for a shop, butchery, hotel or pub.' },
    ],
    how: 'How it works',
    howSub: 'Four steps, all on your phone.',
    steps: [
      { title: 'Sign in with your phone', body: 'Your phone number and a 4-digit PIN. No email. Your first month is free.' },
      { title: 'Join or start your group', body: 'Try the demo chama first, or add your own members by their phone numbers.' },
      { title: 'Record, and everyone sees', body: 'Each contribution needs a witness, and members get an alert. Mistakes need five approvals to fix.' },
      { title: 'Grow together', body: 'Pick a business idea, get the proposal for a bank or SACCO, and keep the books.' },
    ],
    start: 'Open my group',
    demo: 'Try the demo chama',
    help: 'Need help?',
    helpBody: 'Write to telpeninfo@gmail.com and tell us what you tapped. We answer the same day.',
  },
  sw: {
    choose: 'Ungependa kufanya nini?',
    chooseSub: 'Gusa kimoja uanze. Vingine utafanya baadaye.',
    choices: [
      { href: '/dashboard', pic: 'moneybag', title: 'Simamia pesa za chama', body: 'Rekodi michango. Kila mwanachama anaona kila shilingi na kuthibitisha yake.' },
      { href: '/dashboard', pic: 'mic', title: 'Sema kumbukumbu za mkutano', body: 'Eleza yaliyotokea mkutanoni kwa Kiswahili au Kiingereza. Stawi itaandika kumbukumbu.' },
      { href: '/match', pic: 'growth', title: 'Pata biashara ya kuanza', body: 'Mawazo yanayolingana na pesa za kikundi, na pendekezo la ufadhili limeandikwa kwa ajili yenu.' },
      { href: '/books', pic: 'shop', title: 'Weka hesabu za duka', body: 'Mauzo, bidhaa na pesa zinazoingia na kutoka, kwa duka, bucha, hoteli au baa.' },
    ],
    how: 'Inavyofanya kazi',
    howSub: 'Hatua nne, zote kwenye simu yako.',
    steps: [
      { title: 'Ingia kwa simu yako', body: 'Namba yako ya simu na PIN ya tarakimu 4. Hakuna barua pepe. Mwezi wa kwanza ni bure.' },
      { title: 'Jiunge au anzisha kikundi', body: 'Jaribu chama cha mfano kwanza, au ongeza wanachama wako kwa namba zao za simu.' },
      { title: 'Rekodi, na wote wanaona', body: 'Kila mchango unahitaji shahidi, na wanachama wanapata taarifa. Kurekebisha kosa kunahitaji idhini tano.' },
      { title: 'Kuweni pamoja', body: 'Chagueni wazo la biashara, pateni pendekezo kwa benki au SACCO, na wekeni hesabu.' },
    ],
    start: 'Fungua kikundi changu',
    demo: 'Jaribu chama cha mfano',
    help: 'Unahitaji msaada?',
    helpBody: 'Tuandikie telpeninfo@gmail.com utuambie ulibonyeza nini. Tunajibu siku hiyo hiyo.',
  },
};

export function HomeChoices({ lang }: { lang: string }) {
  const c = COPY[lang === 'sw' ? 'sw' : 'en'];
  return (
    <section aria-labelledby="hf-choose" className="hf-section">
      <h2 id="hf-choose" className="display hf-h2">{c.choose}</h2>
      <p className="hf-sub">{c.chooseSub}</p>
      <ul className="hf-choices">
        {c.choices.map((x) => (
          <li key={x.title}>
            <Link href={x.href} className="hf-choice">
              <Picture name={x.pic} size={48} />
              <span>
                <strong>{x.title}</strong>
                <span>{x.body}</span>
              </span>
              <span className="hf-arrow" aria-hidden>→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HomeSteps({ lang }: { lang: string }) {
  const c = COPY[lang === 'sw' ? 'sw' : 'en'];
  return (
    <section id="how" aria-labelledby="hf-how" className="hf-section">
      <h2 id="hf-how" className="display hf-h2">{c.how}</h2>
      <p className="hf-sub">{c.howSub}</p>
      <ol className="hf-steps">
        {c.steps.map((s, i) => (
          <li key={s.title} className="hf-step">
            <span className="hf-num">{i + 1}</span>
            <strong>{s.title}</strong>
            <span>{s.body}</span>
          </li>
        ))}
      </ol>
      <div className="hf-ctas">
        <Link href="/sign-in?next=/dashboard" className="hf-btn hf-btn--gold">{c.start}</Link>
        <Link href="/sign-in?next=/dashboard" className="hf-btn">{c.demo}</Link>
      </div>
    </section>
  );
}

export function HomeHelp({ lang }: { lang: string }) {
  const c = COPY[lang === 'sw' ? 'sw' : 'en'];
  return (
    <section aria-labelledby="hf-help" className="hf-help">
      <h2 id="hf-help" className="display">{c.help}</h2>
      <p>{c.helpBody.split('telpeninfo@gmail.com')[0]}<span className="mono" style={{ userSelect: 'all' }}>telpeninfo@gmail.com</span>{c.helpBody.split('telpeninfo@gmail.com')[1]}</p>
    </section>
  );
}

/** Phones: the main action stays one thumb away. */
export function HomeDock({ lang }: { lang: string }) {
  const c = COPY[lang === 'sw' ? 'sw' : 'en'];
  return (
    <nav aria-label="Quick actions" className="hf-dock">
      <Link href="/sign-in?next=/dashboard" className="hf-btn hf-btn--gold">{c.start}</Link>
      <a href="#how" className="hf-btn">{c.how}</a>
    </nav>
  );
}
