/**
 * Capital-to-business matching engine — Pillar 2.
 *
 * Generates business ventures that fit a given capital band + industry. The
 * generator is seedable so results are reproducible in tests while still
 * feeling "random" (re-roll) in the UI. A live build can swap this deterministic
 * generator for an LLM call behind the same interface.
 */

export type Industry =
  | 'agri'
  | 'retail'
  | 'services'
  | 'manufacturing'
  | 'digital'
  | 'transport';

export interface Venture {
  title: string;
  description: string;
  /** Estimated startup capital, minor units. */
  startupCents: number;
  marginPct: number;
  risk: 'Low' | 'Moderate' | 'Higher';
  industry: Industry;
}

interface Template {
  title: string;
  description: string;
  baseRatio: [number, number]; // fraction of available capital range
  margin: [number, number];
  risk: Venture['risk'];
}

const CATALOG: Record<Industry, Template[]> = {
  agri: [
    { title: 'Cold-press peanut butter', description: 'Sells to shops, schools & estates; low spoilage.', baseRatio: [0.6, 0.85], margin: [28, 38], risk: 'Low' },
    { title: 'Egg supply route', description: 'Daily demand from kiosks and eateries.', baseRatio: [0.5, 0.8], margin: [15, 22], risk: 'Low' },
    { title: 'Hydroponic kale unit', description: 'Fast cycle, premium price, small footprint.', baseRatio: [0.55, 0.9], margin: [25, 40], risk: 'Moderate' },
    { title: 'Banana crisps line', description: 'Long shelf life, growing snack market.', baseRatio: [0.4, 0.7], margin: [30, 45], risk: 'Moderate' },
  ],
  retail: [
    { title: 'Mini-mart kiosk', description: 'Daily cash flow, steady footfall.', baseRatio: [0.6, 0.95], margin: [10, 18], risk: 'Low' },
    { title: 'Cosmetics & beauty stall', description: 'High margin, trend-driven repeat buyers.', baseRatio: [0.4, 0.7], margin: [25, 45], risk: 'Moderate' },
    { title: 'Mitumba (clothes bale)', description: 'Proven second-hand clothing demand.', baseRatio: [0.5, 0.8], margin: [30, 60], risk: 'Moderate' },
  ],
  services: [
    { title: 'Laundry & dry-clean', description: 'Recurring customers, low inventory.', baseRatio: [0.5, 0.85], margin: [35, 55], risk: 'Low' },
    { title: 'Car wash bay', description: 'Weekend peaks, strong cash flow.', baseRatio: [0.6, 0.9], margin: [40, 60], risk: 'Moderate' },
    { title: 'Cyber & M-Pesa agent', description: 'Commission income plus footfall.', baseRatio: [0.4, 0.7], margin: [20, 35], risk: 'Low' },
  ],
  manufacturing: [
    { title: 'Liquid soap & detergent', description: 'Low input cost, B2B and retail sales.', baseRatio: [0.4, 0.7], margin: [30, 50], risk: 'Low' },
    { title: 'Bread & bakery', description: 'Daily essential, fast turnover.', baseRatio: [0.6, 0.95], margin: [12, 22], risk: 'Moderate' },
    { title: 'Briquette making', description: 'Eco-fuel demand from schools & homes.', baseRatio: [0.45, 0.75], margin: [25, 40], risk: 'Moderate' },
  ],
  digital: [
    { title: 'Digital printing & design', description: 'Skill-based, scalable, asset-light.', baseRatio: [0.5, 0.85], margin: [40, 65], risk: 'Moderate' },
    { title: 'Online thrift store', description: 'Nationwide reach, low overhead.', baseRatio: [0.3, 0.6], margin: [30, 55], risk: 'Moderate' },
    { title: 'Phone repair lab', description: 'High demand, recurring customers.', baseRatio: [0.4, 0.7], margin: [35, 55], risk: 'Low' },
  ],
  transport: [
    { title: 'Boda boda fleet', description: 'Daily takings, asset-backed.', baseRatio: [0.7, 0.95], margin: [20, 35], risk: 'Moderate' },
    { title: 'Tuk-tuk delivery', description: 'Last-mile demand in towns.', baseRatio: [0.6, 0.9], margin: [25, 40], risk: 'Moderate' },
    { title: 'Cargo pickup hire', description: 'Contract-based, steady income.', baseRatio: [0.8, 1.0], margin: [22, 38], risk: 'Higher' },
  ],
};

/** Mulberry32 — tiny deterministic PRNG so re-rolls are reproducible in tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MatchOptions {
  industry: Industry;
  /** Capital available, minor units. */
  capitalCents: number;
  count?: number;
  seed?: number;
}

/**
 * Generate `count` ventures that fit within the available capital.
 * Startup cost is scaled to a fraction of available capital so every result is
 * affordable. Deterministic given a seed (drives the "reset / re-roll" button).
 */
export function generateVentures(opts: MatchOptions): Venture[] {
  const { industry, capitalCents, count = 4 } = opts;
  if (capitalCents <= 0) throw new Error('Capital must be positive');
  const rng = mulberry32(opts.seed ?? (Date.now() & 0xffffffff));
  const templates = [...CATALOG[industry]];

  // Shuffle templates (Fisher–Yates with the seeded rng).
  for (let i = templates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [templates[i], templates[j]] = [templates[j]!, templates[i]!];
  }

  const picks = templates.slice(0, Math.min(count, templates.length));
  return picks.map((t) => {
    const ratio = t.baseRatio[0] + rng() * (t.baseRatio[1] - t.baseRatio[0]);
    const startup = Math.round((capitalCents * ratio) / 1000) * 1000;
    const margin = Math.round(t.margin[0] + rng() * (t.margin[1] - t.margin[0]));
    return {
      title: t.title,
      description: t.description,
      startupCents: Math.min(startup, capitalCents),
      marginPct: margin,
      risk: t.risk,
      industry,
    };
  });
}

/** Enforce the "save at least 3 to compare" shortlist (max 3). */
export function canAddToShortlist(current: Venture[]): boolean {
  return current.length < 3;
}
