import { PageHeader } from "@/components/ui/page-header";
import { SettingsTenantForm } from "./SettingsTenantForm";
import { TenantInstructionsCard } from "./TenantInstructionsCard";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Conta"
        title="Configurações"
        description="Motor de IA, instruções de atendimento e atalhos para plano e análises. As alterações valem para todo o espaço de trabalho."
        layout="split"
        showDivider
      />
      <SettingsTenantForm />
      <TenantInstructionsCard />
    </div>
  );
}
