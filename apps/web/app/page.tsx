'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FAILURE_GAPS } from '@stawi/core';

type Lang = 'en' | 'sw' | 'fr';

const T: Record<Lang, Record<string, string>> = {
  en: {
    kicker: 'Save · Grow · Thrive · worldwide',
    h1a: 'Save together.', grow: 'Grow', h1b: 'together. Thrive.',
    sub: 'One trusted platform for cooperative saving and enterprise — table banking, business matching, QuickBooks-grade accounting, and full SACCO savings & credit — localized to each country’s currency, tax and registration rules.',
    open: 'Join any pillar directly — no need to start with a group. Chamas, traders and established businesses all welcome.',
    visionT: 'Our vision',
    vision: 'A future where every saver, group and business can thrive — from the first shilling saved to a listed institution — with formal finance open to everyone.',
    missionT: 'Our mission',
    mission: 'To give every chama, entrepreneur and enterprise one platform to save, borrow, trade and grow, with the records, guard-rails and credit that turn informal effort into fundable institutions.',
    valuesT: 'Our core values',
    nicheKicker: 'Our niche — built on the reasons others failed',
    nicheH: 'Eight reasons microfinance collapses. Eight guard-rails, built in.',
    nicheP: 'We studied why savings groups never graduate into SACCOs, banks and listed institutions — and digitalized the cure for each one. That research is the product.',
    seeEngine: 'See the full graduation engine →', pricing: 'Pricing',
  },
  sw: {
    kicker: 'Weka akiba · Kua · Stawi · duniani kote',
    h1a: 'Wekeni akiba pamoja.', grow: 'Kueni', h1b: 'pamoja. Stawini.',
    sub: 'Jukwaa moja la kuaminika kwa akiba ya vikundi na biashara — table banking, kuunganisha biashara, uhasibu wa kiwango cha juu, na akiba na mikopo ya SACCO — kwa sarafu, kodi na sheria za kila nchi.',
    open: 'Jiunge na nguzo yoyote moja kwa moja — huhitaji kuanza na kikundi. Vyama, wafanyabiashara na biashara zilizoimarika wote mnakaribishwa.',
    visionT: 'Maono yetu',
    vision: 'Wakati ujao ambapo kila mwekaji, kikundi na biashara wanaweza kustawi — kutoka shilingi ya kwanza hadi taasisi iliyoorodheshwa — huku fedha rasmi zikiwa wazi kwa kila mtu.',
    missionT: 'Dhamira yetu',
    mission: 'Kumpa kila chama, mjasiriamali na biashara jukwaa moja la kuweka akiba, kukopa, kufanya biashara na kukua, na kumbukumbu, ulinzi na mikopo inayobadilisha juhudi kuwa taasisi.',
    valuesT: 'Maadili yetu',
    nicheKicker: 'Nafasi yetu — kutokana na sababu zilizowaangusha wengine',
    nicheH: 'Sababu nane za kuanguka. Ulinzi nane, uliojengwa ndani.',
    nicheP: 'Tulisoma kwa nini vikundi vya akiba havifikii SACCO, benki na taasisi — na tukadijiti dawa ya kila sababu. Utafiti huo ndio bidhaa.',
    seeEngine: 'Ona injini kamili ya ukuaji →', pricing: 'Bei',
  },
  fr: {
    kicker: 'Épargner · Grandir · Prospérer · partout',
    h1a: 'Épargnez ensemble.', grow: 'Grandissez', h1b: 'ensemble. Prospérez.',
    sub: 'Une plateforme de confiance pour l’épargne coopérative et l’entreprise — tontine, mise en relation d’affaires, comptabilité de niveau pro, épargne et crédit SACCO — adaptée à la devise, la fiscalité et les règles de chaque pays.',
    open: 'Rejoignez n’importe quel pilier directement — pas besoin de commencer par un groupe. Tontines, commerçants et entreprises établies : tous bienvenus.',
    visionT: 'Notre vision',
    vision: 'Un avenir où chaque épargnant, groupe et entreprise peut prospérer — du premier franc épargné à une institution cotée — avec une finance formelle ouverte à tous.',
    missionT: 'Notre mission',
    mission: 'Donner à chaque tontine, entrepreneur et entreprise une plateforme pour épargner, emprunter, échanger et grandir, avec les registres, les garde-fous et le crédit qui transforment l’effort en institutions finançables.',
    valuesT: 'Nos valeurs',
    nicheKicker: 'Notre niche — fondée sur les raisons des échecs',
    nicheH: 'Huit raisons d’effondrement. Huit garde-fous intégrés.',
    nicheP: 'Nous avons étudié pourquoi les groupes d’épargne n’évoluent jamais en SACCO, banques et sociétés cotées — et numérisé le remède à chacune. Cette recherche est le produit.',
    seeEngine: 'Voir le moteur de croissance →', pricing: 'Tarifs',
  },
};

