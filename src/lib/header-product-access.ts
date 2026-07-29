import { FINANCEIRO_AUTH_PATH } from "@devflow/financeiro-routes";
import { financeiroAppHref } from "@/lib/financeiro-app-href";
import { whatsappAppUrl } from "@/lib/whatsapp-app-url";

/** Label do controlo no Header (substitui «Entrar»). */
export const ACCESS_PRODUCTS_LABEL = "Acessar produtos";

export type HeaderProductAccessCta = "acessar_whatsapp" | "acessar_financeiro";

export type HeaderProductAccessTarget = {
  id: "whatsapp" | "financeiro";
  label: string;
  /** Destino de autenticação do produto (sem sessão unificada). */
  href: string;
  cta: HeaderProductAccessCta;
};

/**
 * Destinos explícitos de autenticação no Header marketing.
 * Sem detecção de sessão / «Continuar no produto» (nav F3/F4 v1).
 */
export function getHeaderProductAccessTargets(): HeaderProductAccessTarget[] {
  return [
    {
      id: "whatsapp",
      label: "WhatsApp Platform",
      href: whatsappAppUrl("/login"),
      cta: "acessar_whatsapp",
    },
    {
      id: "financeiro",
      label: "Financeiro",
      href: financeiroAppHref(FINANCEIRO_AUTH_PATH),
      cta: "acessar_financeiro",
    },
  ];
}
