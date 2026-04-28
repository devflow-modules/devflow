import { MessageCircle, Wallet, Database, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const pairs = [
  {
    problem: {
      icon: MessageCircle,
      text: "Atendimento no WhatsApp desorganizado",
      detail: "Mensagens paradas, fila crescendo",
    },
    solution: {
      label: "WhatsApp Platform",
      text: "Bot + humano no mesmo fluxo",
      detail: "Resposta na hora; gente quando precisa",
      color: "text-primary",
      bg: "bg-primary/5 border-primary/20",
    },
  },
  {
    problem: {
      icon: Wallet,
      text: "Controle financeiro em planilhas",
      detail: "Número nunca bate, tudo espalhado",
    },
    solution: {
      label: "Sistema Financeiro",
      text: "Um painel, mês fechado",
      detail: "Categorias, recorrência, visão clara",
      color: "text-blue-600",
      bg: "bg-blue-500/5 border-blue-500/20",
    },
  },
  {
    problem: {
      icon: Database,
      text: "Dados de empresas difíceis de acessar",
      detail: "Site lento, dado velho",
    },
    solution: {
      label: "Ferramentas Integradas",
      text: "Dado na hora",
      detail: "CNPJ, rateio — abre e usa",
      color: "text-orange-500",
      bg: "bg-orange-500/5 border-orange-500/20",
    },
  },
];

export function ProblemSolutionSection() {
  return (
    <section
      id="problema-solucao"
      className="border-y df-border-brand bg-[var(--devflow-surface)] py-24 sm:py-28"
      aria-labelledby="problem-solution-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="problem-solution-heading"
            className="df-text-primary text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Chega de app solto e planilha espalhada
          </h2>
          <p className="df-text-secondary mt-3 leading-relaxed">Dor de um lado. Caminho do outro.</p>
          <p className="df-text-muted mt-3 text-sm leading-relaxed">
            O próximo passo é simples: escolha o par que combina com você.
          </p>
        </div>

        <div className="mt-14 space-y-8">
          {pairs.map((pair, index) => (
            <div
              key={index}
              className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center"
            >
              {/* Problema */}
              <div className="rounded-2xl border border-red-500/25 bg-red-950/25 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
                    <pair.problem.icon className="size-5 text-red-400" aria-hidden />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <X className="size-3.5 text-red-400 shrink-0" aria-hidden />
                      <p className="df-text-primary text-sm font-semibold">{pair.problem.text}</p>
                    </div>
                    <p className="df-text-secondary mt-1 text-xs leading-relaxed">{pair.problem.detail}</p>
                  </div>
                </div>
              </div>

              {/* Seta */}
              <div className="flex justify-center">
                <div className="df-surface flex size-8 items-center justify-center rounded-full shadow-sm">
                  <ArrowRight className="size-4 text-primary" aria-hidden />
                </div>
              </div>

              {/* Solução */}
              <div className={cn("rounded-2xl border p-5", pair.solution.bg)}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl",
                    pair.solution.bg.replace("bg-", "bg-").replace("/5", "/10")
                  )}>
                    <span className={cn("text-lg font-bold", pair.solution.color)} aria-hidden>✓</span>
                  </div>
                  <div>
                    <p className={cn("text-xs font-semibold uppercase tracking-wide", pair.solution.color)}>
                      {pair.solution.label}
                    </p>
                    <p className="df-text-primary mt-0.5 text-sm font-semibold">{pair.solution.text}</p>
                    <p className="df-text-secondary mt-1 text-xs leading-relaxed">{pair.solution.detail}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
