import { prisma } from "@/prisma";
import { syncEventBus, type SyncEvent } from "@/lib/sync/events";

export const runtime = "nodejs";
// SSE responses must not be cached anywhere.
export const dynamic = "force-dynamic";

const PING_INTERVAL_MS = 25_000;

export async function GET(
  _req: Request,
  context: { params: Promise<{ wcaId: string }> },
) {
  const { wcaId } = await context.params;
  const competition = await prisma.competition.findFirst({
    where: {
      wcaId,
      status: { in: ["APPROVED", "LIVE", "FINISHED"] },
    },
    select: { id: true },
  });
  if (!competition) {
    return new Response("Competition not found", { status: 404 });
  }
  const competitionId = competition.id;

  const encoder = new TextEncoder();
  const channel = `change:${competitionId}`;

  let pingTimer: NodeJS.Timeout | null = null;
  let listener: ((e: SyncEvent) => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Client disconnected mid-write; cancel() will run shortly.
        }
      };

      send(": ready\n\n");

      listener = (event: SyncEvent) => {
        const payload = JSON.stringify({
          scopes: event.scopes,
          at: event.at.toISOString(),
        });
        send(`event: change\ndata: ${payload}\n\n`);
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
      // Disable Nginx/Caddy buffering if a reverse proxy is in the way.
      "X-Accel-Buffering": "no",
    },
  });
}
