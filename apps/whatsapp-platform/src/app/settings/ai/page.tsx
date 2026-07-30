import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { AiSettingsForm } from "./AiSettingsForm";
import { AiSettingsSaveHeaderButton } from "./AiSettingsSaveHeaderButton";
import { AI_SETTINGS_HEADER_QUICK_LINKS } from "./aiSettingsQuickActions";
import { PricingContextHint } from "@/components/dashboard/billing/PricingContextHint";
import { CONTEXTUAL_UPGRADE_HINTS } from "@/modules/billing/planPresentation";

/**
 * `/settings/ai` — chrome F1: header curto, Salvar + ≤2 quick links, sem cartão «IA por canal».
 */
export default function AiSettingsPage() {
  return (
    <div className="df-page-narrow df-stack min-w-0">
      <PageHeader
        eyebrow="Inteligência"
        title="IA base do WhatsApp"
        description={
          <>
            <strong className="font-semibold text-[var(--df-text-primary)]">Padrão do workspace</strong> para
            identidade, regras, automação e teste. Canais herdam esta base e podem ajustar propósito, auto-resposta e
            perfil em Admin · WhatsApp.
          </>
        }
        layout="split"
        showDivider
        tone="admin"
        quickActions={
          <>
            <AiSettingsSaveHeaderButton />
            {AI_SETTINGS_HEADER_QUICK_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="df-quick-action">
                {item.label}
              </Link>
            ))}
          </>
        }
      />

      <PricingContextHint message={CONTEXTUAL_UPGRADE_HINTS.aiSettings} />

      <AiSettingsForm />
    </div>
  );
}
