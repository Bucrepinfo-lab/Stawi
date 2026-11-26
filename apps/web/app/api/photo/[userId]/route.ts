import { getUserId } from '@/lib/auth';
import { dbEnabled } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A member's photo (owner 26/11/26). Seen by the person themselves and by
 * people who share a group with them; nobody else. Cached privately; the ?v=
 * token changes when the photo changes.
 */
export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  if (!dbEnabled()) return new Response('Not found', { status: 404 });
  const viewer = await getUserId();
  if (!viewer) return new Response('Unauthorized', { status: 401 });
  const { userId } = await params;
  const { prisma } = await import('@stawi/db');
  if (viewer !== userId) {
    const shared = await prisma.membership.count({
      where: { clerkUserId: viewer, group: { members: { some: { clerkUserId: userId } } } },
    });
    if (!shared) return new Response('Not found', { status: 404 });
  }
  const photo = await prisma.profilePhoto.findUnique({ where: { userId }, select: { dataUrl: true } });
  const m = photo && /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(photo.dataUrl);
  if (!m) return new Response('Not found', { status: 404 });
  const bytes = Buffer.from(m[2]!, 'base64');
  const v = new URL(req.url).searchParams.get('v');
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': m[1]!,
      'Content-Length': String(bytes.length),
      'Cache-Control': v ? 'private, max-age=604800, immutable' : 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
