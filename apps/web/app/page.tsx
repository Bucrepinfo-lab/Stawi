import { Landing } from './Landing';
import { saccoPlusEnabled } from '@/lib/features';

// Read the SACCO_PLUS_ENABLED flag per request (runtime env), not at build.
export const dynamic = 'force-dynamic';

export default function Home() {
  return <Landing saccoPlus={saccoPlusEnabled()} />;
}
