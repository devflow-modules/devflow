/**
 * Rotas no portal que exigem JWT (usuário já autenticado).
 * Alinhar com src/middleware.ts — não inclui /login nem fluxo de recuperação de senha.
 */
export const WHATSAPP_PORTAL_JWT_PREFIXES: readonly string[] = [
  "/inbox",
  "/settings",
  "/dashboard/billing",
  "/dashboard/whatsapp",
  "/onboarding",
  "/automation",
] as const;

/**
 * UI no portal que, com cutover ativo, redireciona para NEXT_PUBLIC_WHATSAPP_APP_URL (308).
 * Inclui JWT + auth + admin do produto WhatsApp.
 */
export const WHATSAPP_PORTAL_CUTOVER_REDIRECT_PREFIXES: readonly string[] = [
  ...WHATSAPP_PORTAL_JWT_PREFIXES,
  "/login",
  "/forgot-password",
  "/reset-password",
  "/signup",
] as const;

/** Prefixos de API no portal que deixam de ser canónicos após cutover (documentação / redirects opcionais). */
export const WHATSAPP_PORTAL_API_OPERATIONAL_PREFIXES: readonly string[] = [
  "/api/webhook/whatsapp",
  "/api/whatsapp",
  "/api/admin/whatsapp",
  "/api/admin/conversations",
  "/api/auth",
] as const;
