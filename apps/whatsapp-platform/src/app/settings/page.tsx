import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsTenantForm } from "./SettingsTenantForm";
import { TenantInstructionsCard } from "./TenantInstructionsCard";
import { isWhiteLabelMode } from "@/lib/productMode";

export default function SettingsPage() {
  const wl = isWhiteLabelMode();
  return (
    <div className="df-page-narrow df-stack">
      <PageHeader
        eyebrow="Conta"
        title="Configurações"
        description={
          wl
            ? "Motor de IA, instruções de atendimento e atalhos para a operação. As alterações valem para todo o espaço de trabalho."
            : "Motor de IA, instruções de atendimento e atalhos para plano e análises. As alterações valem para todo o espaço de trabalho."
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
              {wl ? "Desempenho da IA" : "Uso e custo de IA"}
            </Link>
            <Link href="/dashboard/ai" className="df-quick-action">
              Painel IA (operação)
            </Link>
            <Link href="/settings/developer" className="df-quick-action">
              API e integrações
            </Link>
            {!wl ? (
              <Link href="/billing" className="df-quick-action">
                Plano e faturação
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
