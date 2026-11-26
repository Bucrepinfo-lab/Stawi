'use client';

import { useEffect, useState } from 'react';
import { storedLang } from '@/components/track';

/**
 * My language (owner 26/11/26): the language a member is most comfortable
 * with. Screens that have Kiswahili words use it, and speaking the minutes or
 * a document starts in it. Saved on this phone.
 */
export function LanguagePicker() {
  const [lang, setLang] = useState<'en' | 'sw'>('en');
  const [saved, setSaved] = useState(false);
  useEffect(() => { setLang(storedLang()); }, []);
  function pick(l: 'en' | 'sw') {
    setLang(l);
    try { localStorage.setItem('stawiLang', l); setSaved(true); } catch { /* private mode */ }
  }
  return (
    <section className="pf-card" aria-labelledby="pf-lang">
      <h2 id="pf-lang">My language / Lugha yangu</h2>
      <p className="mr-meta">Used when you speak your minutes or notes, and on the screens that have Kiswahili words. More screens get Kiswahili over time.</p>
      <div className="dc-lang" role="radiogroup" aria-labelledby="pf-lang">
        <button type="button" role="radio" aria-checked={lang === 'sw'} className={lang === 'sw' ? 'on' : ''} onClick={() => pick('sw')}>Kiswahili</button>
        <button type="button" role="radio" aria-checked={lang === 'en'} className={lang === 'en' ? 'on' : ''} onClick={() => pick('en')}>English</button>
      </div>
      {saved && <p className="mr-meta" role="status">{lang === 'sw' ? 'Imehifadhiwa. Kiswahili kitatumika kwenye simu hii.' : 'Saved. English will be used on this phone.'}</p>}
    </section>
  );
}
