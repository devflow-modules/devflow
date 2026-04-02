/**
 * Mapeia price IDs do Stripe para plan_code persistido em TenantSubscription.
 * Variáveis: STRIPE_PRICE_PRO / STRIPE_PRICE_TEAM (ou STRIPE_TEST_* em dev, alinhado ao billing-core).
 */
export type PlanCodeLower = "free" | "pro" | "team";

function resolvePriceIds(): { pro: string | undefined; team: string | undefined } {
  const isDev = process.env.NODE_ENV !== "production";
  const pro = isDev
    ? process.env.STRIPE_TEST_PRICE_PRO ?? process.env.STRIPE_PRICE_PRO
    : process.env.STRIPE_PRICE_PRO ?? process.env.STRIPE_TEST_PRICE_PRO;
  const team = isDev
    ? process.env.STRIPE_TEST_PRICE_TEAM ?? process.env.STRIPE_PRICE_TEAM
    : process.env.STRIPE_PRICE_TEAM ?? process.env.STRIPE_TEST_PRICE_TEAM;
  return { pro, team };
}

export function mapPriceToPlan(priceId: string): PlanCodeLower {
  const { pro, team } = resolvePriceIds();
  if (pro && priceId === pro) return "pro";
  if (team && priceId === team) return "team";
  return "free";
}
