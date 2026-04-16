/**
 * Modo de produto exposto ao cliente (build-time via `NEXT_PUBLIC_*`).
 * `WHITE_LABEL` oculta UI e rotas de faturação ao utilizador final; serviços internos mantêm-se.
 */
export const PRODUCT_MODE = process.env.NEXT_PUBLIC_PRODUCT_MODE ?? "SAAS";

export const isWhiteLabelMode = (): boolean => PRODUCT_MODE === "WHITE_LABEL";
