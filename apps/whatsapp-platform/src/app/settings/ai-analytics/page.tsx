import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { AiAnalyticsClient } from "./AiAnalyticsClient";

export const metadata: Metadata = {
  title: "Uso de IA | DevFlow WhatsApp",
  description: "Métricas de uso, desempenho e referência de consumo da IA.",
  robots: "noindex, nofollow",
};

export default function AiAnalyticsPage() {
  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Inteligência"
        title="Uso e desempenho da IA"
        description="Tokens, fallbacks, limites contratados e referência de consumo — para afinar o prompt e a operação. O motor (fornecedor) está em Configurações gerais; o comportamento do texto em IA base (WhatsApp)."
        layout="split"
        showDivider
        tone="admin"
        quickActions={
          <>
            <Link href="/settings" className="df-quick-action">
              Motor (config. gerais)
            </Link>
            <Link href="/settings/ai" className="df-quick-action">
              IA base (WhatsApp)
            </Link>
            <Link href="/dashboard/ai" className="df-quick-action">
              Painel de operação
            </Link>
          </>
        }
      />
      <AiAnalyticsClient />
    </div>
  );
}
