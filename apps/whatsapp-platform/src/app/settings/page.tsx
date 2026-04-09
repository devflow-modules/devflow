import Link from "next/link";
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
        tone="admin"
        quickActions={
          <>
            <Link
              href="/settings/ai"
              className="rounded-lg bg-white px-3 py-1.5 text-slate-700 shadow-sm ring-1 ring-slate-200/90 transition hover:bg-slate-50"
            >
              IA de atendimento
            </Link>
            <Link
              href="/settings/developer"
              className="rounded-lg bg-white px-3 py-1.5 text-slate-700 shadow-sm ring-1 ring-slate-200/90 transition hover:bg-slate-50"
            >
              API e integrações
            </Link>
            <Link
              href="/billing"
              className="rounded-lg bg-white px-3 py-1.5 text-slate-700 shadow-sm ring-1 ring-slate-200/90 transition hover:bg-slate-50"
            >
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
