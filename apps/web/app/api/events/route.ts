import { subscribe, type StawiEvent } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/events?channel=<tenantId|public> — Server-Sent Events stream.
 * Browsers subscribe via EventSource; server actions publish after writes,
 * and every member's dashboard refreshes within a second of a payment.
 * Heartbeat every 25s keeps proxies from closing the connection.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const channel = url.searchParams.get('channel') ?? 'public';
  const encoder = new TextEncoder();

  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => controller.enqueue(encoder.encode(data));
      send(`retry: 3000\n\n`);

      const unsub = subscribe((e: StawiEvent) => {
        if (e.channel === channel || e.channel === 'public') {
          send(`event: stawi\ndata: ${JSON.stringify(e)}\n\n`);
        }
      });
      const beat = setInterval(() => send(`: hb\n\n`), 25_000);

      cleanup = () => {
        unsub();
        clearInterval(beat);
        try { controller.close(); } catch { /* already closed */ }
      };
      req.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