const PILLARS: Record<Lang, string[]> = {
  en: ['1 · Records & Table Banking', '2 · Business Matching', '3 · Accounting & Compliance', '4 · SACCO+ Savings & Credit'],
  sw: ['1 · Kumbukumbu & Table Banking', '2 · Kuunganisha Biashara', '3 · Uhasibu & Uzingatiaji', '4 · SACCO+ Akiba & Mikopo'],
  fr: ['1 · Registres & Tontine', '2 · Mise en relation', '3 · Comptabilité & Conformité', '4 · Épargne & Crédit SACCO+'],
};

const VALUES: Record<Lang, string[]> = {
  en: ['Trust', 'Inclusion', 'Discipline', 'Growth', 'Simplicity'],
  sw: ['Uaminifu', 'Ujumuishaji', 'Nidhamu', 'Ukuaji', 'Urahisi'],
  fr: ['Confiance', 'Inclusion', 'Discipline', 'Croissance', 'Simplicité'],
};

const navLink: React.CSSProperties = { fontWeight: 600, color: 'var(--ink-2)' };

function LogoMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 96 96" aria-hidden>
      <defs>
        <linearGradient id="lf" x1="8" y1="8" x2="88" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2f855a" /><stop offset="1" stopColor="#14352a" />
        </linearGradient>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f0c05a" /><stop offset="1" stopColor="#e0a32e" /></linearGradient>
      </defs>
      <rect x="4" y="4" width="88" height="88" rx="24" fill="url(#lf)" />
      <path d="M24 62 A24 24 0 1 1 68 44" stroke="#e0a32e" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.55" />
      <rect x="31" y="54" width="9" height="18" rx="4.5" fill="#f7f3ea" />
      <rect x="43.5" y="44" width="9" height="28" rx="4.5" fill="#f7f3ea" />
      <rect x="56" y="32" width="9" height="40" rx="4.5" fill="url(#lg)" />
      <circle cx="60.5" cy="24" r="8" fill="url(#lg)" />
    </svg>
  );
}

