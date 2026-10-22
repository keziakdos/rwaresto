import { EventEmitter } from "node:events";

export type RealtimeEvent = {
  type: "order.created" | "order.updated" | "menu.updated" | "settings.updated" | "heartbeat";
  at: string;
  orderId?: string;
  status?: string;
  orderNumber?: string;
  tableNumber?: number | null;
  customerName?: string;
};

const globalRealtime = globalThis as unknown as {
  rwarestoEmitter?: EventEmitter;
  rwarestoLastEvent?: RealtimeEvent;
};
const emitter = globalRealtime.rwarestoEmitter ?? new EventEmitter();
emitter.setMaxListeners(200);
globalRealtime.rwarestoEmitter = emitter;

export function publish(event: Omit<RealtimeEvent, "at">) {
  const payload: RealtimeEvent = { ...event, at: new Date().toISOString() };
  globalRealtime.rwarestoLastEvent = payload;
  emitter.emit("event", payload);
}

export function subscribe(listener: (event: RealtimeEvent) => void): () => void {
  emitter.on("event", listener);
  return () => emitter.off("event", listener);
}

export function sseResponse(
  request: Request,
  onReady?: () => void,
  filter?: (event: RealtimeEvent) => boolean,
): Response {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;
  let heartbeat: NodeJS.Timeout | undefined;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: RealtimeEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      send({ type: "heartbeat", at: new Date().toISOString() });
      cleanup = subscribe((event) => {
        if (!filter || filter(event)) send(event);
      });
      heartbeat = setInterval(() => {
        send({ type: "heartbeat", at: new Date().toISOString() });
      }, 25000);
      onReady?.();

      request.signal.addEventListener("abort", () => {
        closed = true;
        cleanup?.();
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Le flux est déjà fermé.
        }
      });
    },
    cancel() {
      closed = true;
      cleanup?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
