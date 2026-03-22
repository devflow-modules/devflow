import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/modules/auth";
import { subscribe } from "@/modules/realtime/realtime.publisher";
import { setOnline, setOffline, heartbeat } from "@/modules/presence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * SSE stream de eventos realtime da inbox.
 * Autenticado via cookie JWT. Isolado por tenant.
 * Presença: marca usuário online ao conectar, offline ao desconectar.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return new Response("Unauthorized", { status: 401 });
  }

  const tenantId = auth.payload.tenantId;
  const userId = auth.payload.sub;
  if (!tenantId || !userId) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // client disconnected
        }
      };

      setOnline(tenantId, userId, { name: auth.payload.name, email: auth.payload.email });
      send({ type: "connected", tenantId, userId, ts: new Date().toISOString() });

      const unsubscribe = subscribe(tenantId, (event) => {
        send(event);
      });

      const heartbeatInterval = setInterval(() => {
        try {
          heartbeat(tenantId, userId);
          send({ type: "ping", ts: new Date().toISOString() });
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30_000);

      request.signal?.addEventListener?.("abort", () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
        setOffline(tenantId, userId);
      });
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
