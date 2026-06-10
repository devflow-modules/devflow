import {
  FINANCEIRO_AUTH_PATH,
  FINANCEIRO_BASE_PATH,
  FINANCEIRO_DEMO_PATH,
  isFinanceiroOperationalPath,
} from "@devflow/financeiro-routes";
import { WHATSAPP_PORTAL_JWT_PREFIXES } from "@devflow/whatsapp-routes";

const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/demo",
  "/contato",
  "/cases",
  "/precos",
  "/projetos",
  "/sobre",
  "/ferramentas",
]);

/** Prefixos de marketing público (inclui nichos WhatsApp). */
const PUBLIC_MARKETING_PREFIXES = [
  "/produtos/whatsapp-platform",
  "/ferramentas/divisao-de-contas",
  "/ferramentas/consulta-cnpj",
  "/automacao-whatsapp",
  "/software-atendimento-whatsapp",
  "/chatbot-whatsapp",
  "/whatsapp-business-api",
] as const;

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isStaticOrMetadataPath(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico" || pathname === "/robots.txt") return true;
  if (pathname.startsWith("/sitemap")) return true;
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?)$/i.test(pathname)) return true;
  return false;
}

function isFinanceiroLandingPath(pathname: string): boolean {
  return pathname === FINANCEIRO_BASE_PATH || pathname === `${FINANCEIRO_BASE_PATH}/`;
}

function isFinanceiroDemoPath(pathname: string): boolean {
  return pathname === FINANCEIRO_DEMO_PATH || pathname.startsWith(`${FINANCEIRO_DEMO_PATH}/`);
}

function isFinanceiroAuthPath(pathname: string): boolean {
  return pathname === FINANCEIRO_AUTH_PATH || pathname.startsWith(`${FINANCEIRO_AUTH_PATH}/`);
}

function isWhatsappProtectedPath(pathname: string): boolean {
  return WHATSAPP_PORTAL_JWT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

function isPrivateApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/admin");
}

function isPublicMarketingPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true;

  for (const prefix of PUBLIC_MARKETING_PREFIXES) {
    if (matchesPathPrefix(pathname, prefix)) return true;
  }

  if (pathname === "/blog" || pathname.startsWith("/blog/")) return true;
  if (pathname.startsWith("/produtos/")) return true;

  return false;
}

/**
 * Indica se o proxy (`src/proxy.ts`) deve criar client Supabase e chamar `auth.getUser()`.
 * Rotas públicas de marketing retornam false — evita latência e AuthRetryableFetchError
 * quando Supabase está indisponível ou há cookie antigo.
 */
export function shouldRunSupabaseSession(pathname: string): boolean {
  if (isStaticOrMetadataPath(pathname)) return false;

  if (isAdminPath(pathname)) return true;
  if (isWhatsappProtectedPath(pathname)) return true;
  if (isPrivateApiPath(pathname)) return true;

  if (isFinanceiroLandingPath(pathname)) return true;
  if (isFinanceiroOperationalPath(pathname)) return true;
  if (isFinanceiroAuthPath(pathname)) return true;
  if (isFinanceiroDemoPath(pathname)) return false;

  if (isPublicMarketingPath(pathname)) return false;

  return false;
}
