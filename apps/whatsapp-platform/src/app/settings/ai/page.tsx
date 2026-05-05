import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { AiSettingsForm } from "./AiSettingsForm";
import { aiSettingsHref } from "./aiSettingsAnchors";
import { PricingContextHint } from "@/components/dashboard/billing/PricingContextHint";
import { CONTEXTUAL_UPGRADE_HINTS } from "@/modules/billing/planPresentation";
import { isWhiteLabelMode } from "@/lib/productMode";

export default function AiSettingsPage() {
  const wl = isWhiteLabelMode();
  return (
    <div className="df-page-narrow df-stack min-w-0">
      <PageHeader
        eyebrow="Inteligência"
        title="IA base do WhatsApp"
        description={
          wl ? (
            <>
              <strong className="font-semibold text-[var(--df-text-primary)]">Padrão do workspace</strong> para o WhatsApp:
              identidade, regras, automação e teste. As{" "}
              <strong className="font-semibold text-[var(--df-text-primary)]">linhas e canais</strong> herdam esta base e
              podem ajustar <strong className="font-semibold text-[var(--df-text-primary)]">propósito</strong>,{" "}
              <strong className="font-semibold text-[var(--df-text-primary)]">resposta automática</strong> e{" "}
              <strong className="font-semibold text-[var(--df-text-primary)]">perfil de IA</strong> por canal. O fornecedor
              LLM (OpenAI / Claude / regras) define-se em{" "}
              <Link href="/settings" className="font-semibold text-[var(--df-brand-700)] hover:underline">
                Configurações gerais
              </Link>
              ; desempenho em{" "}
              <Link href="/settings/ai-analytics" className="font-semibold text-[var(--df-brand-700)] hover:underline">
                Análises de IA
              </Link>
              ; saúde operacional em{" "}
              <Link href="/dashboard/ai" className="font-semibold text-[var(--df-brand-700)] hover:underline">
                Painel IA
              </Link>
              .
            </>
          ) : (
            <>
              <strong className="font-semibold text-[var(--df-text-primary)]">Padrão do workspace</strong> para o WhatsApp:
              identidade, regras, automação e teste. As{" "}
              <strong className="font-semibold text-[var(--df-text-primary)]">linhas e canais</strong> herdam esta base e
              podem ajustar <strong className="font-semibold text-[var(--df-text-primary)]">propósito</strong>,{" "}
              <strong className="font-semibold text-[var(--df-text-primary)]">resposta automática</strong> e{" "}
              <strong className="font-semibold text-[var(--df-text-primary)]">perfil de IA</strong> por canal. O fornecedor
              LLM (OpenAI / Claude / regras) define-se em{" "}
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
          )
        }
        layout="split"
        showDivider
        tone="admin"
        quickActions={
          <>
            {/* Submit nativo: evita componente cliente no Server Component. */}
            <button
              type="submit"
              form="wf-ai-settings"
              className="df-btn-primary inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold"
            >
              Salvar alterações
            </button>
            <Link href={aiSettingsHref("teste")} className="df-quick-action">
              Ir para teste
            </Link>
            <Link href="/inbox" className="df-quick-action">
              Testar na Inbox
            </Link>
            <Link href="/settings/ai-analytics" className="df-quick-action">
              {wl ? "Análises de IA" : "Uso e custo de IA"}
            </Link>
            <Link href="/dashboard/ai" className="df-quick-action">
              Painel de operação
            </Link>
            <Link href="/admin/whatsapp" className="df-quick-action">
              Gerenciar canais
            </Link>
            <Link href="/settings" className="df-quick-action">
              Motor (config. gerais)
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

      <section
        className="rounded-xl border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_50%,var(--df-bg-elevated))] p-4 shadow-sm ring-1 ring-[color-mix(in_srgb,var(--df-border-dark)_75%,transparent)]"
        aria-labelledby="wf-ai-channel-info-heading"
      >
        <h2
          id="wf-ai-channel-info-heading"
          className="text-sm font-semibold text-[var(--df-text-primary)]"
        >
          IA por canal
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--df-text-secondary)]">
          Esta configuração é o padrão global. Linhas como Atendimento, Prospecção, Suporte ou Financeiro podem herdar esta
          IA ou usar ajustes próprios.
        </p>
        <Link
          href="/admin/whatsapp"
          className="mt-3 inline-flex text-sm font-semibold text-[var(--df-brand-700)] hover:underline"
        >
          Gerenciar canais
        </Link>
      </section>

      <PricingContextHint message={CONTEXTUAL_UPGRADE_HINTS.aiSettings} />

      <AiSettingsForm />
    </div>
  );
}
