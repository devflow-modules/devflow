/**
 * Autorização para rotas de métricas admin (dev = livre; prod = header x-admin-metrics-secret).
 */
export function isAdminMetricsAllowed(request: Request): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const secret = process.env.ADMIN_METRICS_SECRET;
  if (!secret) return false;
  return request.headers.get("x-admin-metrics-secret") === secret;
}
