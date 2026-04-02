/**
 * Alias canónico para o webhook Stripe no host do app Financeiro.
 * Implementação e eventos: @see ../billing/webhook/route.ts
 */
export const dynamic = "force-dynamic";

export { POST } from "../../billing/webhook/route";
