/**
 * Research and compare a group's shortlisted business ideas (owner 28/11/26).
 *
 * Pure and offline: every idea in the Ideas catalogue has a researched profile
 * (what the money buys, how fast money comes back, the Kenyan papers needed,
 * the main risks, how it can grow). `compareIdeas` scores 2–3 shortlisted
 * ideas on eight weighted criteria against the group's own capital, ranks
 * them (most favourable, second, weakest) and says why in plain words.
 *
 * Every figure is a rough guide for a first conversation, never a promise:
 * the page says so, and tells the group how to check on the ground. The
 * optional AI web research (apps/web) adds fresh, sourced facts on top.
 *
 * Sources behind the defaults (checked 28/11/26): KNBS/KIPPRA MSME survey
 * (46% of small businesses closed in their first year; copying a neighbour's
 * business and no market check are leading causes); county single business
 * permit; NEMA waste-water rules (car wash, laundry); public health, food
 * handler and fire certificates plus the KEBS mark for food (bakery,
 * peanut butter, crisps); NTSA registration, licence and commercial
 * insurance for transport. Legal lists are indicative: check with the county
 * and the named office.
 */
import { generateVentures, type Industry, type Venture } from './match';

export type Level = 1 | 2 | 3 | 4 | 5;

export interface VentureProfile {
  /** What the startup money buys. */
  buys: string[];
  /** Monthly sales as a multiple of the startup cost (stock turns, service volume). */
  turnover: number;
  /** Rent, wages, power, transport as a share of monthly sales (0–1). */
  overheadShare: number;
  /** Weeks from starting to the first sale. */
  firstSaleWeeks: number;
  /** How steady the buying is (5 = every day, everyone). */
  demand: Level;
  /** How crowded the market usually is (5 = one on every corner). */
  competition: Level;
  /** Skill needed before you start (5 = a trained trade). */
  skill: Level;
  /** Room to grow and branch out (5 = many paths). */
  growth: Level;
  hours: string;
  legal: string[];
  risks: string[];
  /** How to make each risk smaller. */
  protect: string[];
  merits: string[];
  demerits: string[];
  grow: string[];
  diversify: string[];
  seasons: string;
  /** What to check on the ground before deciding. */
  check: string[];
}

const PERMIT = 'County single business permit (renew every year)';
const KRA = 'KRA PIN for the group or business, and file returns';
const FOOD = [
  'Public health certificate after the county inspects the premises',
  'Food handler medical certificate for each worker (every 6 months)',
  'Fire safety certificate from the county',
  'KEBS standardisation mark before selling to supermarkets',
];
const VEHICLE = (what: string) => [
  `NTSA registration and logbook for the ${what}`,
  'Driving licence of the right class for every rider or driver',
  'Commercial (PSV or goods) insurance, not private insurance',
  'County sticker or parking fees where the county charges them',
];

