import { PageHeader } from "@/components/ui/page-header";
import { SettingsTenantForm } from "./SettingsTenantForm";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Conta"
        title="Configurações"
        description="Motor de IA para respostas automáticas e atalhos para plano e análises. As alterações valem para todo o espaço de trabalho."
        layout="split"
        showDivider
      />
      <SettingsTenantForm />
    </div>
  );
}
