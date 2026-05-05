import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsTenantForm } from "./SettingsTenantForm";
import { TenantInstructionsCard } from "./TenantInstructionsCard";
import { isCommercialBillingVisible } from "@/lib/productMode";

export default function SettingsPage() {
  const commercialVisible = isCommercialBillingVisible();
  return (
    <div className="df-page-narrow df-stack">
      <PageHeader
        eyebrow="Conta"
        title="Configurações"
        description={
          !commercialVisible
            ? "Motor de IA, instruções de atendimento e atalhos para a operação. As alterações valem para todo o espaço de trabalho."
            : "Motor de IA, instruções de atendimento e atalhos para contrato e análises. As alterações valem para todo o espaço de trabalho."
        }
        layout="split"
        showDivider
        tone="admin"
        quickActions={
          <>
            <Link href="/settings/ai" className="df-quick-action">
              IA de atendimento
            </Link>
            <Link href="/settings/ai-analytics" className="df-quick-action">
              {!commercialVisible ? "Desempenho da IA" : "Uso e desempenho da IA"}
            </Link>
            <Link href="/dashboard/ai" className="df-quick-action">
              Painel IA (operação)
            </Link>
            <Link href="/settings/developer" className="df-quick-action">
              API e integrações
            </Link>
            {commercialVisible ? (
              <Link href="/billing" className="df-quick-action">
                Contrato e uso
              </Link>
            ) : null}
          </>
        }
      />
      <SettingsTenantForm />
      <TenantInstructionsCard />
    </div>
  );
}
