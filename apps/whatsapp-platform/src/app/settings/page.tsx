import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsTenantForm } from "./SettingsTenantForm";
import { TenantInstructionsCard } from "./TenantInstructionsCard";

export default function SettingsPage() {
  return (
    <div className="df-page-narrow df-stack">
      <PageHeader
        eyebrow="Conta"
        title="Configurações"
        description="Motor de IA, instruções de atendimento e atalhos para plano e análises. As alterações valem para todo o espaço de trabalho."
        layout="split"
        showDivider
        tone="admin"
        quickActions={
          <>
            <Link href="/settings/ai" className="df-quick-action">
              IA de atendimento
            </Link>
            <Link href="/settings/developer" className="df-quick-action">
              API e integrações
            </Link>
            <Link href="/billing" className="df-quick-action">
              Cobrança
            </Link>
          </>
        }
      />
      <SettingsTenantForm />
      <TenantInstructionsCard />
    </div>
  );
}