export const VENTURE_PROFILES: Record<string, VentureProfile> = {
  'Cold-press peanut butter': {
    buys: ['Small grinding machine', 'Roaster', 'Jars and labels', 'First groundnut stock', 'Packaging table and scale'],
    turnover: 0.7, overheadShare: 0.15, firstSaleWeeks: 4, demand: 4, competition: 2, skill: 2, growth: 4,
    hours: 'Half days for making; selling time on top',
    legal: [PERMIT, KRA, ...FOOD],
    risks: ['Mould (aflatoxin) in poor groundnuts', 'Slow sales without a supermarket listing', 'Groundnut prices rise after a bad season'],
    protect: ['Buy clean, dry nuts from one trusted supplier and sort by hand', 'Start with schools, estates and kiosks while the KEBS mark is processed', 'Buy a few months of nuts after harvest when prices are low'],
    merits: ['Few makers in most towns', 'Keeps for months, so little waste', 'Good margin per jar'],
    demerits: ['KEBS mark takes time and money', 'Needs steady quality every batch'],
    grow: ['Supermarket listing once the KEBS mark is in', 'Bigger grinder and a second shift', 'Supply schools on contract'],
    diversify: ['Honey or chocolate peanut butter', 'Roasted nuts in small packs', 'Sunflower or simsim paste'],
    seasons: 'Steady all year; school terms add orders.',
    check: ['Count peanut butter brands in three nearby shops and their prices', 'Ask two schools if they would buy monthly', 'Price the KEBS mark at the nearest KEBS office'],
  },
  'Egg supply route': {
    buys: ['Motorbike or bicycle carrier', 'Egg trays and crates', 'First egg stock', 'Phone for orders'],
    turnover: 2, overheadShare: 0.08, firstSaleWeeks: 1, demand: 5, competition: 3, skill: 1, growth: 3,
    hours: 'Early mornings, six days a week',
    legal: [PERMIT, KRA, 'Buy only from known farms (traceability if the county asks)'],
    risks: ['Breakage on rough roads', 'Price falls when cheap imported eggs flood in', 'A customer who does not pay'],
    protect: ['Pack well and carry fewer crates per trip', 'Sign weekly orders with fixed prices', 'Cash or M-Pesa on delivery for new customers'],
    merits: ['Sales from the first week', 'Every kiosk and hotel buys eggs', 'Very little skill needed'],
    demerits: ['Thin margin per egg', 'Hard, daily work'],
    grow: ['More routes with a hired rider', 'Own layers to cut the buying price'],
    diversify: ['Add milk, bread or chicken to the same route', 'Sell kienyeji eggs at a higher price'],
    seasons: 'Prices dip in the rainy season when supply is high.',
    check: ['Ask ten kiosks and two hotels who brings their eggs and the price', 'Visit two farms for a steady supply price'],
  },
  'Hydroponic kale unit': {
    buys: ['Greenhouse or shade net', 'Hydroponic channels and pump', 'Nutrients and seedlings', 'Water tank'],
    turnover: 0.2, overheadShare: 0.1, firstSaleWeeks: 6, demand: 4, competition: 2, skill: 4, growth: 3,
    hours: 'Daily checks, one to two hours',
    legal: [PERMIT, KRA, 'Water use permit if you drill or pump from a river (WRA)', 'HCD licence only if you export'],
    risks: ['Pump stops in a power cut and plants die', 'Pests and disease in the greenhouse', 'Learning the system takes a few cycles'],
    protect: ['Keep a small solar or battery backup for the pump', 'Train with a supplier who visits', 'Line up a hotel or grocer before planting'],
    merits: ['Harvest every few weeks', 'Clean greens fetch a better price', 'Little land needed'],
    demerits: ['Higher skill and some tech', 'Slow to earn back the setup cost'],
    grow: ['More channels in the same greenhouse', 'Supply supermarkets with steady volumes'],
    diversify: ['Spinach, lettuce, herbs', 'Sell seedlings to other farmers'],
    seasons: 'Prices peak in dry months when open-field kale is scarce.',
    check: ['Visit a working hydroponic farm and ask their real monthly harvest', 'Ask two hotels and a grocer what they pay per kilo'],
  },
  'Banana crisps line': {
    buys: ['Slicer and fryer', 'Gas or stove', 'Sealing machine and packs', 'First bananas and oil'],
    turnover: 0.6, overheadShare: 0.17, firstSaleWeeks: 3, demand: 4, competition: 3, skill: 2, growth: 4,
    hours: 'Making days plus selling days',
    legal: [PERMIT, KRA, ...FOOD],
    risks: ['Cooking oil price swings', 'Crisps go soft in poor packs', 'Big brands on the same shelf'],
    protect: ['Buy oil in bulk when prices dip', 'Use good sealed packs', 'Sell in schools, matatu stages and kiosks first'],
    merits: ['Bananas are cheap and local', 'Snack demand keeps growing', 'Long shelf life'],
    demerits: ['KEBS mark needed for supermarkets', 'Oil makes costs move'],
    grow: ['Supply distributors in nearby towns', 'Bigger fryer and more packers'],
    diversify: ['Cassava and sweet potato crisps', 'Banana flour'],
    seasons: 'Steady; school terms add sales.',
    check: ['Count crisp brands and prices at three kiosks', 'Price bananas at the nearest market over two weeks'],
  },
  'Mini-mart kiosk': {
    buys: ['Shelves and counter', 'First stock of everyday goods', 'Weighing scale', 'Rent deposit'],
    turnover: 1.6, overheadShare: 0.06, firstSaleWeeks: 1, demand: 5, competition: 5, skill: 1, growth: 3,
    hours: 'Long days, seven days a week',
    legal: [PERMIT, KRA, 'Public health certificate if you sell food', 'Weights and measures check of the scale', 'Liquor licence only if you sell alcohol'],
    risks: ['Too many shops on the same street', 'Credit to neighbours that never comes back', 'Theft and stock losses'],
    protect: ['Pick a spot with foot traffic and few shops', 'No credit without a written limit', 'Count stock weekly (Stawi books do this)'],
    merits: ['Cash every day', 'Everyone needs the goods', 'Easy to start'],
    demerits: ['Very thin margins', 'Many competitors', 'Long hours'],
    grow: ['Second kiosk in another estate', 'Wholesale to smaller kiosks'],
    diversify: ['M-Pesa agent counter in the same shop', 'Gas refills', 'Fresh produce'],
    seasons: 'Busier at month-end and holidays.',
    check: ['Count shops within 200 metres of the spot', 'Stand there one morning and count passers-by'],
  },
  'Cosmetics & beauty stall': {
    buys: ['Stall or shelf space', 'First stock of products', 'Display mirror and lights'],
    turnover: 0.9, overheadShare: 0.15, firstSaleWeeks: 1, demand: 4, competition: 4, skill: 2, growth: 3,
    hours: 'Market or shop hours',
    legal: [PERMIT, KRA, 'Sell only KEBS-marked products; never banned skin lighteners (mercury, hydroquinone)'],
    risks: ['Fake products from cheap suppliers', 'Trends change and stock sits', 'Products expire'],
    protect: ['Buy from known distributors with receipts', 'Stock small and reorder what sells', 'Sell older dates first'],
    merits: ['Good margin', 'Loyal repeat buyers', 'Small space needed'],
    demerits: ['Fakes can ruin trust', 'Fashion-driven'],
    grow: ['Online orders on WhatsApp and Instagram', 'Supply salons in bulk'],
    diversify: ['Hair products and braids', 'Nail and makeup services'],
    seasons: 'Peaks at Christmas, Easter and weddings.',
    check: ['Ask three salons where they buy and at what price', 'Visit the main distributor and get a price list'],
  },
  'Mitumba (clothes bale)': {
    buys: ['First bales', 'Stall or display space', 'Hangers and a tent or shade'],
    turnover: 1.1, overheadShare: 0.2, firstSaleWeeks: 1, demand: 5, competition: 4, skill: 2, growth: 3,
    hours: 'Market days plus sorting time',
    legal: [PERMIT, KRA, 'Buy bales only from licensed importers (KEBS-inspected)', 'Market stall fees to the county'],
    risks: ['A bad bale full of poor items', 'Import rules or taxes change', 'Rain on open-air market days'],
    protect: ['Buy from a dealer who lets you see the grade', 'Sell first-grade items early at good prices', 'Have a covered stall'],
    merits: ['Fast sales', 'High margin on good items', 'Huge demand'],
    demerits: ['Each bale is a gamble', 'Crowded markets'],
    grow: ['More bales and a second market day', 'Sell online with photos'],
    diversify: ['New clothes for school uniforms', 'Shoes and bags bales'],
    seasons: 'Peaks before school opening and in cold months.',
    check: ['Watch two sellers on a market day and count sales', 'Ask three importers about bale grades and prices'],
  },
  'Laundry & dry-clean': {
    buys: ['Washing machines', 'Dryer and iron', 'Water tank', 'Shop fit-out'],
    turnover: 0.3, overheadShare: 0.2, firstSaleWeeks: 2, demand: 4, competition: 2, skill: 2, growth: 4,
    hours: 'Shop hours; pick-up and delivery',
    legal: [PERMIT, KRA, 'Water connection approval from the water company', 'NEMA rules for waste water if volumes are large'],
    risks: ['Water shortages', 'Damaged clothes and complaints', 'Power bills'],
    protect: ['Store water and use efficient machines', 'Tag every item and write the terms on the receipt', 'Price per kilo to cover power'],
    merits: ['Customers return every week', 'Little stock to hold', 'Busy towns lack good laundries'],
    demerits: ['Machines cost money upfront', 'Needs water and power'],
    grow: ['Contracts with hostels, hotels, salons', 'Pick-up and delivery by bike'],
    diversify: ['Carpet and duvet cleaning', 'Shoe cleaning'],
    seasons: 'Busier in the rainy season when clothes do not dry.',
    check: ['Count laundries nearby and their price per kilo', 'Ask hostels how they wash bedding'],
  },
  'Car wash bay': {
    buys: ['Pressure washer and vacuum', 'Water tank and pump', 'Site preparation and drainage', 'Soaps and towels'],
    turnover: 0.35, overheadShare: 0.25, firstSaleWeeks: 2, demand: 4, competition: 4, skill: 1, growth: 3,
    hours: 'Seven days; weekends are the busy days',
    legal: [PERMIT, KRA, 'NEMA rules on waste water: a silt and oil trap and approved drainage', 'Water connection or borehole permit (WRA)', 'Fire safety certificate'],
    risks: ['Many car washes compete on price', 'Water shortages', 'NEMA closes sites that pollute'],
    protect: ['Pick a site on a busy road with parking', 'Recycle water and keep a storage tank', 'Build the oil trap from day one'],
    merits: ['Daily cash', 'Low skill needed', 'Strong weekend income'],
    demerits: ['Very crowded market', 'Wages are a big share', 'Waste-water rules'],
    grow: ['Add a second bay', 'Contracts with taxi and fleet owners'],
    diversify: ['Carpet washing', 'Car interior detailing', 'A small café while people wait'],
    seasons: 'Busier in the rainy season and on weekends.',
    check: ['Count car washes within one kilometre and their prices', 'Ask the county and NEMA office what the site needs'],
  },
  'Cyber & M-Pesa agent': {
    buys: ['Computers and printer', 'Agent float (money for M-Pesa)', 'Counter and security', 'Internet'],
    turnover: 0.25, overheadShare: 0.12, firstSaleWeeks: 3, demand: 4, competition: 4, skill: 2, growth: 3,
    hours: 'Long shop hours',
    legal: [PERMIT, KRA, 'M-Pesa agent approval through a Safaricom dealer (certificate of good conduct, permit, float)', 'Keep customer details private (Data Protection Act)'],
    risks: ['Fraud and fake transactions', 'Theft of cash', 'Commission rates set by Safaricom'],
    protect: ['Check IDs every time and follow the agent rules', 'Bank cash daily; keep a safe', 'Earn from printing and e-citizen services too'],
    merits: ['Steady footfall', 'Several income streams', 'Useful in every estate'],
    demerits: ['Float ties up money', 'Commissions are small per transaction'],
    grow: ['Second outlet', 'Bank agent for more banks'],
    diversify: ['E-citizen and KRA filing help', 'Photocopy, lamination, passport photos'],
    seasons: 'Busier at month-end and school-opening time.',
    check: ['Ask a Safaricom dealer what an agent needs today', 'Count agents within 300 metres'],
  },
  'Liquid soap & detergent': {
    buys: ['Mixing drums and stirrers', 'Raw chemicals', 'Bottles and labels', 'Safety gloves and goggles'],
    turnover: 0.9, overheadShare: 0.2, firstSaleWeeks: 2, demand: 5, competition: 3, skill: 2, growth: 4,
    hours: 'Making days plus selling days',
    legal: [PERMIT, KRA, 'KEBS standardisation mark before selling to shops and supermarkets', 'Store chemicals safely and away from food'],
    risks: ['Poor quality batches lose customers', 'Chemical prices rise', 'Unmarked soap gets refused by shops'],
    protect: ['Train with a proper course and keep one recipe', 'Buy chemicals from one dealer with receipts', 'Get the KEBS mark early'],
    merits: ['Low cost to start', 'Every home, school and hotel buys soap', 'Good margin'],
    demerits: ['KEBS mark needed to grow', 'Handling chemicals needs care'],
    grow: ['Supply schools, hotels and hospitals in bulk', 'Own brand in supermarkets'],
    diversify: ['Bleach, dish soap, hand wash', 'Car wash soap'],
    seasons: 'Steady all year.',
    check: ['Ask two schools and a hotel what they pay per 20 litres', 'Price raw chemicals at two dealers'],
  },
  'Bread & bakery': {
    buys: ['Oven and mixer', 'Trays and cooling racks', 'Flour, sugar, yeast', 'Premises fit-out'],
    turnover: 1, overheadShare: 0.09, firstSaleWeeks: 3, demand: 5, competition: 4, skill: 3, growth: 4,
    hours: 'Very early mornings, every day',
    legal: [PERMIT, KRA, ...FOOD],
    risks: ['Flour and power price rises', 'Big bakeries supply the same shops', 'Bread goes stale in two to three days'],
    protect: ['Bake to orders and track what sells', 'Sell fresh bread to nearby kiosks before the big brands arrive', 'Use day-old bread for toast or crumbs'],
    merits: ['Daily essential', 'Fast turnover', 'Loyal local buyers'],
    demerits: ['Thin wholesale margins (8–15%)', 'Many certificates', 'Hard hours'],
    grow: ['Cakes for events at much better margins', 'Supply schools and hotels'],
    diversify: ['Mandazi, scones, cakes', 'Birthday cakes to order'],
    seasons: 'Cakes peak in December and in wedding season.',
    check: ['Ask five kiosks which bread sells and at what margin', 'Visit the county health office about premises rules'],
  },
  'Briquette making': {
    buys: ['Briquette press', 'Drying racks', 'Charcoal dust or farm waste', 'Binder and sacks'],
    turnover: 0.5, overheadShare: 0.17, firstSaleWeeks: 3, demand: 4, competition: 2, skill: 2, growth: 3,
    hours: 'Making and drying days',
    legal: [PERMIT, KRA, 'Raw material must come from legal sources (charcoal rules)', 'KEBS mark to sell to supermarkets and institutions'],
    risks: ['Slow drying in the rainy season', 'Buyers stick to charcoal', 'Raw material supply'],
    protect: ['Covered drying racks', 'Give schools a free trial bag', 'Contract a steady supply of dust or husks'],
    merits: ['Few competitors', 'Schools and hotels buy in bulk', 'Uses waste'],
    demerits: ['Messy work', 'Buyers need convincing'],
    grow: ['Contracts with schools and poultry farmers', 'Bigger press'],
    diversify: ['Clean cook stoves', 'Biochar for farms'],
    seasons: 'Demand rises in cold months; drying is slower in rain.',
    check: ['Ask two schools what they spend on fuel each term', 'Find a steady supply of dust or husks'],
  },
  'Digital printing & design': {
    buys: ['Computer and design software', 'Large printer', 'Heat press and cutter', 'Shop space'],
    turnover: 0.35, overheadShare: 0.27, firstSaleWeeks: 3, demand: 4, competition: 3, skill: 4, growth: 5,
    hours: 'Shop hours; deadlines before events',
    legal: [PERMIT, KRA, 'County signage and advertising fees for your own signs', 'Do not copy other brands (copyright and trade marks)'],
    risks: ['Needs a skilled designer', 'Machines break and ink is costly', 'Customers who order and never collect'],
    protect: ['A member with design skills, or a trained hire', 'Service contract with the supplier', 'Ask for a deposit on every order'],
    merits: ['High margin on design work', 'Schools, churches, businesses all need printing', 'Grows into many services'],
    demerits: ['Skill matters most', 'Expensive machines'],
    grow: ['School and church contracts', 'Branding packages for small businesses'],
    diversify: ['T-shirt and mug printing', 'Signs and banners'],
    seasons: 'Peaks at school opening, elections and December events.',
    check: ['Ask three printers their prices and how busy they are', 'Confirm who in the group can design'],
  },
  'Online thrift store': {
    buys: ['First stock of quality second-hand clothes', 'Smartphone with a good camera', 'Packaging', 'Small ads budget'],
    turnover: 1, overheadShare: 0.22, firstSaleWeeks: 2, demand: 4, competition: 4, skill: 2, growth: 4,
    hours: 'Photos, posting and deliveries, daily',
    legal: [PERMIT, KRA, 'Keep customer details private (Data Protection Act)', 'Clear return and refund terms'],
    risks: ['Ads cost more than they earn', 'Delivery problems', 'Many sellers on the same platforms'],
    protect: ['Post daily on free channels first', 'Use known delivery riders and pay on delivery', 'Build a niche (sizes, styles, kids)'],
    merits: ['Reach the whole country', 'No shop rent', 'Good margins'],
    demerits: ['Needs steady marketing', 'Customers cannot touch the goods'],
    grow: ['Own website or shop page', 'Pop-up stalls on weekends'],
    diversify: ['Shoes and bags', 'Kids clothes'],
    seasons: 'Peaks at month-end and before holidays.',
    check: ['Follow five sellers for two weeks and count their posts and buyers', 'Price delivery riders in your town'],
  },
  'Phone repair lab': {
    buys: ['Repair tools and soldering station', 'Spare parts stock', 'Small shop or counter', 'Training if needed'],
    turnover: 0.4, overheadShare: 0.2, firstSaleWeeks: 2, demand: 5, competition: 3, skill: 4, growth: 3,
    hours: 'Shop hours',
    legal: [PERMIT, KRA, 'Buy parts from known dealers with receipts', 'Never handle stolen phones; record IMEI numbers'],
    risks: ['Needs a trained technician', 'Fake spare parts', 'Customers blame you for old faults'],
    protect: ['A trained member or hire', 'Buy original parts and give a short warranty', 'Test and note faults before repair'],
    merits: ['Everyone has a phone', 'Repeat customers', 'Good margin on labour'],
    demerits: ['Skill matters most', 'Parts change with each new phone'],
    grow: ['Second technician', 'Sell accessories'],
    diversify: ['Accessories and screen protectors', 'Laptop and TV repair'],
    seasons: 'Steady all year.',
    check: ['Ask three repair shops how many phones they fix a day', 'Confirm who in the group can repair'],
  },
  'Boda boda fleet': {
    buys: ['Motorbikes', 'Helmets and reflective jackets', 'Insurance and registration', 'Tracker'],
    turnover: 0.2, overheadShare: 0.05, firstSaleWeeks: 1, demand: 5, competition: 5, skill: 2, growth: 3,
    hours: 'Riders work daily; owners follow up weekly',
    legal: [PERMIT, KRA, ...VEHICLE('motorbike'), 'Helmets and reflective jackets for rider and passenger'],
    risks: ['Accidents', 'Theft of bikes', 'Riders who stop paying', 'County crackdowns'],
    protect: ['Trained riders, helmets and comprehensive insurance', 'A tracker and safe night parking', 'Written rider agreement and weekly M-Pesa payments', 'Papers always current and riders in a registered boda SACCO'],
    merits: ['Money from the first week', 'Bikes can be sold if needed', 'Huge demand'],
    demerits: ['Accident risk', 'Bikes lose value fast', 'Depends on riders'],
    grow: ['Add bikes one at a time from earnings', 'Delivery contracts with shops'],
    diversify: ['Spare parts and service shop', 'Parcel delivery'],
    seasons: 'Steady; rain raises demand.',
    check: ['Ask three bike owners what riders pay a week and the repair costs', 'Get insurance quotes'],
  },
  'Tuk-tuk delivery': {
    buys: ['Tuk-tuk or three-wheeler', 'Insurance and registration', 'Tracker'],
    turnover: 0.15, overheadShare: 0.08, firstSaleWeeks: 2, demand: 4, competition: 3, skill: 2, growth: 3,
    hours: 'Driver daily; owner follows up weekly',
    legal: [PERMIT, KRA, ...VEHICLE('tuk-tuk'), 'Vehicle inspection where required'],
    risks: ['Accidents and repairs', 'Driver who stops paying', 'Competition from boda bodas'],
    protect: ['Insurance, tracker and a written driver agreement', 'Regular service', 'Contracts with shops and wholesalers'],
    merits: ['Carries more than a boda', 'Contracts with shops', 'Asset can be sold'],
    demerits: ['Costly to buy', 'Slow to earn back'],
    grow: ['Second tuk-tuk', 'Fixed routes for wholesalers'],
    diversify: ['Passenger trips', 'Moving services'],
    seasons: 'Steady; market days are busiest.',
    check: ['Ask wholesalers what they pay per delivery', 'Ask two owners their weekly earnings'],
  },
  'Cargo pickup hire': {
    buys: ['Pickup truck', 'Insurance and registration', 'Tracker', 'Ropes and covers'],
    turnover: 0.18, overheadShare: 0.1, firstSaleWeeks: 2, demand: 4, competition: 3, skill: 2, growth: 3,
    hours: 'Driver daily; owner finds contracts',
    legal: [PERMIT, KRA, ...VEHICLE('pickup'), 'Annual motor vehicle inspection for commercial vehicles', 'Goods-in-transit insurance helps win contracts'],
    risks: ['Big money in one asset', 'Breakdowns stop income', 'Contracts end'],
    protect: ['Service on time and keep a repair fund', 'Two or more regular clients', 'Comprehensive insurance'],
    merits: ['Contract income', 'Asset can be sold', 'Farmers and traders need transport'],
    demerits: ['Needs most capital', 'Fuel prices move'],
    grow: ['Second vehicle', 'Long-term farm or factory contracts'],
    diversify: ['Moving and delivery services', 'Buying and selling produce'],
    seasons: 'Peaks at harvest time.',
    check: ['Ask farmers and shops what they pay per trip', 'Get insurance and inspection costs'],
  },
};

