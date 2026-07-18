'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FAILURE_GAPS } from '@stawi/core';

type Lang = 'en' | 'sw' | 'fr' | 'es' | 'pt' | 'ar' | 'zh' | 'hi' | 'de' | 'ru';

const T: Partial<Record<Lang, Record<string, string>>> & { en: Record<string, string> } = {
  en: {
    kicker: 'Save · Grow · Thrive',
    h1a: 'Save together.', grow: 'Grow', h1b: 'together. Thrive.',
    sub: 'One trusted platform for cooperative saving and enterprise — group savings, business matching, professional-grade accounting, and full savings & credit — adapted to your currency, language, tax and registration rules.',
    open: 'Join any pillar directly — no need to start with a group. Savings circles, traders and established businesses, all welcome.',
    visionT: 'Our vision',
    vision: 'A future where every saver, group and business can thrive on their own terms — where the first coin put into a savings circle and the books of a growing enterprise sit on the same trusted rails, and where formal finance is open to everyone, not just the already-banked.',
    missionT: 'Our mission',
    mission: 'To give every savings group, entrepreneur and enterprise one trusted platform to save, borrow, trade and grow — with the records, guard-rails and credit that turn informal effort into formal, fundable institutions. No one has to start small to be taken seriously, and no one is left behind by language, literacy or a cheap phone.',
    valuesT: 'Our core values',
    nicheKicker: 'Our niche — built on the reasons others failed',
    nicheH: 'Eight reasons microfinance collapses. Eight guard-rails, built in.',
    nicheP: 'We studied why savings groups never graduate into cooperatives, banks and listed institutions — and digitalized the cure for each one. That research is the product.',
    seeEngine: 'See the full graduation engine →', pricing: 'Pricing',
  },
  sw: {
    kicker: 'Weka akiba · Kua · Stawi',
    h1a: 'Wekeni akiba pamoja.', grow: 'Kueni', h1b: 'pamoja. Stawini.',
    sub: 'Jukwaa moja la kuaminika kwa akiba ya vikundi na biashara — table banking, kuunganisha biashara, uhasibu wa kiwango cha juu, na akiba na mikopo ya SACCO — kwa sarafu, lugha, kodi na sheria zinazokufaa.',
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
    kicker: 'Épargner · Grandir · Prospérer',
    h1a: 'Épargnez ensemble.', grow: 'Grandissez', h1b: 'ensemble. Prospérez.',
    sub: 'Une plateforme de confiance pour l’épargne coopérative et l’entreprise — tontine, mise en relation d’affaires, comptabilité de niveau pro, épargne et crédit SACCO — adaptée à votre devise, votre langue, votre fiscalité et vos règles d’enregistrement.',
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
  es: {
    kicker: 'Ahorra · Crece · Prospera',
    h1a: 'Ahorren juntos.', grow: 'Crezcan', h1b: 'juntos. Prosperen.',
    sub: 'Una plataforma de confianza para el ahorro cooperativo y la empresa — ahorro grupal, conexión de negocios, contabilidad profesional y crédito completo — adaptada a tu moneda, idioma, impuestos y normas de registro.',
    open: 'Únete a cualquier pilar directamente — sin empezar por un grupo. Círculos de ahorro, comerciantes y empresas establecidas todos bienvenidos.',
    visionT: 'Nuestra visión',
    vision: 'Un futuro donde cada ahorrador, grupo y empresa pueda prosperar: desde la primera moneda ahorrada hasta una institución cotizada, con finanzas formales abiertas a todos.',
    missionT: 'Nuestra misión',
    mission: 'Dar a cada grupo de ahorro, emprendedor y empresa una plataforma para ahorrar, pedir prestado, comerciar y crecer, con los registros, salvaguardas y crédito que convierten el esfuerzo informal en instituciones financiables.',
    valuesT: 'Nuestros valores',
    nicheKicker: 'Nuestro nicho — basado en las razones del fracaso de otros',
    nicheH: 'Ocho razones de colapso. Ocho salvaguardas integradas.',
    nicheP: 'Estudiamos por qué los grupos de ahorro nunca se convierten en cooperativas, bancos e instituciones cotizadas — y digitalizamos la cura de cada una. Esa investigación es el producto.',
    seeEngine: 'Ver el motor de graduación →', pricing: 'Precios',
  },
  pt: {
    kicker: 'Poupar · Crescer · Prosperar',
    h1a: 'Poupem juntos.', grow: 'Cresçam', h1b: 'juntos. Prosperem.',
    sub: 'Uma plataforma de confiança para poupança cooperativa e empresas — poupança em grupo, conexão de negócios, contabilidade profissional e crédito completo — adaptada à sua moeda, idioma, impostos e regras de registo.',
    open: 'Adira a qualquer pilar diretamente — sem precisar de começar por um grupo. Círculos de poupança, comerciantes e empresas estabelecidas todos bem-vindos.',
    visionT: 'A nossa visão',
    vision: 'Um futuro onde cada poupador, grupo e empresa possa prosperar: da primeira moeda poupada a uma instituição cotada, com finanças formais abertas a todos.',
    missionT: 'A nossa missão',
    mission: 'Dar a cada grupo de poupança, empreendedor e empresa uma plataforma para poupar, pedir emprestado, negociar e crescer, com os registos, salvaguardas e crédito que transformam o esforço informal em instituições financiáveis.',
    valuesT: 'Os nossos valores',
    nicheKicker: 'O nosso nicho — construído sobre as razões do fracasso',
    nicheH: 'Oito razões de colapso. Oito salvaguardas integradas.',
    nicheP: 'Estudámos por que os grupos de poupança nunca se tornam cooperativas, bancos e instituições cotadas — e digitalizámos a cura de cada uma. Essa investigação é o produto.',
    seeEngine: 'Ver o motor de graduação →', pricing: 'Preços',
  },
  ar: {
    kicker: 'ادّخر · انمُ · ازدهر',
    h1a: 'ادّخروا معاً.', grow: 'انموا', h1b: 'معاً. وازدهروا.',
    sub: 'منصة موثوقة للادخار التعاوني والأعمال — ادخار جماعي، وربط الأعمال، ومحاسبة احترافية، وادخار وائتمان كامل — مكيَّفة مع عملتك ولغتك وضرائبك وقواعد التسجيل لديك.',
    open: 'انضم إلى أي ركيزة مباشرة — لا حاجة للبدء بمجموعة. دوائر الادخار والتجار والشركات الراسخة الجميع مرحّب بهم.',
    visionT: 'رؤيتنا',
    vision: 'مستقبل يزدهر فيه كل مدّخر ومجموعة وشركة: من أول عملة تُدّخر إلى مؤسسة مدرجة، مع تمويل رسمي مفتوح للجميع.',
    missionT: 'رسالتنا',
    mission: 'أن نمنح كل مجموعة ادخار ورائد أعمال وشركة منصة واحدة للادخار والاقتراض والتجارة والنمو — مكيّفة مع كل مجتمع — بسجلات وضوابط وائتمان يحوّل الجهد غير الرسمي إلى مؤسسات قابلة للتمويل.',
    valuesT: 'قيمنا الأساسية',
    nicheKicker: 'تميّزنا — مبني على أسباب فشل الآخرين',
    nicheH: 'ثمانية أسباب للانهيار. ثمانية ضوابط مدمجة.',
    nicheP: 'درسنا لماذا لا تتحول مجموعات الادخار إلى تعاونيات وبنوك ومؤسسات مدرجة — ورقمنّا العلاج لكل سبب. هذا البحث هو المنتج.',
    seeEngine: '← شاهد محرك النمو الكامل', pricing: 'الأسعار',
  },
  zh: {
    kicker: '储蓄 · 成长 · 兴旺',
    h1a: '一起储蓄。', grow: '一起', h1b: '成长，共同兴旺。',
    sub: '一个值得信赖的合作储蓄与企业平台——小组储蓄、商业撮合、专业级会计、完整的储蓄与信贷——适配您的货币、语言、税务与登记规则。',
    open: '可直接加入任意支柱——无需从小组开始。储蓄互助会、商户与成熟企业都欢迎。',
    visionT: '我们的愿景',
    vision: '一个每位储户、每个小组和每家企业都能按自己的方式兴旺的未来——放进储蓄圈的第一枚硬币与成长企业的账簿运行在同一条可信轨道上，正规金融向所有人开放，而不只属于已有银行账户的人。',
    missionT: '我们的使命',
    mission: '为每个储蓄小组、创业者和企业提供一个值得信赖的平台来储蓄、借贷、交易与成长——以记录、护栏与信贷把非正式的努力变成可获融资的正规机构。没有人因为起点小而不被认真对待，也没有人因语言、识字水平或廉价手机而掉队。',
    valuesT: '核心价值观',
    nicheKicker: '我们的定位——建立在他人失败的原因之上',
    nicheH: '普惠金融失败的八大原因，八道内置护栏。',
    nicheP: '我们研究了储蓄小组为何始终无法成长为合作社、银行与上市机构——并将每一种解法数字化。这项研究就是产品本身。',
    seeEngine: '查看完整成长引擎 →', pricing: '价格',
  },
  hi: {
    kicker: 'बचत · विकास · समृद्धि',
    h1a: 'मिलकर बचत करें।', grow: 'मिलकर', h1b: 'बढ़ें। समृद्ध हों।',
    sub: 'सहकारी बचत और उद्यम के लिए एक भरोसेमंद मंच — समूह बचत, व्यापार मिलान, पेशेवर लेखांकन, और पूर्ण बचत व ऋण — आपकी मुद्रा, भाषा, कर और पंजीकरण नियमों के अनुसार।',
    open: 'किसी भी स्तंभ से सीधे जुड़ें — समूह से शुरू करना ज़रूरी नहीं। बचत मंडलियाँ, व्यापारी और स्थापित व्यवसाय, सभी का स्वागत है।',
    visionT: 'हमारी दृष्टि',
    vision: 'एक ऐसा भविष्य जहाँ हर बचतकर्ता, समूह और व्यवसाय अपनी शर्तों पर समृद्ध हो सके — जहाँ बचत मंडली में डाला गया पहला सिक्का और बढ़ते उद्यम के बही-खाते एक ही भरोसेमंद पटरी पर चलें, और औपचारिक वित्त सबके लिए खुला हो, केवल बैंक-सुविधा वालों के लिए नहीं।',
    missionT: 'हमारा मिशन',
    mission: 'हर बचत समूह, उद्यमी और उद्यम को बचत, ऋण, व्यापार और विकास के लिए एक भरोसेमंद मंच देना — उन अभिलेखों, सुरक्षा-कवचों और ऋण के साथ जो अनौपचारिक मेहनत को औपचारिक, वित्त-योग्य संस्थाओं में बदलते हैं। छोटा शुरू करने से कोई कम गंभीर नहीं माना जाता, और भाषा, साक्षरता या सस्ते फोन के कारण कोई पीछे नहीं छूटता।',
    valuesT: 'हमारे मूल मूल्य',
    nicheKicker: 'हमारी विशेषता — दूसरों की विफलता के कारणों पर निर्मित',
    nicheH: 'विफलता के आठ कारण। आठ अंतर्निहित सुरक्षा-कवच।',
    nicheP: 'हमने अध्ययन किया कि बचत समूह सहकारी संस्थाओं, बैंकों और सूचीबद्ध संस्थानों तक क्यों नहीं पहुँच पाते — और हर कारण का समाधान डिजिटल किया। वही शोध हमारा उत्पाद है।',
    seeEngine: 'पूरा विकास इंजन देखें →', pricing: 'मूल्य',
  },
  de: {
    kicker: 'Sparen · Wachsen · Gedeihen',
    h1a: 'Gemeinsam sparen.', grow: 'Gemeinsam', h1b: 'wachsen. Gedeihen.',
    sub: 'Eine vertrauenswürdige Plattform für genossenschaftliches Sparen und Unternehmen — Gruppensparen, Geschäftsvermittlung, professionelle Buchhaltung und vollwertige Spar- und Kreditdienste — angepasst an Ihre Währung, Sprache, Steuern und Registrierungsregeln.',
    open: 'Treten Sie jeder Säule direkt bei — kein Gruppenstart nötig. Sparkreise, Händler und etablierte Unternehmen: alle willkommen.',
    visionT: 'Unsere Vision',
    vision: 'Eine Zukunft, in der jede Sparerin, jede Gruppe und jedes Unternehmen zu eigenen Bedingungen gedeihen kann — in der die erste Münze im Sparkreis und die Bücher eines wachsenden Unternehmens auf denselben vertrauenswürdigen Schienen laufen und formale Finanzen allen offenstehen, nicht nur den bereits Bankierten.',
    missionT: 'Unsere Mission',
    mission: 'Jeder Spargruppe, jedem Unternehmer und jedem Unternehmen eine vertrauenswürdige Plattform zum Sparen, Leihen, Handeln und Wachsen zu geben — mit den Aufzeichnungen, Leitplanken und Krediten, die informelle Arbeit in formale, finanzierbare Institutionen verwandeln. Niemand muss klein anfangen, um ernst genommen zu werden, und niemand bleibt wegen Sprache, Alphabetisierung oder eines günstigen Telefons zurück.',
    valuesT: 'Unsere Grundwerte',
    nicheKicker: 'Unsere Nische — gebaut auf den Gründen des Scheiterns anderer',
    nicheH: 'Acht Gründe für den Kollaps. Acht eingebaute Leitplanken.',
    nicheP: 'Wir haben untersucht, warum Spargruppen nie zu Genossenschaften, Banken und börsennotierten Institutionen heranwachsen — und die Lösung für jeden Grund digitalisiert. Diese Forschung ist das Produkt.',
    seeEngine: 'Den vollständigen Wachstumsmotor ansehen →', pricing: 'Preise',
  },
  ru: {
    kicker: 'Копи · Расти · Процветай',
    h1a: 'Копите вместе.', grow: 'Растите', h1b: 'вместе. Процветайте.',
    sub: 'Надёжная платформа для кооперативных сбережений и бизнеса — групповые сбережения, подбор бизнеса, профессиональный учёт и полный цикл сбережений и кредита — с учётом вашей валюты, языка, налогов и правил регистрации.',
    open: 'Присоединяйтесь к любому направлению напрямую — начинать с группы не обязательно. Сберегательные круги, торговцы и состоявшиеся компании — все желанны.',
    visionT: 'Наше видение',
    vision: 'Будущее, в котором каждый вкладчик, группа и бизнес процветают на своих условиях — где первая монета в сберегательном круге и бухгалтерия растущего предприятия идут по одним надёжным рельсам, а формальные финансы открыты каждому, а не только уже охваченным банками.',
    missionT: 'Наша миссия',
    mission: 'Дать каждой сберегательной группе, предпринимателю и предприятию надёжную платформу, чтобы копить, занимать, торговать и расти — с записями, защитными механизмами и кредитом, которые превращают неформальные усилия в формальные, пригодные для финансирования институты. Никому не нужно начинать с малого, чтобы к нему относились серьёзно, и никто не остаётся позади из-за языка, грамотности или дешёвого телефона.',
    valuesT: 'Наши ценности',
    nicheKicker: 'Наша ниша — построена на причинах чужих неудач',
    nicheH: 'Восемь причин краха. Восемь встроенных защит.',
    nicheP: 'Мы изучили, почему сберегательные группы не вырастают в кооперативы, банки и публичные институты — и оцифровали решение каждой причины. Это исследование и есть продукт.',
    seeEngine: 'Полный механизм роста →', pricing: 'Цены',
  },
};

const PILLARS: Partial<Record<Lang, string[]>> & { en: string[] } = {
  en: ['1 · Records & Table Banking', '2 · Business Matching', '3 · Accounting & Compliance', '4 · SACCO+ Savings & Credit'],
  sw: ['1 · Kumbukumbu & Table Banking', '2 · Kuunganisha Biashara', '3 · Uhasibu & Uzingatiaji', '4 · SACCO+ Akiba & Mikopo'],
  fr: ['1 · Registres & Tontine', '2 · Mise en relation', '3 · Comptabilité & Conformité', '4 · Épargne & Crédit SACCO+'],
  es: ['1 · Registros & Ahorro grupal', '2 · Conexión de negocios', '3 · Contabilidad & Cumplimiento', '4 · Ahorro & Crédito SACCO+'],
  pt: ['1 · Registos & Poupança em grupo', '2 · Conexão de negócios', '3 · Contabilidade & Conformidade', '4 · Poupança & Crédito SACCO+'],
  ar: ['١ · السجلات والادخار الجماعي', '٢ · ربط الأعمال', '٣ · المحاسبة والامتثال', '٤ · الادخار والائتمان SACCO+'],
};

const VALUES: Partial<Record<Lang, string[]>> & { en: string[] } = {
  en: ['Trust', 'Inclusion', 'Discipline', 'Growth', 'Simplicity'],
  sw: ['Uaminifu', 'Ujumuishaji', 'Nidhamu', 'Ukuaji', 'Urahisi'],
  fr: ['Confiance', 'Inclusion', 'Discipline', 'Croissance', 'Simplicité'],
  es: ['Confianza', 'Inclusión', 'Disciplina', 'Crecimiento', 'Sencillez'],
  pt: ['Confiança', 'Inclusão', 'Disciplina', 'Crescimento', 'Simplicidade'],
  ar: ['الثقة', 'الشمول', 'الانضباط', 'النمو', 'البساطة'],
};

// Click-to-market: what each core value means in the product (aligned by
// index with VALUES). Any missing language falls back to English.
const VALUE_LINKS = ['/dashboard', '/subscribe', '/sacco', '/match', '/groups/new'] as const;
const VALUE_DETAILS: Partial<Record<Lang, { cta: string; items: string[] }>> & { en: { cta: string; items: string[] } } = {
  en: { cta: 'See it in action →', items: [
    'Every contribution, loan and resolution is recorded on a tamper-proof, audit-ready trail. What your members see is what a bank sees — the same truth.',
    'Phone-first, ten languages, works on an entry-level device — and any pillar is joinable directly. If you can save, you belong.',
    'The eight reasons savings groups fail are built in as guard-rails — dual approval, liquidity brakes, and credit earned by consistency, not connections.',
    'A ladder, not a ceiling: records become credit, credit becomes a business, and businesses graduate toward regulated institutions. Stawi grows with you.',
    "The app always answers 'what do I do next?' — a self-directing journey from your first entry to your month-end statement in a few taps.",
  ]},
  sw: { cta: 'Ione ikifanya kazi →', items: [
    'Kila mchango, mkopo na azimio hurekodiwa kwenye kumbukumbu isiyoweza kuchezewa, tayari kwa ukaguzi — wanachoona wanachama ndicho benki inachokiona.',
    'Simu kwanza, lugha kumi, inafanya kazi kwenye simu ya bei nafuu — na unaweza kujiunga na nguzo yoyote moja kwa moja. Ukiweza kuweka akiba, unakaribishwa.',
    'Sababu nane zinazoangusha vikundi vya akiba zimejengwa ndani kama ulinzi — idhini mbili, breki za ukwasi, na mikopo inayopatikana kwa nidhamu.',
    'Ngazi, si dari: kumbukumbu huwa mikopo, mikopo huwa biashara, na biashara hukua kuelekea taasisi rasmi — Stawi hukua nawe.',
    "Programu daima hujibu 'nifanye nini sasa?' — safari inayojielekeza kutoka ingizo la kwanza hadi taarifa ya mwisho wa mwezi.",
  ]},
  fr: { cta: 'Voir en action →', items: [
    "Chaque cotisation, prêt et résolution est consigné dans un registre infalsifiable, prêt pour l'audit — ce que voient vos membres est ce que voit une banque.",
    "Mobile d'abord, dix langues, fonctionne sur un téléphone d'entrée de gamme — et chaque pilier se rejoint directement.",
    "Les huit causes d'échec des groupes d'épargne sont intégrées comme garde-fous — double validation, freins de liquidité, crédit gagné par la régularité.",
    "Une échelle, pas un plafond : les registres deviennent du crédit, le crédit une entreprise, et l'entreprise grandit vers une institution formelle.",
    "L'application répond toujours à « que faire ensuite ? » — un parcours auto-guidé, du premier enregistrement au relevé de fin de mois.",
  ]},
  es: { cta: 'Verlo en acción →', items: [
    'Cada aporte, préstamo y resolución queda en un registro a prueba de manipulaciones, listo para auditoría — lo que ven tus miembros es lo que ve un banco.',
    'Primero el teléfono, diez idiomas, funciona en un dispositivo básico — y cualquier pilar se une directamente.',
    'Las ocho causas de fracaso de los grupos de ahorro están integradas como salvaguardas — doble aprobación, frenos de liquidez y crédito ganado con constancia.',
    'Una escalera, no un techo: los registros se vuelven crédito, el crédito un negocio, y el negocio crece hacia una institución formal.',
    "La app siempre responde '¿qué hago ahora?' — un recorrido autoguiado desde el primer registro hasta el estado de fin de mes.",
  ]},
  pt: { cta: 'Ver em ação →', items: [
    'Cada contribuição, empréstimo e resolução fica num registo à prova de adulteração, pronto para auditoria — o que os membros veem é o que um banco vê.',
    'Telemóvel primeiro, dez idiomas, funciona num aparelho básico — e qualquer pilar pode ser aderido diretamente.',
    'As oito causas de fracasso dos grupos de poupança estão integradas como salvaguardas — dupla aprovação, travões de liquidez e crédito ganho com constância.',
    'Uma escada, não um teto: registos viram crédito, crédito vira negócio, e o negócio cresce rumo a uma instituição formal.',
    "A app responde sempre 'o que faço a seguir?' — um percurso autoguiado do primeiro registo ao extrato de fim de mês.",
  ]},
  ar: { cta: 'شاهدها عملياً ←', items: [
    'كل مساهمة وقرض وقرار يُسجَّل في سجل غير قابل للتلاعب وجاهز للتدقيق — ما يراه أعضاؤك هو ما يراه البنك.',
    'الهاتف أولاً، عشر لغات، يعمل على جهاز بسيط — ويمكن الانضمام إلى أي ركيزة مباشرة.',
    'أسباب فشل مجموعات الادخار الثمانية مدمجة كضوابط — موافقة مزدوجة، وكوابح سيولة، وائتمان يُكتسب بالانتظام.',
    'سُلَّم لا سقف: السجلات تصبح ائتماناً، والائتمان مشروعاً، والمشروع ينمو نحو مؤسسة رسمية — وستاوي ينمو معك.',
    'التطبيق يجيب دائماً: «ماذا أفعل الآن؟» — رحلة ذاتية التوجيه من أول قيد حتى كشف نهاية الشهر.',
  ]},
  zh: { cta: '看看实际效果 →', items: [
    '每笔缴款、贷款和决议都记录在防篡改、可随时审计的账本上——成员看到的，就是银行看到的。',
    '手机优先、十种语言、入门级设备也能用——任何支柱都可直接加入。',
    '储蓄小组失败的八大原因被内置为八道护栏——双重审批、流动性刹车、靠坚持赢得的信贷。',
    '是阶梯而非天花板：记录变成信贷，信贷变成生意，生意成长为正规机构——Stawi 与你一同成长。',
    "应用永远回答'下一步做什么'——从第一笔记录到月末报表的自导航之旅。",
  ]},
  hi: { cta: 'इसे काम करते देखें →', items: [
    'हर योगदान, ऋण और प्रस्ताव छेड़छाड़-रोधी, ऑडिट-तैयार बही में दर्ज होता है — जो सदस्य देखते हैं, वही बैंक देखता है।',
    'फोन-प्रथम, दस भाषाएँ, साधारण फोन पर भी चलता है — और किसी भी स्तंभ से सीधे जुड़ें।',
    'बचत समूहों की विफलता के आठ कारण सुरक्षा-कवच के रूप में निर्मित हैं — दोहरी मंज़ूरी, तरलता ब्रेक, नियमितता से अर्जित ऋण।',
    'सीढ़ी है, छत नहीं: अभिलेख ऋण बनते हैं, ऋण व्यवसाय, और व्यवसाय औपचारिक संस्था की ओर बढ़ता है — Stawi आपके साथ बढ़ता है।',
    "ऐप हमेशा बताता है 'अब क्या करें?' — पहली प्रविष्टि से माह-अंत विवरण तक स्वयं-निर्देशित यात्रा।",
  ]},
  de: { cta: 'In Aktion sehen →', items: [
    'Jeder Beitrag, Kredit und Beschluss landet in einem fälschungssicheren, prüfbereiten Register — was Ihre Mitglieder sehen, sieht auch die Bank.',
    'Telefon zuerst, zehn Sprachen, läuft auf einem Einsteigergerät — und jede Säule ist direkt beitretbar.',
    'Die acht Gründe, an denen Spargruppen scheitern, sind als Leitplanken eingebaut — Vier-Augen-Prinzip, Liquiditätsbremsen, Kredit durch Beständigkeit.',
    'Eine Leiter, keine Decke: Aufzeichnungen werden Kredit, Kredit wird Geschäft, das Geschäft wächst zur formalen Institution — Stawi wächst mit.',
    "Die App beantwortet immer 'Was jetzt?' — eine selbstführende Reise vom ersten Eintrag bis zum Monatsabschluss.",
  ]},
  ru: { cta: 'Посмотреть в действии →', items: [
    'Каждый взнос, кредит и решение фиксируются в защищённом от подделки, готовом к аудиту реестре — члены видят то же, что и банк.',
    'Сначала телефон, десять языков, работает на простом устройстве — и к любому направлению можно присоединиться напрямую.',
    'Восемь причин краха сберегательных групп встроены как защита — двойное одобрение, тормоза ликвидности, кредит за постоянство.',
    'Лестница, а не потолок: записи становятся кредитом, кредит — бизнесом, бизнес растёт до формального института — Stawi растёт вместе с вами.',
    'Приложение всегда отвечает «что дальше?» — самонаправляемый путь от первой записи до отчёта на конец месяца.',
  ]},
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
  const [valOpen, setValOpen] = useState<number | null>(null);
  const t = { ...T.en, ...(T[lang] ?? {}) };

  useEffect(() => {
    try {
      const l = localStorage.getItem('stawiLang') as Lang | null;
      if (l && T[l]) {
        setLang(l);
        document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = l;
      }
      const th = localStorage.getItem('stawiTheme');
      if (th === 'dark') { setDark(true); document.documentElement.classList.add('dark'); }
    } catch {}
  }, []);

  function changeLang(l: Lang) {
    setLang(l);
    // Right-to-left for Arabic; LTR for everything else.
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
    try { localStorage.setItem('stawiLang', l); } catch {}
  }
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
            <option value="en">English</option>
            <option value="sw">Kiswahili</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
            <option value="pt">Português</option>
            <option value="ar">العربية</option>
            <option value="zh">中文</option>
            <option value="hi">हिन्दी</option>
            <option value="de">Deutsch</option>
            <option value="ru">Русский</option>
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
          {(PILLARS[lang] ?? PILLARS.en).map((label, i) => {
            const routes = ['/dashboard', '/match', '/books', '/sacco'] as const;
            const href = routes[i] ?? '/dashboard';
            return (
              <Link key={href} href={href} style={{ fontSize: 13, fontWeight: 700, color: 'var(--forest-deep)', background: 'var(--paper)', border: '1px solid var(--line)', padding: '8px 14px', borderRadius: 999, textDecoration: 'none' }}>
                {label}
              </Link>
            );
          })}
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
            {(VALUES[lang] ?? VALUES.en).map((v, i) => (
              <button key={v} onClick={() => setValOpen(valOpen === i ? null : i)}
                aria-expanded={valOpen === i}
                style={{ fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  color: valOpen === i ? 'var(--bone)' : 'var(--forest-deep)',
                  background: valOpen === i ? 'var(--forest-deep)' : 'var(--bone-2)',
                  border: `1px solid ${valOpen === i ? 'var(--forest-deep)' : 'var(--line)'}`,
                  padding: '6px 12px', borderRadius: 999, transition: 'all .2s ease' }}>
                {v}{valOpen === i ? ' ✕' : ''}
              </button>
            ))}
          </div>
          {valOpen !== null && (() => {
            const d = VALUE_DETAILS[lang] ?? VALUE_DETAILS.en;
            const title = (VALUES[lang] ?? VALUES.en)[valOpen] ?? '';
            const pitch = d.items[valOpen] ?? VALUE_DETAILS.en.items[valOpen] ?? '';
            const href = VALUE_LINKS[valOpen] ?? '/dashboard';
            return (
              <div style={{ marginTop: 12, background: 'var(--bone-2)', border: '1px solid var(--gold)', borderRadius: 12, padding: '13px 15px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--forest-deep)' }}>{title}</div>
                <p style={{ marginTop: 6, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>{pitch}</p>
                <Link href={href} style={{ display: 'inline-block', marginTop: 8, fontSize: 13, fontWeight: 800, color: 'var(--forest-deep)', textDecoration: 'none' }}>
                  {d.cta}
                </Link>
              </div>
            );
          })()}
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
        <span>Save · Grow · Thrive — multi-tenant SaaS</span>
        <Link href="/terms" style={{ color: 'var(--faint)' }}>Terms</Link>
        <Link href="/subscribe" style={{ color: 'var(--faint)' }}>{t.pricing}</Link>
      </footer>
    </main>
  );
}
