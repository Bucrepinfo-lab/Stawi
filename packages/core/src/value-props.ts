/**
 * Value banners — "the problem, the proof, what Stawi does about it".
 *
 * Owner brief 20/11/26: sell the value, not the app, and never flatter. So every
 * banner here carries:
 *   - a pain in plain words,
 *   - a FACT with a named, linkable source (nothing is claimed without one),
 *   - what Stawi does about it, and
 *   - `status`: 'live' only when the tool exists in the product today;
 *     'coming' when it is planned (shown to people as "Coming soon").
 *
 * Research and sources: docs/PRD-V3-RESTRUCTURE.md §2. Lending and interest
 * claims are Pillar 4 only and are shown only when SACCO+ is switched on.
 * Pure data: no I/O, safe on web and mobile.
 */

export type ValuePillar = 1 | 2 | 3 | 4;
export type ValueLang = 'en' | 'sw';
export type ValueStatus = 'live' | 'coming';

export interface ValueText {
  en: string;
  sw: string;
}

export interface ValueProp {
  /** Stable id, also the tracking key. Lowercase letters, digits and dashes. */
  id: string;
  pillar: ValuePillar;
  /** One emoji a non-reader can recognise the banner by. */
  icon: string;
  pain: ValueText;
  fact: ValueText;
  source: { label: string; url: string };
  solution: ValueText;
  status: ValueStatus;
  /** Where the tool lives (an app route). */
  href: string;
  cta: ValueText;
}

export const PILLAR_NAMES: Record<ValuePillar, ValueText> = {
  1: { en: 'Your group', sw: 'Kikundi chako' },
  2: { en: 'Your business idea', sw: 'Wazo la biashara' },
  3: { en: 'Your books', sw: 'Hesabu zako' },
  4: { en: 'Savings and loans', sw: 'Akiba na mikopo' },
};

export const PILLAR_PROMISE: Record<ValuePillar, ValueText> = {
  1: { en: 'Every shilling seen by every member.', sw: 'Kila shilingi inaonekana na kila mwanachama.' },
  2: { en: 'Check the idea before you spend the money.', sw: 'Kagua wazo kabla ya kutumia pesa.' },
  3: { en: 'Know every day if you made or lost money.', sw: 'Jua kila siku kama umepata faida au hasara.' },
  4: { en: 'Fair loans, with rules everyone can see.', sw: 'Mikopo ya haki, na sheria zinazoonekana kwa wote.' },
};

