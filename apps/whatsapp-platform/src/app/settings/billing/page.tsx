import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClassName } from "@/components/ui/button";
import { BillingSettingsClient } from "./BillingSettingsClient";

export default function BillingSettingsPage() {
  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Conta"
        title="Plano no espaço de trabalho"
        description={
          <>
            Plano base (Stripe) e uso variável (mensagens e IA). O painel completo de consumo e renovação está em{" "}
            <Link href="/billing" className="font-semibold text-[var(--df-brand-700)] hover:underline">
              Plano e faturação
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
