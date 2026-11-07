import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { clearDeviceCookie, currentDevice, pinFeatureEnabled, sessionPassword } from '@/lib/pin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/devices/revoke { all?: true, deviceId?: string }
 * Signed-in user only, own devices only. `all` = sign out of all devices:
 * revokes every trusted device, rotates the server-held session secret and
 * ends every Supabase session. Next sign-in anywhere needs a new SMS code.
 */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  let body: { all?: boolean; deviceId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body = all */
  }
  const all = body.all !== false && !body.deviceId;

  if (pinFeatureEnabled()) {
    const { prisma, revokeTrustedDevices } = await import('@stawi/db');
    const here = await currentDevice();
    const epoch = await revokeTrustedDevices(prisma, userId, all ? undefined : body.deviceId);
    if (epoch !== null) {
      const admin = createSupabaseAdminClient();
      await admin?.auth.admin.updateUserById(userId, { password: sessionPassword(userId, epoch) }).catch(() => undefined);
    }
    if (all || (here && here.id === body.deviceId)) await clearDeviceCookie();
  }
  if (all) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: 'global' });
  }
  return NextResponse.json({ ok: true, signedOut: all });
}
