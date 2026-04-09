import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { AiSettingsForm } from "./AiSettingsForm";

export default function AiSettingsPage() {
  return (
    <div className="df-page-narrow df-stack min-w-0">
      <PageHeader
        eyebrow="Inteligência"
        title="IA de atendimento"
        description={
          <>
            Respostas automáticas no WhatsApp por tenant. O motor (OpenAI ou Claude) define-se em{" "}
            <Link href="/settings" className="font-semibold text-[var(--df-brand-700)] hover:underline">
              Configurações
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
            <Link href="/inbox" className="df-quick-action">
              Testar na Inbox
            </Link>
            <Link href="/settings/ai-analytics" className="df-quick-action">
              Uso e custo de IA
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

      <section className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 to-white p-5 shadow-sm ring-1 ring-slate-900/[0.03] sm:p-6">
        <h2 className="text-sm font-bold text-slate-900">Guia rápido</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          <li>
            <Link href="/dashboard/whatsapp" className="font-semibold text-[var(--df-brand-700)] hover:underline">
              Ligação WhatsApp
            </Link>{" "}
            — número e token
          </li>
          <li>
            <Link href="/settings" className="font-semibold text-[var(--df-brand-700)] hover:underline">
              Motor de IA
            </Link>{" "}
            — OpenAI ou Claude nas configurações gerais
          </li>
          <li>Ativar IA e editar o prompt — formulário abaixo</li>
          <li>
            <Link href="/inbox" className="font-semibold text-[var(--df-brand-700)] hover:underline">
              Testar na Inbox
            </Link>
          </li>
        </ol>
      </section>

      <AiSettingsForm />
    </div>
  );
}