export const IDEA_CRITERIA = [
  { key: 'profit', label: 'Profit each month', weight: 20 },
  { key: 'payback', label: 'Time to earn the money back', weight: 15 },
  { key: 'risk', label: 'Safety (low risk)', weight: 15 },
  { key: 'capital', label: 'Fits the group’s money', weight: 15 },
  { key: 'demand', label: 'Buyers and competition', weight: 15 },
  { key: 'ease', label: 'Easy to start (papers and skills)', weight: 10 },
  { key: 'speed', label: 'First sales soon', weight: 5 },
  { key: 'growth', label: 'Room to grow', weight: 5 },
] as const;

export type CriterionKey = (typeof IDEA_CRITERIA)[number]['key'];

export interface IdeaStudy {
  venture: Venture;
  profile: VentureProfile;
  /** Rough monthly sales, cents. */
  monthlySalesCents: number;
  /** Rough monthly profit after running costs, cents (can be 0 or below). */
  monthlyProfitCents: number;
  /** Months to earn back the startup cost; null if it never pays back. */
  paybackMonths: number | null;
  /** Money left in the group after starting it (negative = short). */
  leftoverCents: number | null;
  scores: Record<CriterionKey, number>;
  total: number;
  rank: number;
  verdict: 'best' | 'second' | 'weakest';
  /** Why this place, in plain words. */
  why: string[];
}