export default function Home() {
  const [lang, setLang] = useState<Lang>('en');
  const [dark, setDark] = useState(false);
  const t = T[lang];

  useEffect(() => {
    try {
      const l = localStorage.getItem('stawiLang') as Lang | null;
      if (l && T[l]) setLang(l);
      const th = localStorage.getItem('stawiTheme');
      if (th === 'dark') { setDark(true); document.documentElement.classList.add('dark'); }
    } catch {}
  }, []);

  function changeLang(l: Lang) { setLang(l); try { localStorage.setItem('stawiLang', l); } catch {} }
  function toggleTheme() {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('stawiTheme', next ? 'dark' : 'light'); } catch {}
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', flexWrap: 'wrap', gap: 12 }}>
        <div className="display" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 24, color: 'var(--forest-deep)' }}>
          <LogoMark />
          <div style={{ lineHeight: 1 }}>
            Stawi
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 9.5, fontWeight: 800, letterSpacing: '2.5px', color: 'var(--dim)', marginTop: 2 }}>SAVE · GROW · THRIVE</div>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={navLink}>Table banking</Link>
          <Link href="/match" style={navLink}>Find a business</Link>
          <Link href="/books" style={navLink}>Books</Link>
          <Link href="/sacco" style={navLink}>SACCO+</Link>
          <select value={lang} onChange={(e) => changeLang(e.target.value as Lang)} aria-label="Language"
            style={{ padding: '7px 10px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'inherit', fontSize: 13 }}>
            <option value="en">🇬🇧 EN</option><option value="sw">🇰🇪 SW</option><option value="fr">🇫🇷 FR</option>
          </select>
          <button onClick={toggleTheme} aria-label="Toggle theme"
            style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
            {dark ? '☀️' : '🌙'}
          </button>
          <Link href="/subscribe" style={{ fontWeight: 700, color: 'var(--forest-deep)', background: 'var(--gold)', padding: '10px 18px', borderRadius: 12, textDecoration: 'none' }}>{t.pricing}</Link>
        </nav>
      </header>

      <section style={{ padding: '54px 0 30px', maxWidth: 820 }}>
        <p style={{ fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700, marginBottom: 16 }}>{t.kicker}</p>
        <h1 className="display" style={{ fontWeight: 600, fontSize: 'clamp(36px,6vw,64px)', lineHeight: 1.03 }}>
          {t.h1a}{' '}<em style={{ fontStyle: 'italic', color: 'var(--forest)' }}>{t.grow}</em> {t.h1b}
        </h1>
        <p style={{ marginTop: 18, fontSize: 18, color: 'var(--ink-2)' }}>{t.sub}</p>

        <div style={{ marginTop: 20, background: 'var(--paper)', border: '1px solid var(--gold)', borderRadius: 14, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span aria-hidden style={{ fontSize: 18 }}>🚪</span>
          <p style={{ fontSize: 14.5, color: 'var(--ink)', fontWeight: 600, margin: 0 }}>{t.open}</p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
          {PILLARS[lang].map((label, i) => (
            <Link key={i} href={['/dashboard', '/match', '/books', '/sacco'][i]} style={{ fontSize: 13, fontWeight: 700, color: 'var(--forest-deep)', background: 'var(--paper)', border: '1px solid var(--line)', padding: '8px 14px', borderRadius: 999, textDecoration: 'none' }}>
              {label}
            </Link>
          ))}
        </div>
      </section>

      {/* Vision · Mission · Values */}
      <section style={{ padding: '20px 0', display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16, padding: 20 }}>
          <p style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 800 }}>{t.visionT}</p>
          <p style={{ marginTop: 8, fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6 }}>{t.vision}</p>
        </div>
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16, padding: 20 }}>
          <p style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 800 }}>{t.missionT}</p>
          <p style={{ marginTop: 8, fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6 }}>{t.mission}</p>
        </div>
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16, padding: 20 }}>
          <p style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 800 }}>{t.valuesT}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {VALUES[lang].map((v) => (
              <span key={v} style={{ fontSize: 13, fontWeight: 700, color: 'var(--forest-deep)', background: 'var(--bone-2)', border: '1px solid var(--line)', padding: '6px 12px', borderRadius: 999 }}>{v}</span>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="Why others failed" style={{ padding: '30px 0 10px' }}>
        <p style={{ fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--gold-deep)', fontWeight: 700 }}>{t.nicheKicker}</p>
        <h2 className="display" style={{ fontWeight: 600, fontSize: 'clamp(24px,3.5vw,36px)', marginTop: 8, maxWidth: 720 }}>{t.nicheH}</h2>
        <p style={{ marginTop: 10, color: 'var(--ink-2)', maxWidth: 680, fontSize: 15 }}>{t.nicheP}</p>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginTop: 20 }}>
          {FAILURE_GAPS.map((g, i) => (
            <div key={g.id} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold-deep)' }}>{String(i + 1).padStart(2, '0')}</span>
              <h3 style={{ fontSize: 14.5, margin: '4px 0 6px' }}>{g.gap}</h3>
              <p style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: 0 }}>{g.stawiSolution}</p>
            </div>
          ))}
        </div>
        <Link href="/sacco" style={{ display: 'inline-block', marginTop: 18, fontWeight: 800, color: 'var(--forest-deep)' }}>{t.seeEngine}</Link>
      </section>

      <footer style={{ marginTop: 60, paddingTop: 24, borderTop: '1px solid var(--line)', color: 'var(--faint)', fontSize: 13, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="display" style={{ color: 'var(--forest-deep)', fontWeight: 600 }}>Stawi</span>
        <span>Save · Grow · Thrive — global multi-tenant SaaS</span>
        <Link href="/terms" style={{ color: 'var(--faint)' }}>Terms</Link>
        <Link href="/subscribe" style={{ color: 'var(--faint)' }}>{t.pricing}</Link>
      </footer>
    </main>
  );
}
