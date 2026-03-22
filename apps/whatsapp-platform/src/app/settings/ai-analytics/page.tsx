import type { Metadata } from "next";
import Link from "next/link";
import { AiAnalyticsClient } from "./AiAnalyticsClient";

export const metadata: Metadata = {
  title: "Uso de IA | DevFlow WhatsApp",
  description: "Métricas de uso, custo e performance da IA.",
  robots: "noindex, nofollow",
};

export default function AiAnalyticsPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Uso e custo da IA</h1>
          <p className="text-slate-600 text-sm mt-1">
            Visibilidade de tokens, fallbacks e custo estimado.
          </p>
        </div>
        <Link
          href="/settings/ai"
          className="text-sm text-blue-600 hover:underline"
        >
          Configurar IA →
        </Link>
      </div>
      <AiAnalyticsClient />
    </div>
  );
}
