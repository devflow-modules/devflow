/**
 * URLs dos endpoints GET /api/ops/metrics de cada produto.
 * Em desenvolvimento use localhost com a porta de cada app.
 */
export function getProductMetricsUrls(): { product: string; url: string }[] {
  const env = process.env;
  const items: { product: string; url: string }[] = [];
  if (env.OPS_FINANCEIRO_URL) items.push({ product: "financeiro", url: env.OPS_FINANCEIRO_URL });
  if (env.OPS_INVESTIGAMAIS_URL)
    items.push({ product: "investigamais", url: env.OPS_INVESTIGAMAIS_URL });
  if (env.OPS_WHATSAPP_URL)
    items.push({ product: "whatsapp-platform", url: env.OPS_WHATSAPP_URL });
  return items;
}
