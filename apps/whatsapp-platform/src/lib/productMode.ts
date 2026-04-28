/**
 * Build/runtime mode via `NEXT_PUBLIC_PRODUCT_MODE`.
 * Lockdown comercial (billing/stripe/upgrade) aplica-se em `WHITE_LABEL` e `IMPLEMENTATION`.
 */
export type ProductMode = "SAAS" | "WHITE_LABEL" | "IMPLEMENTATION";

function normalizeProductMode(raw: string | undefined): ProductMode {
  const mode = raw?.trim().toUpperCase();
  if (mode === "SAAS") return "SAAS";
  if (mode === "WHITE_LABEL") return "WHITE_LABEL";
  if (mode === "IMPLEMENTATION") return "IMPLEMENTATION";
  // Default seguro: modo operacional sem exposição comercial self-service.
  return "IMPLEMENTATION";
}

export const PRODUCT_MODE: ProductMode = normalizeProductMode(
  process.env.NEXT_PUBLIC_PRODUCT_MODE
);

export const isSaasMode = () => PRODUCT_MODE === "SAAS";
export const isImplementationMode = () => PRODUCT_MODE === "IMPLEMENTATION";
export const isWhiteLabelMode = () =>
  PRODUCT_MODE === "WHITE_LABEL" || PRODUCT_MODE === "IMPLEMENTATION";
export const isCommercialBillingVisible = () => isSaasMode();