export interface IdeaComparison {
  studies: IdeaStudy[];
  /** True when the top two are too close to call on numbers alone. */
  close: boolean;
  summary: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const RISK_SCORE = { Low: 85, Moderate: 60, Higher: 35 } as const;

export function profileFor(title: string): VentureProfile | null {
  return VENTURE_PROFILES[title] ?? null;
}

/** Score one idea on each criterion, 0–100. */
function study(v: Venture, p: VentureProfile, capitalCents: number) {
  const sales = Math.round(v.startupCents * p.turnover);
  const profit = Math.round(sales * (v.marginPct / 100 - p.overheadShare));
  const payback = profit > 0 ? Math.round((v.startupCents / profit) * 10) / 10 : null;
  const leftover = capitalCents > 0 ? capitalCents - v.startupCents : null;
  const ret = v.startupCents > 0 ? profit / v.startupCents : 0;
  let capital = 70;
  if (leftover !== null) {
    const buffer = leftover / capitalCents;
    capital = buffer < 0 ? Math.max(0, 40 + buffer * 100) : clamp(55 + (buffer / 0.25) * 45);
  }
  const scores: Record<CriterionKey, number> = {
    profit: clamp((ret / 0.2) * 100),
    payback: payback === null ? 0 : clamp(100 - ((payback - 3) / 33) * 100),
    risk: clamp(RISK_SCORE[v.risk] - (p.risks.length > 3 ? 5 : 0)),
    capital,
    demand: clamp(p.demand * 20 - (p.competition - 1) * 9),
    ease: clamp(100 - Math.max(0, p.legal.length - 2) * 9 - (p.skill - 1) * 13),
    speed: clamp(100 - ((p.firstSaleWeeks - 1) / 7) * 100),
    growth: p.growth * 20,
  };
  const total = Math.round(IDEA_CRITERIA.reduce((t, c) => t + scores[c.key] * c.weight, 0) / 100);
  return { sales, profit, payback, leftover, scores, total };
}

/**
 * Compare 2–3 shortlisted ideas. Ideas with no researched profile are skipped
 * (the page explains). Ranked by weighted score, ties to the faster payback.
 */
export function compareIdeas(ventures: Venture[], capitalCents = 0): IdeaComparison {
  const rows = ventures
    .slice(0, 3)
    .map((v) => ({ v, p: profileFor(v.title) }))
    .filter((r): r is { v: Venture; p: VentureProfile } => !!r.p)
    .map(({ v, p }) => ({ v, p, ...study(v, p, capitalCents) }));
  rows.sort((a, b) => b.total - a.total || (a.payback ?? 999) - (b.payback ?? 999));

  const studies: IdeaStudy[] = rows.map((r, i) => {
    const verdict: IdeaStudy['verdict'] = i === 0 ? 'best' : i === rows.length - 1 && rows.length > 1 ? 'weakest' : 'second';
    const others = rows.filter((o) => o !== r);
    const why: string[] = [];
    const leads = IDEA_CRITERIA.filter((c) => others.length > 0 && others.every((o) => r.scores[c.key] > o.scores[c.key]))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 2);
    for (const c of leads) why.push(`Best of the ${rows.length} on ${c.label.toLowerCase()}.`);
    const lags = IDEA_CRITERIA.filter((c) => others.length > 0 && others.every((o) => r.scores[c.key] < o.scores[c.key]))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 2);
    for (const c of lags) why.push(`Weakest of the ${rows.length} on ${c.label.toLowerCase()}.`);
    if (r.leftover !== null && r.leftover < 0) why.push('Costs more than the group has now: it needs more savings or a loan.');
    else if (r.leftover !== null && r.leftover < r.v.startupCents * 0.15) why.push('Uses nearly all the group’s money, leaving little for surprises.');
    if (r.payback === null) why.push('At these numbers it does not earn its money back. Check prices before choosing it.');
    if (why.length === 0) why.push('Middle of the group on most points.');
    return {
      venture: r.v,
      profile: r.p,
      monthlySalesCents: r.sales,
      monthlyProfitCents: r.profit,
      paybackMonths: r.payback,
      leftoverCents: r.leftover,
      scores: r.scores,
      total: r.total,
      rank: i + 1,
      verdict,
      why,
    };
  });

  const close = studies.length > 1 && studies[0]!.total - studies[1]!.total <= 4;
  const summary =
    studies.length === 0
      ? 'Save ideas from the list to compare them.'
      : studies.length === 1
        ? `${studies[0]!.venture.title} scores ${studies[0]!.total} of 100. Save one or two more ideas to compare.`
        : close
          ? `${studies[0]!.venture.title} and ${studies[1]!.venture.title} are very close (${studies[0]!.total} and ${studies[1]!.total} of 100). Let the group’s skills, the location and what you saw on the ground decide.`
          : `${studies[0]!.venture.title} looks most favourable (${studies[0]!.total} of 100), then ${studies[1]!.venture.title} (${studies[1]!.total}).` +
            (studies.length > 2 ? ` ${studies[2]!.venture.title} is the weakest of the three (${studies[2]!.total}).` : '');
  return { studies, close, summary };
}

