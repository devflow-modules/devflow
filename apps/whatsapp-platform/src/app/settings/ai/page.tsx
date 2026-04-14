import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { AiSettingsForm } from "./AiSettingsForm";
import { aiSettingsHref } from "./aiSettingsAnchors";
import { PricingContextHint } from "@/components/dashboard/billing/PricingContextHint";
import { CONTEXTUAL_UPGRADE_HINTS } from "@/modules/billing/planPresentation";

export default function AiSettingsPage() {
  return (
    <div className="df-page-narrow df-stack min-w-0">
      <PageHeader
        eyebrow="Inteligência"
        title="IA de atendimento"
        description={
          <>
            Comportamento da IA no WhatsApp: identidade, regras, automação e teste. O fornecedor LLM (OpenAI / Claude /
            regras) define-se em{" "}
            <Link href="/settings" className="font-semibold text-[var(--df-brand-700)] hover:underline">
              Configurações gerais
            </Link>
            ; consumo e limites em{" "}
            <Link href="/settings/ai-analytics" className="font-semibold text-[var(--df-brand-700)] hover:underline">
              Uso e custo
            </Link>
            ; saúde operacional em{" "}
            <Link href="/dashboard/ai" className="font-semibold text-[var(--df-brand-700)] hover:underline">
              Painel IA
            </Link>
            .
          </>
        }
        layout="split"
        showDivider
        tone="admin"
        quickActions={
          <>
            <button type="submit" form="wf-ai-settings" className="df-quick-action">
              Salvar alterações
            </button>
            <Link href={aiSettingsHref("teste")} className="df-quick-action">
              Ir para teste
            </Link>
            <Link href="/inbox" className="df-quick-action">
              Testar na Inbox
            </Link>
            <Link href="/settings/ai-analytics" className="df-quick-action">
              Uso e custo de IA
            </Link>
            <Link href="/dashboard/ai" className="df-quick-action">
              Painel de operação
            </Link>
            <Link href="/settings" className="df-quick-action">
              Motor (config. gerais)
            </Link>
            <Link href="/settings/developer" className="df-quick-action">
              API e integrações
            </Link>
            <Link href="/billing" className="df-quick-action">
              Plano e faturação
            </Link>
          </>
        }
      />

      <PricingContextHint message={CONTEXTUAL_UPGRADE_HINTS.aiSettings} />

      <AiSettingsForm />
    </div>
  );
}
