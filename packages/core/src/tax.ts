/**
 * Kenya tax & levy engine — Pillar 3.
 *
 * Rates current as of 2026 (see PRD §6). Stored as a configurable rule pack so
 * other countries plug in later. All amounts in minor units (cents).
 *
 * Sources: KRA (VAT 16%, PAYE bands), Tourism Fund (2% levy), Standards Levy.
 */

export type CountryCode = 'KE';

export interface TaxLine {
  code: string;
  label: string;
  amountCents: number;
  /** Remittance body + due date hint for the UI. */
  remitTo: string;
  dueBy: string;
  link: string;
}

export interface BusinessTaxInput {
  country: CountryCode;
  /** Gross sales for the period, minor units. */
  grossSalesCents: number;
  /** Is the business VAT-registered (turnover >= KES 5M/yr)? */
  vatRegistered: boolean;
  /** Does the business fall under the Tourism Act (hotel/restaurant/catering)? */
  tourismSector: boolean;
  /** Monthly manufacturing turnover, if a manufacturer (for Standards Levy). */
  manufacturingTurnoverCents?: number;
}

const KE_VAT_RATE = 0.16;
const KE_TOURISM_LEVY_RATE = 0.02;
const KE_STANDARDS_LEVY_RATE = 0.002;
const KE_STANDARDS_LEVY_EXEMPT_BELOW_CENTS = 5_000_000 * 100; // KES 5M/yr
const KE_STANDARDS_LEVY_CAP_CENTS = 4_000_000 * 100; // KES 4M/yr cap

/**
 * VAT is charged on the taxable supply. If a gross (VAT-inclusive) figure is
 * given, the VAT portion is grossSales × rate / (1 + rate).
 */
export function vatFromGross(grossCents: number, rate = KE_VAT_RATE): number {
  return Math.round((grossCents * rate) / (1 + rate));
}

export interface PayeBand {
  upToCents: number | null; // null = no upper bound
  rate: number;
}

/** KRA monthly PAYE bands (2026), in minor units. */
export const KE_PAYE_BANDS: PayeBand[] = [
  { upToCents: 24_000 * 100, rate: 0.1 },
  { upToCents: 32_333 * 100, rate: 0.25 },
  { upToCents: 500_000 * 100, rate: 0.3 },
  { upToCents: 800_000 * 100, rate: 0.325 },
  { upToCents: null, rate: 0.35 },
];

/**
 * Progressive PAYE on a monthly gross salary (before personal relief).
 * Returns tax in minor units. Personal relief is applied separately by caller
 * if desired (KES 2,400/month).
 */
export function computePaye(monthlyGrossCents: number): number {
  let remaining = monthlyGrossCents;
  let prevCap = 0;
  let tax = 0;
  for (const band of KE_PAYE_BANDS) {
    if (remaining <= 0) break;
    const cap = band.upToCents ?? Infinity;
    const bandWidth = cap - prevCap;
    const taxable = Math.min(remaining, bandWidth);
    tax += taxable * band.rate;
    remaining -= taxable;
    prevCap = cap;
  }
  return Math.round(tax);
}

/** Compute all applicable business taxes/levies for a period. */
export function computeBusinessTaxes(input: BusinessTaxInput): TaxLine[] {
  const lines: TaxLine[] = [];

  if (input.vatRegistered) {
    lines.push({
      code: 'VAT',
      label: 'VAT (16%)',
      amountCents: vatFromGross(input.grossSalesCents),
      remitTo: 'KRA · iTax / eTIMS',
      dueBy: '20th of following month',
      link: 'https://itax.kra.go.ke',
    });
  }

  if (input.tourismSector) {
    lines.push({
      code: 'TOURISM_LEVY',
      label: 'Tourism / Catering Levy (2%)',
      amountCents: Math.round(input.grossSalesCents * KE_TOURISM_LEVY_RATE),
      remitTo: 'Tourism Fund',
      dueBy: '10th of following month',
      link: 'https://www.tourismfund.go.ke/levy/',
    });
  }

  if (
    input.manufacturingTurnoverCents != null &&
    input.manufacturingTurnoverCents >= KE_STANDARDS_LEVY_EXEMPT_BELOW_CENTS
  ) {
    const raw = Math.round(
      input.manufacturingTurnoverCents * KE_STANDARDS_LEVY_RATE,
    );
    lines.push({
      code: 'STANDARDS_LEVY',
      label: 'Standards Levy (0.2%)',
      amountCents: Math.min(raw, KE_STANDARDS_LEVY_CAP_CENTS),
      remitTo: 'KEBS',
      dueBy: '20th of following month',
      link: 'https://www.kebs.org',
    });
  }

  return lines;
}

/** Subscription price: 10 currency units/month, first month free. */
export function subscriptionDueCents(
  monthsActive: number,
  unitPriceCents = 10 * 100,
): number {
  if (monthsActive <= 1) return 0; // first month free
  return unitPriceCents;
}
