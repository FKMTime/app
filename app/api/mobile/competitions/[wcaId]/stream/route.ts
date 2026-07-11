import { requireMobileSession } from "@/lib/mobile/session";
import { getMobileCompetitionByWcaId } from "@/lib/data/mobile";
import { syncEventBus, type SyncEvent } from "@/lib/sync/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PING_INTERVAL_MS = 25_000;

// Mobile SSE stream. Same wire format as /api/sse/[wcaId]: a `change` event
// per sync write with { scopes, at }. Kept behind auth so we don't leak the
// bus to anonymous clients on this surface (the public web SSE stays open).
export async function GET(
  req: Request,
  context: { params: Promise<{ wcaId: string }> },
) {
  const s = await requireMobileSession(req);
  if (!s.ok) return new Response(s.error, { status: s.status });

  const { wcaId } = await context.params;
  const competition = await getMobileCompetitionByWcaId(wcaId);
  if (!competition) return new Response("Competition not found", { status: 404 });

  const encoder = new TextEncoder();
  const channel = `change:${competition.id}`;

  let pingTimer: NodeJS.Timeout | null = null;
  let listener: ((e: SyncEvent) => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {}
      };
      send(": ready\n\n");
      listener = (event: SyncEvent) => {
        send(
          `event: change\ndata: ${JSON.stringify({
            scopes: event.scopes,
            at: event.at.toISOString(),
          })}\n\n`,
        );
      };
      syncEventBus.on(channel, listener);
      pingTimer = setInterval(() => send(": ping\n\n"), PING_INTERVAL_MS);
    },
    cancel() {
      if (pingTimer) clearInterval(pingTimer);
      if (listener) syncEventBus.off(channel, listener);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