export const VALUE_PROPS: ValueProp[] = [
  // ── Pillar 1 — the group ────────────────────────────────────────────────
  {
    id: 'p1-hidden-money',
    pillar: 1,
    icon: '👀',
    pain: { en: 'Money goes missing and nobody can prove it.', sw: 'Pesa hupotea na hakuna anayeweza kuthibitisha.' },
    fact: {
      en: 'FSD Kenya research puts theft and embezzlement of group funds at 13%.',
      sw: 'Utafiti wa FSD Kenya unaonyesha wizi wa pesa za vikundi ni asilimia 13.',
    },
    source: { label: 'Money254, citing FSD Kenya', url: 'https://money254.co.ke/post/chama-revolution-what-successful-chamas-know-do-why-many-fail' },
    solution: {
      en: 'Each contribution is written once. Every member sees it at once, with their own share of the total.',
      sw: 'Kila mchango huandikwa mara moja. Kila mwanachama huuona papo hapo, pamoja na sehemu yake ya jumla.',
    },
    status: 'live',
    href: '/dashboard',
    cta: { en: 'See your group money', sw: 'Ona pesa za kikundi' },
  },
  {
    // Owner 28/11/26: the money that starts quarrels is the group's own earnings.
    id: 'p1-earnings',
    pillar: 1,
    icon: '💵',
    pain: { en: 'Where did the fines and the table banking extra go?', sw: 'Faini na faida ya table banking zilienda wapi?' },
    fact: {
      en: 'Most chamas collapse within their first two years, and a leading reason is that the group cannot account for all its money.',
      sw: 'Chama nyingi huvunjika ndani ya miaka miwili ya kwanza, na sababu kubwa ni kwamba kikundi hakiwezi kueleza pesa zake zote.',
    },
    source: { label: 'Money254', url: 'https://money254.co.ke/post/chama-revolution-what-successful-chamas-know-do-why-many-fail' },
    solution: {
      en: 'Group earnings shows every shilling the group earns, from each fine to each extra brought back, with who, when and why. Every member can see it.',
      sw: 'Mapato ya kikundi huonyesha kila shilingi kikundi kinachopata, kila faini na kila faida iliyorudishwa, na nani, lini na kwa nini. Kila mwanachama anaweza kuona.',
    },
    status: 'live',
    href: '/dashboard',
    cta: { en: 'See your group earnings', sw: 'Ona mapato ya kikundi' },
  },
  {
    id: 'p1-minutes',
    pillar: 1,
    icon: '📝',
    pain: { en: 'Offices ask for minutes. Writing them is hard.', sw: 'Ofisi huomba kumbukumbu za mkutano. Kuziandika ni vigumu.' },
    fact: {
      en: 'To register, a group must hand in minutes that name its elected officials, a signed list of members and a constitution.',
      sw: 'Ili kusajiliwa, kikundi lazima kiwasilishe kumbukumbu zenye majina ya viongozi, orodha ya wanachama iliyotiwa sahihi na katiba.',
    },
    source: { label: 'State Department for Social Protection, Kenya', url: 'https://socialprotection.go.ke/services-group-registration' },
    solution: {
      en: 'Tick who came and type a few points. Stawi writes the formal minutes for your officials to check and print.',
      sw: 'Weka alama waliohudhuria na uandike mambo machache. Stawi huandika kumbukumbu rasmi ili viongozi wakague na kuchapisha.',
    },
    status: 'live',
    href: '/dashboard',
    cta: { en: 'Write minutes the easy way', sw: 'Andika kumbukumbu kwa urahisi' },
  },
  {
    id: 'p1-register',
    pillar: 1,
    icon: '🏛️',
    pain: { en: 'Without a certificate, banks and funds turn the group away.', sw: 'Bila cheti, benki na mifuko hukataa kikundi.' },
    fact: {
      en: 'The Uwezo Fund lends only to registered groups that run table banking and can show monthly contributions.',
      sw: 'Mfuko wa Uwezo hukopesha vikundi vilivyosajiliwa tu, vyenye table banking na ushahidi wa michango ya kila mwezi.',
    },
    source: { label: 'Uwezo Fund FAQs', url: 'https://uwezo.go.ke/faqs' },
    solution: {
      en: 'Stawi walks you through registration one step at a time, and keeps the contribution record lenders ask for.',
      sw: 'Stawi hukuongoza hatua kwa hatua kusajili kikundi, na huhifadhi rekodi ya michango ambayo wakopeshaji huomba.',
    },
    status: 'live',
    href: '/formalize',
    cta: { en: 'Start registering', sw: 'Anza kusajili' },
  },
  {
    id: 'p1-rules',
    pillar: 1,
    icon: '📜',
    pain: { en: 'No agreed rules, so small quarrels break the group.', sw: 'Hakuna sheria zilizokubaliwa, hivyo migogoro midogo huvunja kikundi.' },
    fact: {
      en: 'Groups without set rules on contributions, deadlines and leaving are named as a top reason chamas collapse.',
      sw: 'Vikundi visivyo na sheria za michango, tarehe na kujitoa hutajwa kama sababu kuu ya chama kuvunjika.',
    },
    source: { label: 'Cytonn Investments', url: 'https://cytonn.com/blog/article/Reasons-why-your-chama-will-fail' },
    solution: {
      en: 'Keep your rules, officials, meeting day and fines in one group profile that every member can read.',
      sw: 'Weka sheria, viongozi, siku ya mkutano na faini mahali pamoja ambapo kila mwanachama anaweza kusoma.',
    },
    status: 'live',
    href: '/dashboard',
    cta: { en: 'Set your group rules', sw: 'Weka sheria za kikundi' },
  },
  {
    id: 'p1-speak',
    pillar: 1,
    icon: '🎙️',
    pain: { en: 'Many members cannot write, so they are left out.', sw: 'Wanachama wengi hawawezi kuandika, hivyo huachwa nje.' },
    fact: {
      en: 'In a Uganda and Malawi study, paper group records lost or mis-recorded what members had saved.',
      sw: 'Katika utafiti wa Uganda na Malawi, rekodi za karatasi zilipoteza au kukosea akiba za wanachama.',
    },
    source: { label: 'Innovations for Poverty Action', url: 'https://poverty-action.org/unlocking-potential-savings-groups-through-group-loans-and-digital-records-insights-our-baseline' },
    solution: {
      en: 'Speak your meeting in your own language and Stawi will write it down.',
      sw: 'Zungumza mkutano wako kwa lugha yako na Stawi itaandika.',
    },
    status: 'coming',
    href: '/dashboard',
    cta: { en: 'Open your group', sw: 'Fungua kikundi chako' },
  },

  // ── Pillar 2 — the business idea ────────────────────────────────────────
  {
    id: 'p2-rushed',
    pillar: 2,
    icon: '🧭',
    pain: { en: 'Groups rush into a business nobody has checked.', sw: 'Vikundi hukimbilia biashara ambayo haijakaguliwa.' },
    fact: {
      en: 'Investing without research, and with no agreed goal, is named as a top reason chama investments fail.',
      sw: 'Kuwekeza bila utafiti, na bila lengo lililokubaliwa, hutajwa kama sababu kuu ya uwekezaji wa chama kushindwa.',
    },
    source: { label: 'Cytonn Investments', url: 'https://cytonn.com/blog/article/Reasons-why-your-chama-will-fail' },
    solution: {
      en: 'Tell Stawi your money and the kind of business. Get ideas that fit, keep at least three, and compare before the group decides.',
      sw: 'Iambie Stawi pesa zenu na aina ya biashara. Pata mawazo yanayofaa, hifadhi angalau matatu, na linganisha kabla ya kikundi kuamua.',
    },
    status: 'live',
    href: '/match',
    cta: { en: 'Find ideas for our money', sw: 'Tafuta mawazo kwa pesa zetu' },
  },
  {
    id: 'p2-first-year',
    pillar: 2,
    icon: '⏳',
    pain: { en: 'Most new businesses close early.', sw: 'Biashara nyingi mpya hufungwa mapema.' },
    fact: {
      en: 'Of the Kenyan small businesses that closed, 46% closed in their first year (KNBS 2016 survey).',
      sw: 'Kati ya biashara ndogo za Kenya zilizofungwa, asilimia 46 zilifungwa mwaka wa kwanza (utafiti wa KNBS 2016).',
    },
    source: { label: 'The Standard, citing the KNBS 2016 MSME survey', url: 'https://www.standardmedia.co.ke/business/amp/news/article/2000221491/why-400000-smes-are-dying-annually' },
    solution: {
      en: 'Each idea shows the money needed, the likely profit margin and the risk, so you choose with open eyes.',
      sw: 'Kila wazo huonyesha pesa zinazohitajika, faida inayotarajiwa na hatari, ili mchague mkiwa mnaona wazi.',
    },
    status: 'live',
    href: '/match',
    cta: { en: 'Compare ideas', sw: 'Linganisha mawazo' },
  },
  {
    id: 'p2-demand',
    pillar: 2,
    icon: '🛒',
    pain: { en: 'You open the shop and the buyers do not come.', sw: 'Unafungua duka na wanunuzi hawaji.' },
    fact: {
      en: 'Too little demand for what the business sells is one of the most common reasons small businesses fail.',
      sw: 'Uhitaji mdogo wa bidhaa ni mojawapo ya sababu kuu za biashara ndogo kushindwa.',
    },
    source: { label: 'US Chamber of Commerce', url: 'https://www.uschamber.com/co/start/strategy/why-small-businesses-fail' },
    solution: {
      en: 'A simple buyer check before you commit: who will buy, how many are near you, and what they pay today.',
      sw: 'Ukaguzi rahisi wa wanunuzi kabla ya kuanza: nani atanunua, wako wangapi karibu, na wanalipa kiasi gani leo.',
    },
    status: 'coming',
    href: '/match',
    cta: { en: 'See ideas now', sw: 'Ona mawazo sasa' },
  },

  // ── Pillar 3 — the books ────────────────────────────────────────────────
  {
    id: 'p3-daily',
    pillar: 3,
    icon: '📒',
    pain: { en: 'You sell all day and still do not know if you made money.', sw: 'Unauza siku nzima na bado hujui kama umepata faida.' },
    fact: {
      en: 'Kenyan small businesses that closed mostly blamed rising costs, falling income and losses.',
      sw: 'Biashara ndogo za Kenya zilizofungwa zilitaja zaidi gharama kupanda, mapato kushuka na hasara.',
    },
    source: { label: 'The Standard, citing the KNBS 2016 MSME survey', url: 'https://www.standardmedia.co.ke/business/amp/news/article/2000221491/why-400000-smes-are-dying-annually' },
    solution: {
      en: 'Enter what you sold and what you spent. Stawi shows profit or loss for the day, week, month and year.',
      sw: 'Ingiza ulichouza na ulichotumia. Stawi huonyesha faida au hasara ya siku, wiki, mwezi na mwaka.',
    },
    status: 'live',
    href: '/books',
    cta: { en: 'Open my books', sw: 'Fungua hesabu zangu' },
  },
  {
    id: 'p3-stock',
    pillar: 3,
    icon: '📦',
    pain: { en: 'Money sleeps in goods that do not sell.', sw: 'Pesa hulala kwenye bidhaa zisizouzika.' },
    fact: {
      en: 'Stocking too much ties up cash; stocking too little loses sales. Both are listed among the main reasons small businesses fail.',
      sw: 'Kuweka bidhaa nyingi hufunga pesa; kuweka chache hupoteza mauzo. Zote ni kati ya sababu kuu za biashara ndogo kushindwa.',
    },
    source: { label: 'US Chamber of Commerce', url: 'https://www.uschamber.com/co/start/strategy/why-small-businesses-fail' },
    solution: {
      en: 'Stawi marks each item fast, slow or dead, warns before you run out, and says what to stock more and less.',
      sw: 'Stawi huonyesha bidhaa inayouzika haraka, polepole au isiyouzika, hukuonya kabla haijaisha, na hukuambia uongeze nini na upunguze nini.',
    },
    status: 'live',
    href: '/books',
    cta: { en: 'Check my stock', sw: 'Kagua bidhaa zangu' },
  },
  {
    id: 'p3-tax',
    pillar: 3,
    icon: '🧾',
    pain: { en: 'Tax rules are confusing and the fines are heavy.', sw: 'Sheria za kodi zinachanganya na faini ni kubwa.' },
    fact: {
      en: 'Under Kenya’s Finance Act 2026, failing to issue an electronic tax invoice can cost the higher of 5% of the tax due or KES 10,000 for an individual (KES 100,000 for a company).',
      sw: 'Chini ya Sheria ya Fedha ya Kenya 2026, kutotoa ankara ya kodi ya kielektroniki kunaweza kugharimu kiasi kikubwa kati ya asilimia 5 ya kodi au KES 10,000 kwa mtu binafsi (KES 100,000 kwa kampuni).',
    },
    source: { label: 'EY Tax News', url: 'https://taxnews.ey.com/news/2026-1445-kenya-enacts-finance-act-2026' },
    solution: {
      en: 'Stawi works out VAT, PAYE and the catering levy from your own entries and points you to where each is paid.',
      sw: 'Stawi hukokotoa VAT, PAYE na ushuru wa hoteli kutokana na rekodi zako na kukuelekeza mahali pa kulipa kila moja.',
    },
    status: 'live',
    href: '/books',
    cta: { en: 'See my taxes', sw: 'Ona kodi zangu' },
  },
  {
    id: 'p3-mixed-money',
    pillar: 3,
    icon: '👛',
    pain: { en: 'Business money and home money sit in one pocket.', sw: 'Pesa za biashara na za nyumbani hukaa mfuko mmoja.' },
    fact: {
      en: 'Mixing business and personal money is listed among the money mistakes that sink small businesses.',
      sw: 'Kuchanganya pesa za biashara na za binafsi hutajwa kati ya makosa ya pesa yanayoangusha biashara ndogo.',
    },
    source: { label: 'US Chamber of Commerce', url: 'https://www.uschamber.com/co/start/strategy/why-small-businesses-fail' },
    solution: {
      en: 'A separate business purse in Stawi, with what the owner takes out recorded on its own.',
      sw: 'Mfuko tofauti wa biashara ndani ya Stawi, na anachochukua mwenye biashara kikirekodiwa kivyake.',
    },
    status: 'coming',
    href: '/books',
    cta: { en: 'Open my books', sw: 'Fungua hesabu zangu' },
  },

  // ── Pillar 4 — savings and loans (shown only when SACCO+ is on) ─────────
  {
    id: 'p4-insider',
    pillar: 4,
    icon: '🔒',
    pain: { en: 'Leaders lend to friends and members lose their savings.', sw: 'Viongozi huwakopesha marafiki na wanachama hupoteza akiba.' },
    fact: {
      en: 'Kenyan SACCOs lose over KSh 3 billion a year to fraud and weak controls, according to the regulator’s figures.',
      sw: 'SACCO za Kenya hupoteza zaidi ya KSh bilioni 3 kwa mwaka kwa ulaghai na udhibiti dhaifu, kulingana na takwimu za mdhibiti.',
    },
    source: { label: 'The Star, citing SASRA', url: 'https://the-star.co.ke/news/2025-07-04-saccos-losing-sh3-billion-annually-to-internal-fraud-due-to-weak-governance-ncba' },
    solution: {
      en: 'Two officials must approve money going out, and every action is kept in a record that cannot be erased.',
      sw: 'Viongozi wawili lazima waidhinishe pesa zinazotoka, na kila hatua huhifadhiwa kwenye rekodi isiyofutika.',
    },
    status: 'live',
    href: '/sacco',
    cta: { en: 'See how it is protected', sw: 'Ona jinsi inavyolindwa' },
  },
  {
    id: 'p4-bad-loans',
    pillar: 4,
    icon: '⚖️',
    pain: { en: 'Loans given by favour are the loans that are not repaid.', sw: 'Mikopo ya upendeleo ndiyo isiyolipwa.' },
    fact: {
      en: 'In 2024 the regulator flagged 188 SACCOs for passing the 5% limit on unpaid loans.',
      sw: 'Mwaka 2024 mdhibiti alitaja SACCO 188 kwa kuvuka kikomo cha asilimia 5 cha mikopo isiyolipwa.',
    },
    source: { label: 'Money254, citing the SASRA 2024 report', url: 'https://www.money254.co.ke/post/188-saccos-flagged-for-breaching-loan-rule-what-it-means-for-members-news' },
    solution: {
      en: 'One clear score decides every loan the same way, and shows you each point you earned or lost.',
      sw: 'Alama moja wazi huamua kila mkopo kwa njia ile ile, na hukuonyesha kila pointi uliyopata au kupoteza.',
    },
    status: 'live',
    href: '/sacco',
    cta: { en: 'Check my score', sw: 'Angalia alama yangu' },
  },
  {
    id: 'p4-papers',
    pillar: 4,
    icon: '📁',
    pain: { en: 'The lender sends you back for papers again and again.', sw: 'Mkopeshaji hukurudisha kuleta karatasi tena na tena.' },
    fact: {
      en: 'For a group loan the Youth Enterprise Fund asks for the certificate, member list, bank statements, business records and minutes approving the loan.',
      sw: 'Kwa mkopo wa kikundi, Mfuko wa Vijana huomba cheti, orodha ya wanachama, taarifa za benki, rekodi za biashara na kumbukumbu za kuidhinisha mkopo.',
    },
    source: { label: 'Youth Enterprise Development Fund', url: 'https://www.youthfund.go.ke/constituency-based-loan/' },
    solution: {
      en: 'One tap to gather your minutes, member list and statements into a single loan folder.',
      sw: 'Bonyeza mara moja kukusanya kumbukumbu, orodha ya wanachama na taarifa kwenye faili moja la mkopo.',
    },
    status: 'coming',
    href: '/sacco',
    cta: { en: 'Open savings and loans', sw: 'Fungua akiba na mikopo' },
  },
];

/** Banners for a pillar. Pillar 4 only when SACCO+ is on. Live ones first. */
export function valuePropsFor(pillar: ValuePillar, opts: { saccoPlus?: boolean } = {}): ValueProp[] {
  if (pillar === 4 && !opts.saccoPlus) return [];
  return VALUE_PROPS.filter((p) => p.pillar === pillar).sort((a, b) => Number(b.status === 'live') - Number(a.status === 'live'));
}

/** Pillars that have something to show. */
export function valuePillars(opts: { saccoPlus?: boolean } = {}): ValuePillar[] {
  return opts.saccoPlus ? [1, 2, 3, 4] : [1, 2, 3];
}

/** Only English and Kiswahili are written; every other language reads English. */
export function valueLang(lang: string | null | undefined): ValueLang {
  return lang === 'sw' ? 'sw' : 'en';
}
