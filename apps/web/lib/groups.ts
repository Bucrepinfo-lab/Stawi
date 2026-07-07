/**
 * The groups the signed-in member belongs to.
 *
 * A member can be registered in more than one chama/SACCO/business and may hold
 * a different role in each. In production this is loaded from @stawi/db, keyed by
 * the Clerk user id, and each group maps to a Clerk Organization. Seed data here
 * keeps the prototype self-contained.
 */

import type { MemberContribution } from '@stawi/core';

export interface SeedMember extends MemberContribution {
  role: string;
  paid: boolean;
}

export interface GroupAccount {
  id: string;
  name: string;
  /** The signed-in member's role in THIS group. */
  myRole: string;
  flag: string;
  type: 'Chama' | 'SACCO' | 'Business';
  members: SeedMember[];
}

export const MY_GROUPS: GroupAccount[] = [
  {
    id: 'umoja',
    name: 'Umoja Women Group',
    myRole: 'Treasurer',
    flag: '🇰🇪',
    type: 'Chama',
    members: [
      { memberId: 'a', name: 'Amina Wanjiru', role: 'Treasurer', totalCents: 4_200_000, paid: true },
      { memberId: 'b', name: 'Joseph Kamau', role: 'Chairman', totalCents: 3_800_000, paid: true },
      { memberId: 'c', name: 'Grace Otieno', role: 'Secretary', totalCents: 3_100_000, paid: true },
      { memberId: 'd', name: 'David Mwangi', role: 'Member', totalCents: 2_400_000, paid: false },
      { memberId: 'e', name: 'Faith Njeri', role: 'Member', totalCents: 1_900_000, paid: true },
      { memberId: 'f', name: 'Brian Ouma', role: 'Member', totalCents: 1_400_000, paid: false },
    ],
  },
  {
    id: 'vijana',
    name: 'Vijana Investment SACCO',
    myRole: 'Signatory',
    flag: '🇰🇪',
    type: 'SACCO',
    members: [
      { memberId: 'a', name: 'Amina Wanjiru', role: 'Signatory', totalCents: 6_500_000, paid: true },
      { memberId: 'g', name: 'Peter Mutua', role: 'Chairman', totalCents: 9_200_000, paid: true },
      { memberId: 'h', name: 'Lucy Achieng', role: 'Treasurer', totalCents: 7_800_000, paid: true },
      { memberId: 'i', name: 'Samuel Kiprono', role: 'Member', totalCents: 4_100_000, paid: false },
    ],
  },
  {
    id: 'mboga',
    name: 'Mama Mboga Hub',
    myRole: 'Member',
    flag: '🇰🇪',
    type: 'Business',
    members: [
      { memberId: 'a', name: 'Amina Wanjiru', role: 'Member', totalCents: 1_200_000, paid: true },
      { memberId: 'j', name: 'Esther Wairimu', role: 'Chairman', totalCents: 2_600_000, paid: true },
      { memberId: 'k', name: 'Daniel Otieno', role: 'Treasurer', totalCents: 2_100_000, paid: true },
    ],
  },
];
