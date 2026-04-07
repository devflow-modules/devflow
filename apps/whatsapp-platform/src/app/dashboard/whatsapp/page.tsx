import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StateLoading } from "@/components/ui/app-states";
import { WhatsappConnectClient } from "./WhatsappConnectClient";

export default function DashboardWhatsappPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Ligação"
        title="WhatsApp Business"
        description="Números autorizados na Meta para esta conta — receber e enviar mensagens pela plataforma."
        layout="split"
        showDivider
      />
      <Suspense fallback={<StateLoading message="A preparar…" />}>
        <WhatsappConnectClient />
      </Suspense>
    </div>
  );
}
