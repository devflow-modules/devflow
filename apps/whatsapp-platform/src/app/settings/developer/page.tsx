import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { DeveloperApiKeyClient } from "./DeveloperApiKeyClient";

export const metadata: Metadata = {
  title: "Integrações e API | WhatsApp Platform",
  robots: "noindex, nofollow",
};

export default function DeveloperSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Avançado"
        title="Integrações e API"
        description="Gere a chave de API do tenant para integrações técnicas. A ativação do WhatsApp e as instruções do assistente não dependem disto."
        layout="split"
        showDivider
      />
      <DeveloperApiKeyClient />
    </div>
  );
}
