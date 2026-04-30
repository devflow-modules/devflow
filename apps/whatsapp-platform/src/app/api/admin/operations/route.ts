import { jsonError, newTraceId } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * PATCH operacional migrou para `PATCH /api/operations/tenant` (manager+) para não ocupar `/api/admin/*`.
 *
 * Esta rota só devolve erro canónico; remove acoplamento de «admin» à operação tenant.
 */
export async function PATCH() {
  const traceId = newTraceId();
  return jsonError(
    "GONE",
    "Este endpoint foi descontinuado. Use PATCH /api/operations/tenant com a mesma sessão.",
    410,
    { traceId }
  );
}
