/**
 * Phone-first identity — the join key for the whole platform.
 *
 * Many members have no email. The phone number they are registered with in a
 * group's charter roster IS their identity. When a person downloads the app and
 * signs up with that same number, they are automatically linked to every group
 * whose roster contains it — with the role their designation implies.
 *
 * Matching is tolerant of how numbers are written (0712…, 254712…, +254 712…):
 * we compare the trailing national digits (the "phone key"), so the same person
 * matches regardless of formatting. Pure and deterministic.
 */

import { isOfficial, type OfficialDesignation } from './charter';

/** Normalise to full international digits where possible (e.g. 0712… → 254712…). */
export function normalizePhone(raw: string, countryCode = 'KE'): string {
  const digits = (raw || '').replace(/[^\d+]/g, '');
  const dialByCountry: Record<string, string> = { KE: '254', UG: '256', TZ: '255', RW: '250', NG: '234', GH: '233', ZA: '27' };
  const dial = dialByCountry[countryCode] ?? '';
  let d = digits.replace(/^\+/, '');
  if (d.startsWith('0') && dial) d = dial + d.slice(1);
  return d;
}

/**
 * The stable comparison key: the last 9 significant digits.
 * 0712345678, 254712345678 and +254712345678 all key to "712345678".
 */
export function phoneKey(raw: string): string {
  const d = (raw || '').replace(/\D/g, '').replace(/^0+/, '');
  return d.slice(-9);
}

/** Do two phone numbers belong to the same line, whatever their format? */
export function phoneMatches(a: string, b: string): boolean {
  const ka = phoneKey(a);
  const kb = phoneKey(b);
  return ka.length >= 8 && ka === kb;
}

export interface DirectoryMember {
  name: string;
  phone: string;
  designation?: OfficialDesignation;
}

export interface GroupDirectory {
  groupId: string;
  groupName: string;
  members: DirectoryMember[];
}

export interface MemberGroupLink {
  groupId: string;
  groupName: string;
  /** How the member appears on that group's roster. */
  memberName: string;
  designation?: OfficialDesignation;
  isOfficial: boolean;
}

/**
 * Every group the given phone number participates in, resolved from rosters.
 * This is what the app calls right after a phone sign-in to populate "my groups".
 */
export function findMemberGroups(phone: string, directories: GroupDirectory[]): MemberGroupLink[] {
  const links: MemberGroupLink[] = [];
  for (const dir of directories) {
    const hit = dir.members.find((m) => phoneMatches(m.phone, phone));
    if (hit) {
      links.push({
        groupId: dir.groupId,
        groupName: dir.groupName,
        memberName: hit.name,
        designation: hit.designation,
        isOfficial: hit.designation ? isOfficial(hit.designation) : false,
      });
    }
  }
  return links;
}

/** Highest-privilege role implied by a person's memberships across all groups. */
export function viewerRoleFromLinks(links: MemberGroupLink[]): 'MEMBER' | 'OFFICIAL' {
  return links.some((l) => l.isOfficial) ? 'OFFICIAL' : 'MEMBER';
}

/** Is this phone an official in this specific group? (Drives edit rights.) */
export function isOfficialInGroup(phone: string, dir: GroupDirectory): boolean {
  const hit = dir.members.find((m) => phoneMatches(m.phone, phone));
  return !!hit?.designation && isOfficial(hit.designation);
}

// ── Per-country phone rules (customisable input limits) ───────────────────

export interface PhoneRule {
  countryCode: string;
  /** International dialling code, e.g. '254'. */
  dial: string;
  /** Flag emoji for the picker. */
  flag: string;
  /** Digits in the national number AFTER the dial code (e.g. Kenya: 9 → 712345678). */
  nationalDigits: number;
  /** Max digits to allow in the local input (national + optional leading 0). */
  localMaxDigits: number;
  /** A placeholder in local form. */
  placeholder: string;
}

/** Editable registry — extend per market. Kenya is the default. */
export const PHONE_RULES: Record<string, PhoneRule> = {
  KE: { countryCode: 'KE', dial: '254', flag: '🇰🇪', nationalDigits: 9, localMaxDigits: 10, placeholder: '0712 345 678' },
  UG: { countryCode: 'UG', dial: '256', flag: '🇺🇬', nationalDigits: 9, localMaxDigits: 10, placeholder: '0712 345 678' },
  TZ: { countryCode: 'TZ', dial: '255', flag: '🇹🇿', nationalDigits: 9, localMaxDigits: 10, placeholder: '0712 345 678' },
  RW: { countryCode: 'RW', dial: '250', flag: '🇷🇼', nationalDigits: 9, localMaxDigits: 10, placeholder: '0712 345 678' },
  NG: { countryCode: 'NG', dial: '234', flag: '🇳🇬', nationalDigits: 10, localMaxDigits: 11, placeholder: '0801 234 5678' },
  GH: { countryCode: 'GH', dial: '233', flag: '🇬🇭', nationalDigits: 9, localMaxDigits: 10, placeholder: '024 123 4567' },
  ZA: { countryCode: 'ZA', dial: '27', flag: '🇿🇦', nationalDigits: 9, localMaxDigits: 10, placeholder: '071 234 5678' },
};

export function phoneRule(countryCode = 'KE'): PhoneRule {
  return PHONE_RULES[countryCode] ?? PHONE_RULES.KE!;
}

/** The national significant digits for a number in a given country (dial + leading 0 stripped). */
export function nationalDigits(raw: string, countryCode = 'KE'): string {
  const rule = phoneRule(countryCode);
  let d = (raw || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith(rule.dial)) d = d.slice(rule.dial.length);
  return d.replace(/^0+/, '');
}

/** Does a typed number have the expected national digit count for its country? */
export function isValidPhoneLength(raw: string, countryCode = 'KE'): boolean {
  return nationalDigits(raw, countryCode).length === phoneRule(countryCode).nationalDigits;
}
