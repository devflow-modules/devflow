import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { AiAnalyticsClient } from "./AiAnalyticsClient";

export const metadata: Metadata = {
  title: "Uso de IA | DevFlow WhatsApp",
  description: "Métricas de uso, custo e performance da IA.",
  robots: "noindex, nofollow",
};

export default function AiAnalyticsPage() {
  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Inteligência"
        title="Uso e custo da IA"
        description="Tokens, fallbacks, limites do plano e custo estimado — para afinar o prompt e o consumo."
        layout="split"
        showDivider
        actions={
          <Link
            href="/settings/ai"
            className="text-sm font-semibold text-[var(--df-brand-700)] hover:underline"
          >
            Configurar IA →
          </Link>
        }
      />
      <AiAnalyticsClient />
    </div>
  );
}