/** Questions every group should answer before it decides (all ideas). */
export const BEFORE_YOU_DECIDE = [
  'Who in the group will run it every day, and how will they be paid?',
  'Have at least two members visited three businesses like it and asked about real sales?',
  'How much money stays in the group for three months of running costs and surprises?',
  'Where will it be, and how many similar businesses are within walking distance?',
  'What will the group do if it makes a loss for three months in a row?',
  'Who keeps the books (Stawi Business) and who checks them each month?',
];

const INDUSTRY_SET: ReadonlySet<string> = new Set<Industry>(['agri', 'retail', 'services', 'manufacturing', 'digital', 'transport']);
const RISK_SET: ReadonlySet<string> = new Set(['Low', 'Moderate', 'Higher']);

/** One idea in a link: title|startupCents|marginPct|risk|industry. */
export function ideaToParam(v: Venture): string {
  return [v.title, v.startupCents, v.marginPct, v.risk, v.industry].join('|');
}

/**
 * Pure: read ideas back from a shared link. Only catalogue titles with sane
 * numbers come back (at most three, no repeats), so a tampered link cannot
 * break the page or inject text.
 */
export function ideasFromParams(params: string[]): Venture[] {
  const out: Venture[] = [];
  for (const raw of params.slice(0, 6)) {
    if (out.length >= 3) break;
    const [title = '', startup = '', margin = '', risk = '', industry = ''] = String(raw).split('|');
    const p = profileFor(title);
    const s = Number(startup);
    const m = Number(margin);
    if (!p || !Number.isSafeInteger(s) || s <= 0 || s > 1_000_000_000_00) continue;
    if (!Number.isFinite(m) || m <= 0 || m >= 100) continue;
    if (!RISK_SET.has(risk) || !INDUSTRY_SET.has(industry)) continue;
    if (out.some((o) => o.title === title)) continue;
    out.push({ title, description: '', startupCents: s, marginPct: m, risk: risk as Venture['risk'], industry: industry as Industry });
  }
  return out;
}

