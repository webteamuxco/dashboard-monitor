import { NextRequest } from "next/server";
import {
  eventBus,
  type MonitorChangedEvent,
} from "@/lib/realtime/eventBus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_INTERVAL_MS = 15_000;

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      // SSE comment line: flushes the response headers so the client's
      // EventSource transitions to OPEN immediately, before the first event.
      send(": connected\n\n");

      const onChange = (payload: MonitorChangedEvent) => {
        send(
          `data: ${JSON.stringify({ type: "monitor:changed", ...payload })}\n\n`,
        );
      };

      // Reverse proxies (nginx, cloud load-balancers) drop idle connections
      // after ~30-60s. A periodic comment frame keeps the socket alive without
      // emitting a parseable event to the client.
      const heartbeat = setInterval(() => {
        send(": ping\n\n");
      }, HEARTBEAT_INTERVAL_MS);

      eventBus.on("monitor:changed", onChange);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        eventBus.off("monitor:changed", onChange);
        try {
          controller.close();
        } catch {
          // already closed by the runtime
        }
      };

      request.signal.addEventListener("abort", cleanup);
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
