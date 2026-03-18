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
      className="bg-white py-24 sm:py-28"
      aria-labelledby="problem-solution-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="problem-solution-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Chega de app solto e planilha espalhada
          </h2>
          <p className="mt-3 text-slate-600">Dor de um lado. Caminho do outro.</p>
          <p className="mt-3 text-sm text-slate-500">
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
              <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-100">
                    <pair.problem.icon className="size-5 text-red-400" aria-hidden />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <X className="size-3.5 text-red-400 shrink-0" aria-hidden />
                      <p className="text-sm font-semibold text-slate-700">{pair.problem.text}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{pair.problem.detail}</p>
                  </div>
                </div>
              </div>

              {/* Seta */}
              <div className="flex justify-center">
                <div className="flex size-8 items-center justify-center rounded-full border border-border bg-white shadow-sm">
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
                    <p className="mt-0.5 text-sm font-semibold text-slate-700">{pair.solution.text}</p>
                    <p className="mt-1 text-xs text-slate-500">{pair.solution.detail}</p>
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
