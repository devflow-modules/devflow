"use client";

import { usePathname } from "next/navigation";
import { shouldOmitPortalMarketingChromeForFinanceiro } from "@devflow/financeiro-routes";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FloatingWhatsAppCta } from "@/components/shared/floating-whatsapp-cta";

export function BodyChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";

  if (shouldOmitPortalMarketingChromeForFinanceiro(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="df-page min-w-0 flex-1 overflow-x-clip">{children}</main>
      <Footer />
      <FloatingWhatsAppCta />
    </>
  );
}