export interface BestFit {
  venture: Venture;
  /** Stawi's 8-point score, 0–100. */
  total: number;
  /** Its two strongest points, in plain words. */
  strengths: string[];
}

const ALL_INDUSTRIES: Industry[] = ['agri', 'retail', 'services', 'manufacturing', 'digital', 'transport'];

/**
 * "Find our best fits" (owner 28/11/26): every idea in every industry, sized
 * to the group's money, scored on the same eight points, best first. At most
 * two from one industry, so the group sees real choices.
 */
export function bestFits(capitalCents: number, opts: { count?: number; seed?: number } = {}): BestFit[] {
  if (!(capitalCents > 0)) return [];
  const count = opts.count ?? 4;
  const seed = opts.seed ?? 1;
  const scored: BestFit[] = [];
  for (const industry of ALL_INDUSTRIES) {
    for (const v of generateVentures({ industry, capitalCents, count: 10, seed })) {
      const p = profileFor(v.title);
      if (!p) continue;
      const r = study(v, p, capitalCents);
      // Every drawn idea is sized to fit the money, so that point tells members nothing here.
      const strengths = IDEA_CRITERIA.filter((c) => c.key !== 'capital')
        .sort((a, b) => r.scores[b.key] * b.weight - r.scores[a.key] * a.weight)
        .slice(0, 2)
        .map((c) => c.label.toLowerCase());
      scored.push({ venture: v, total: r.total, strengths });
    }
  }
  scored.sort((a, b) => b.total - a.total || a.venture.title.localeCompare(b.venture.title));
  const out: BestFit[] = [];
  const per = new Map<Industry, number>();
  for (const f of scored) {
    if (out.length >= count) break;
    const n = per.get(f.venture.industry) ?? 0;
    if (n >= 2) continue;
    per.set(f.venture.industry, n + 1);
    out.push(f);
  }
  return out;
}
