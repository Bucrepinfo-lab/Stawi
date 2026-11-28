import type { Metadata } from 'next';
import { Landing } from './Landing';
import { saccoPlusEnabled } from '@/lib/features';
import { daysLeft, foundingUntil } from '@stawi/core';

export const metadata: Metadata = { alternates: { canonical: '/' } };

// Read the SACCO_PLUS_ENABLED flag per request (runtime env), not at build.
export const dynamic = 'force-dynamic';

export default function Home() {
  // Days left to join at the founding price (null when no closing date is set).
  const foundingDays = daysLeft(foundingUntil(process.env));
  return <Landing saccoPlus={saccoPlusEnabled()} foundingDays={foundingDays} />;
}
