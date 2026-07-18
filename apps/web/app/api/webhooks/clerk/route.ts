import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { dbEnabled } from '@/lib/data';

export const runtime = 'nodejs';

/**
 * POST /api/webhooks/clerk — keeps Stawi's tenant data in sync with Clerk.
 * Public route (Clerk is the caller). Verifies the svix signature manually
 * (HMAC-SHA256, no svix SDK), then upserts Tenants/TenantMembers from
 * organization & membership events. Ready the moment CLERK_WEBHOOK_SECRET is set.
 *
 * Mapping: Clerk Organization → Tenant · Org membership → TenantMember.
 */
function verifySvix(secret: string, headers: Headers, payload: string): boolean {
  const id = headers.get('svix-id');
  const ts = headers.get('svix-timestamp');
  const sigHeader = headers.get('svix-signature');
  if (!id || !ts || !sigHeader) return false;
  // Secret is base64 after the "whsec_" prefix.
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = crypto.createHmac('sha256', key).update(`${id}.${ts}.${payload}`).digest('base64');
  // Header is space-separated "v1,<sig>" pairs.
  return sigHeader.split(' ').some((p) => {
    const sig = p.split(',')[1];
    return sig && sig.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  });
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  const payload = await req.text();

  if (secret && !verifySvix(secret, req.headers, payload)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let evt: { type?: string; data?: any };
  try { evt = JSON.parse(payload); } catch { return NextResponse.json({ received: true }); }

  if (!dbEnabled()) {
    console.info('[clerk] event', evt.type, '(no DB — skipped)');
    return NextResponse.json({ received: true });
  }

  const db = await import('@stawi/db');
  const d = evt.data ?? {};
  try {
    switch (evt.type) {
      case 'organization.created':
      case 'organization.updated':
        await db.upsertTenantFromClerkOrg(db.prisma, {
          clerkOrgId: d.id,
          name: d.name ?? 'Tenant',
          createdByUserId: d.created_by,
        });
        break;
      case 'organization.deleted':
        await db.removeTenantByClerkOrg(db.prisma, d.id);
        break;
      case 'organizationMembership.created':
      case 'organizationMembership.updated':
        await db.upsertTenantMemberFromClerk(db.prisma, {
          clerkOrgId: d.organization?.id,
          clerkUserId: d.public_user_data?.user_id,
          role: d.role,
        });
        break;
      case 'organizationMembership.deleted':
        await db.removeTenantMemberFromClerk(db.prisma, {
          clerkOrgId: d.organization?.id,
          clerkUserId: d.public_user_data?.user_id,
        });
        break;
      case 'user.created':
      case 'user.updated': {
        // Phone-first identity: link roster rows to this user by matching phone.
        const phones: string[] = Array.isArray(d.phone_numbers)
          ? d.phone_numbers.map((p: any) => p?.phone_number).filter(Boolean)
          : [];
        if (d.id && phones.length) await db.linkMembershipsByPhone(db.prisma, d.id, phones);
        break;
      }
      case 'user.deleted':
        await db.removeUserData(db.prisma, d.id);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error('[clerk] sync error', evt.type, err);
    // Acknowledge so Clerk doesn't hammer retries on a transient DB error.
  }

  return NextResponse.json({ received: true });
}
