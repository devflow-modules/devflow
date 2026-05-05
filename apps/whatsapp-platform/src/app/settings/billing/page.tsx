import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClassName } from "@/components/ui/button";
import { isCommercialBillingVisible } from "@/lib/productMode";
import { BillingSettingsClient } from "./BillingSettingsClient";

export default function BillingSettingsPage() {
  if (!isCommercialBillingVisible()) redirect("/dashboard");
  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Conta"
        title="Contrato e uso (resumo)"
        description={
          <>
            Resumo da mensalidade e do consumo. Para comparar capacidades (operação, IA, equipa) e ver alertas,
            use{" "}
            <Link href="/dashboard/billing" className="font-semibold text-[var(--df-brand-700)] hover:underline">
              Contrato e uso no painel
            </Link>{" "}
            ou{" "}
            <Link href="/billing" className="font-semibold text-[var(--df-brand-700)] hover:underline">
              a página dedicada
            </Link>
            .
          </>
        }
        layout="split"
        showDivider
        actions={
          <Link href="/settings" className={`${buttonClassName("secondary")} text-sm`}>
            Voltar às configurações
          </Link>
        }
      />
      <BillingSettingsClient />
    </div>
  );
}
