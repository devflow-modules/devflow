import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StateLoading } from "@/components/ui/app-states";
import { BillingPageClient } from "./BillingPageClient";

export default function BillingPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Subscrição"
        title="Plano e uso"
        description="Veja o nome do plano, consumo do período e a data de renovação. Pode mudar de plano ou gerir pagamentos quando aplicável."
        layout="split"
        showDivider
      />
      <Suspense fallback={<StateLoading message="A carregar dados de faturação…" />}>
        <BillingPageClient />
      </Suspense>
    </div>
  );
}
