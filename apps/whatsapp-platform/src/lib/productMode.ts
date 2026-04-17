/** Build-time: `NEXT_PUBLIC_PRODUCT_MODE`. `WHITE_LABEL` oculta faturação na UI; lógica interna mantém-se. */
export const PRODUCT_MODE = process.env.NEXT_PUBLIC_PRODUCT_MODE ?? "SAAS";

export const isWhiteLabelMode = () => PRODUCT_MODE === "WHITE_LABEL";
