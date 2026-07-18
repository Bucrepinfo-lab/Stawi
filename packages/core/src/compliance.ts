/**
 * Global compliance registry — per-country profiles for a worldwide SaaS launch.
 *
 * Each profile carries the currency, an INDICATIVE consumption-tax rate, the tax
 * authority, the business/cooperative registrar, the data-protection regime, and
 * official links. Rates and bodies change — treat values as configurable defaults
 * to be VERIFIED against current local law before relying on them (the
 * legal-agent / research-agent keep them fresh). Nothing here is legal advice.
 */

export type CountryCode =
  | 'KE' | 'NG' | 'ZA' | 'GH' | 'US' | 'GB' | 'DE'
  | 'IN' | 'AU' | 'CA' | 'AE' | 'BR';

export interface CountryProfile {
  code: CountryCode;
  name: string;
  region: 'Africa' | 'Europe' | 'North America' | 'Asia' | 'Oceania' | 'South America' | 'Middle East';
  currency: string;       // ISO 4217
  locale: string;         // for Intl formatting
  flag: string;
  /** Indicative VAT/GST/sales-tax rate (verify locally). */
  consumptionTaxRate: number;
  consumptionTaxName: string;
  taxAuthority: string;
  /** Body that registers cooperatives / self-help groups / companies. */
  registrar: string;
  dataProtection: string; // governing privacy law
  dataProtectionAuthority: string;
  links: { label: string; url: string }[];
}

