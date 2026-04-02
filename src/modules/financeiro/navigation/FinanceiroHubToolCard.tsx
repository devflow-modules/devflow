"use client";

import { Wallet } from "lucide-react";
import type { ToolCardProps } from "@/components/sections/tool-card";
import { ToolCard } from "@/components/sections/tool-card";
import { trackFinanceiroGoToDashboardClicked } from "@/lib/analytics";
import { FINANCEIRO_BASE_PATH } from "@devflow/financeiro-routes";

/** Não recebe `icon` do Server Component (função não serializa no RSC). */
export type FinanceiroHubToolCardProps = Omit<ToolCardProps, "icon">;

/**
 * Card no hub /ferramentas — sem chamada a /api/me no portal (Bloco D).
 * Link para a landing canónica do produto (path relativo ou host do app via env).
 */
export function FinanceiroHubToolCard(props: FinanceiroHubToolCardProps) {
  const surface = "ferramentas_hub";

  const handleNavigate = () => {
    trackFinanceiroGoToDashboardClicked({
      source_path: "/ferramentas",
      target_path: FINANCEIRO_BASE_PATH,
      has_last_route: false,
      surface,
    });
  };

  return (
    <ToolCard
      {...props}
      icon={Wallet}
      onCtaNavigate={handleNavigate}
    />
  );
}
