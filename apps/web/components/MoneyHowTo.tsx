'use client';

import { useEffect, useState } from 'react';
import { Picture, type PictureName } from './Pictures';
import { storedLang } from './track';

/**
 * "Money: what do I do?" on the member's home screen (tester 27/11/26: "the
 * landing page should have important tabs on how to make a contribution or
 * borrow/withdraw"). Three plain choices. Stawi does not lend or pay out money
 * itself: borrowing and taking money out are agreed by the group at its meeting
 * and recorded, so these cards explain that and point to the right place.
 */
type Lang = 'en' | 'sw';

interface Choice { key: string; pic: PictureName; title: string; body: string; go: string; href: string }

function choices(lang: Lang, groupId: string): { heading: string; sub: string; items: Choice[] } {
  const workspace = `/groups/${encodeURIComponent(groupId)}`;
  if (lang === 'sw') {
    return {
      heading: 'Pesa: nifanye nini?',
      sub: 'Gusa kimoja kuona jinsi inavyofanyika katika kikundi chako.',
      items: [
        { key: 'in', pic: 'moneybag', title: 'Weka mchango', body: 'Lipa hapa chini kwa simu yako, au mpe mweka hazina. Akiurekodi, sehemu yako inaonekana hapa mara moja.', go: 'Nionyeshe', href: '#pay' },
        { key: 'borrow', pic: 'handshake', title: 'Kopa kutoka kikundini', body: 'Omba kwenye mkutano wa kikundi. Wanachama wanakubali kwa sheria zenu, na katibu anaandika kwenye kumbukumbu. Stawi yenyewe haikopeshi pesa.', go: 'Fungua kikundi', href: workspace },
        { key: 'out', pic: 'cash', title: 'Toa pesa zako', body: 'Akiba yako iko kwenye rekodi yako. Kutoa pesa, mwombe mweka hazina mkutanoni; inakubaliwa na kuandikwa kwenye kumbukumbu.', go: 'Rekodi yangu', href: '/profile' },
      ],
    };
  }
  return {
    heading: 'Money: what do I do?',
    sub: 'Tap one to see how it works in your group.',
    items: [
      { key: 'in', pic: 'moneybag', title: 'Pay my contribution', body: 'Pay below from your own phone, or give it to your treasurer. Once it is recorded, your share shows here straight away.', go: 'Show me', href: '#pay' },
      { key: 'borrow', pic: 'handshake', title: 'Borrow from the group', body: 'Ask at your group meeting. Members agree by your group’s own rules and the secretary writes it in the minutes. Stawi itself does not lend money.', go: 'Open my group', href: workspace },
      { key: 'out', pic: 'cash', title: 'Take my money out', body: 'Your savings are in your own record. To take money out, ask the treasurer at the meeting; it is agreed and written in the minutes.', go: 'My record', href: '/profile' },
    ],
  };
}

export function MoneyHowTo({ groupId }: { groupId: string }) {
  const [lang, setLang] = useState<Lang>('en');
  useEffect(() => { setLang(storedLang()); }, []);
  const c = choices(lang, groupId);

  // "Pay my contribution" only shows where the group's country can take payments;
  // otherwise jump to the group's money table, where the treasurer records it.
  function jump(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!href.startsWith('#')) return;
    e.preventDefault();
    const target = document.getElementById('pay') ?? document.getElementById('group-money');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section className="money-how" aria-labelledby="money-how-h">
      <h2 id="money-how-h" className="display">{c.heading}</h2>
      <p className="money-how-sub">{c.sub}</p>
      <ul>
        {c.items.map((x) => (
          <li key={x.key}>
            <a href={x.href} className="money-how-card" onClick={(e) => jump(e, x.href)}>
              <Picture name={x.pic} size={44} />
              <span className="money-how-text">
                <strong>{x.title}</strong>
                <span>{x.body}</span>
                <em>{x.go}</em>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