export const COUNTRIES: Record<CountryCode, CountryProfile> = {
  KE: { code: 'KE', name: 'Kenya', region: 'Africa', currency: 'KES', locale: 'en-KE', flag: '🇰🇪', consumptionTaxRate: 0.16, consumptionTaxName: 'VAT', taxAuthority: 'Kenya Revenue Authority (KRA)', registrar: 'Dept. of Social Protection / Commissioner for Cooperatives', dataProtection: 'Data Protection Act, 2019', dataProtectionAuthority: 'Office of the Data Protection Commissioner (ODPC)', links: [{ label: 'KRA iTax', url: 'https://itax.kra.go.ke' }, { label: 'ODPC', url: 'https://www.odpc.go.ke' }] },
  NG: { code: 'NG', name: 'Nigeria', region: 'Africa', currency: 'NGN', locale: 'en-NG', flag: '🇳🇬', consumptionTaxRate: 0.075, consumptionTaxName: 'VAT', taxAuthority: 'Federal Inland Revenue Service (FIRS)', registrar: 'Corporate Affairs Commission (CAC)', dataProtection: 'Nigeria Data Protection Act, 2023', dataProtectionAuthority: 'Nigeria Data Protection Commission (NDPC)', links: [{ label: 'FIRS', url: 'https://www.firs.gov.ng' }, { label: 'NDPC', url: 'https://ndpc.gov.ng' }] },
  ZA: { code: 'ZA', name: 'South Africa', region: 'Africa', currency: 'ZAR', locale: 'en-ZA', flag: '🇿🇦', consumptionTaxRate: 0.15, consumptionTaxName: 'VAT', taxAuthority: 'South African Revenue Service (SARS)', registrar: 'CIPC', dataProtection: 'POPIA', dataProtectionAuthority: 'Information Regulator', links: [{ label: 'SARS', url: 'https://www.sars.gov.za' }] },
  GH: { code: 'GH', name: 'Ghana', region: 'Africa', currency: 'GHS', locale: 'en-GH', flag: '🇬🇭', consumptionTaxRate: 0.15, consumptionTaxName: 'VAT', taxAuthority: 'Ghana Revenue Authority (GRA)', registrar: 'Registrar-General / Dept. of Cooperatives', dataProtection: 'Data Protection Act, 2012', dataProtectionAuthority: 'Data Protection Commission', links: [{ label: 'GRA', url: 'https://gra.gov.gh' }] },
  US: { code: 'US', name: 'United States', region: 'North America', currency: 'USD', locale: 'en-US', flag: '🇺🇸', consumptionTaxRate: 0.0, consumptionTaxName: 'Sales tax (varies by state)', taxAuthority: 'IRS (federal) + state revenue depts', registrar: 'Secretary of State (per state)', dataProtection: 'CCPA/CPRA (CA) + state laws', dataProtectionAuthority: 'FTC / state AGs / CPPA', links: [{ label: 'IRS', url: 'https://www.irs.gov' }] },
  GB: { code: 'GB', name: 'United Kingdom', region: 'Europe', currency: 'GBP', locale: 'en-GB', flag: '🇬🇧', consumptionTaxRate: 0.20, consumptionTaxName: 'VAT', taxAuthority: 'HM Revenue & Customs (HMRC)', registrar: 'Companies House / FCA (mutuals)', dataProtection: 'UK GDPR + DPA 2018', dataProtectionAuthority: "Information Commissioner's Office (ICO)", links: [{ label: 'HMRC', url: 'https://www.gov.uk/hmrc' }, { label: 'ICO', url: 'https://ico.org.uk' }] },
  DE: { code: 'DE', name: 'Germany', region: 'Europe', currency: 'EUR', locale: 'de-DE', flag: '🇩🇪', consumptionTaxRate: 0.19, consumptionTaxName: 'USt (VAT)', taxAuthority: 'Bundeszentralamt für Steuern', registrar: 'Handelsregister / Genossenschaftsregister', dataProtection: 'EU GDPR + BDSG', dataProtectionAuthority: 'BfDI / Landes-DPAs', links: [{ label: 'GDPR', url: 'https://gdpr.eu' }] },
  IN: { code: 'IN', name: 'India', region: 'Asia', currency: 'INR', locale: 'en-IN', flag: '🇮🇳', consumptionTaxRate: 0.18, consumptionTaxName: 'GST', taxAuthority: 'Central Board of Indirect Taxes & Customs', registrar: 'Registrar of Cooperative Societies / MCA', dataProtection: 'DPDP Act, 2023', dataProtectionAuthority: 'Data Protection Board of India', links: [{ label: 'GST', url: 'https://www.gst.gov.in' }] },
  AU: { code: 'AU', name: 'Australia', region: 'Oceania', currency: 'AUD', locale: 'en-AU', flag: '🇦🇺', consumptionTaxRate: 0.10, consumptionTaxName: 'GST', taxAuthority: 'Australian Taxation Office (ATO)', registrar: 'ASIC', dataProtection: 'Privacy Act 1988', dataProtectionAuthority: 'OAIC', links: [{ label: 'ATO', url: 'https://www.ato.gov.au' }] },
  CA: { code: 'CA', name: 'Canada', region: 'North America', currency: 'CAD', locale: 'en-CA', flag: '🇨🇦', consumptionTaxRate: 0.05, consumptionTaxName: 'GST/HST', taxAuthority: 'Canada Revenue Agency (CRA)', registrar: 'Corporations Canada / provincial registrars', dataProtection: 'PIPEDA', dataProtectionAuthority: 'OPC', links: [{ label: 'CRA', url: 'https://www.canada.ca/en/revenue-agency.html' }] },
  AE: { code: 'AE', name: 'United Arab Emirates', region: 'Middle East', currency: 'AED', locale: 'en-AE', flag: '🇦🇪', consumptionTaxRate: 0.05, consumptionTaxName: 'VAT', taxAuthority: 'Federal Tax Authority (FTA)', registrar: 'Dept. of Economic Development', dataProtection: 'Federal Decree-Law No. 45 of 2021 (PDPL)', dataProtectionAuthority: 'UAE Data Office', links: [{ label: 'FTA', url: 'https://tax.gov.ae' }] },
  BR: { code: 'BR', name: 'Brazil', region: 'South America', currency: 'BRL', locale: 'pt-BR', flag: '🇧🇷', consumptionTaxRate: 0.17, consumptionTaxName: 'ICMS (varies)', taxAuthority: 'Receita Federal', registrar: 'Junta Comercial / OCB (cooperatives)', dataProtection: 'LGPD', dataProtectionAuthority: 'ANPD', links: [{ label: 'Receita', url: 'https://www.gov.br/receitafederal' }] },
};

export const SUPPORTED_COUNTRIES = Object.values(COUNTRIES);

export function getCountryProfile(code: string): CountryProfile {
  return COUNTRIES[(code as CountryCode)] ?? COUNTRIES.KE;
}

/** Format minor units (cents) in a country's currency. */
export function formatCurrencyFor(cents: number, code: string): string {
  const p = getCountryProfile(code);
  try {
    return new Intl.NumberFormat(p.locale, { style: 'currency', currency: p.currency, maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `${p.currency} ${(cents / 100).toLocaleString()}`;
  }
}

/** Indicative consumption tax (VAT/GST) on a gross amount for a country. */
export function indicativeConsumptionTax(grossCents: number, code: string): number {
  const r = getCountryProfile(code).consumptionTaxRate;
  if (r <= 0) return 0;
  return Math.round((grossCents * r) / (1 + r));
}
