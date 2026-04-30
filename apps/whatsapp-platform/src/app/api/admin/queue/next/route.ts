import { jsonError, newTraceId } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** Compat.: fila operacional — usar sempre `GET /api/inbox/queue/next`. */
export async function GET() {
  return jsonError(
    "GONE",
    "Endpoint descontinuado. Use GET /api/inbox/queue/next com a mesma autenticação.",
    410,
    { traceId: newTraceId() }
  );
}
