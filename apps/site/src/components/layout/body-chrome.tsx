"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FloatingWhatsAppCta } from "@/components/shared/floating-whatsapp-cta";

/**
 * @deprecated LEGACY mirror — do not treat as source of truth.
 *
 * Canonical portal chrome lives in `src/components/layout/body-chrome.tsx`
 * and uses `shouldOmitPortalMarketingChromeForFinanceiro` from
 * `@devflow/financeiro-routes`. This file keeps an expanded local list only
 * to avoid double marketing chrome until #173 (nav F6) retires or syncs
 * `apps/site`. Prefer editing `src/`, never grow this mirror as product.
 */
const FINANCEIRO_APP_ROUTES = [
  "/ferramentas/financeiro/dashboard",
  "/ferramentas/financeiro/sources",
  "/ferramentas/financeiro/expenses",
  "/ferramentas/financeiro/rules",
  "/ferramentas/financeiro/settings",
  "/ferramentas/financeiro/onboarding",
  "/ferramentas/financeiro/invites/accept",
  "/ferramentas/financeiro/contas",
  "/ferramentas/financeiro/proximas-contas",
  "/ferramentas/financeiro/historico",
  "/ferramentas/financeiro/importar",
];

function isFinanceiroAppRoute(pathname: string): boolean {
  return FINANCEIRO_APP_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function BodyChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";

  if (isFinanceiroAppRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingWhatsAppCta />
    </>
  );
}
