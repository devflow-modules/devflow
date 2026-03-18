"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FloatingWhatsAppCta } from "@/components/shared/floating-whatsapp-cta";

const FINANCEIRO_APP_ROUTES = [
  "/ferramentas/financeiro/dashboard",
  "/ferramentas/financeiro/sources",
  "/ferramentas/financeiro/expenses",
  "/ferramentas/financeiro/rules",
  "/ferramentas/financeiro/settings",
  "/ferramentas/financeiro/onboarding",
  "/ferramentas/financeiro/invites/accept",
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
      <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
      <Footer />
      <FloatingWhatsAppCta />
    </>
  );
}
