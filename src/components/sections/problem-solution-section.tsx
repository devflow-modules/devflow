import { MessageCircle, Wallet, Database, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const pairs = [
  {
    problem: {
      icon: MessageCircle,
      text: "Atendimento no WhatsApp desorganizado",
      detail: "Mensagens sem resposta, clientes esperando horas, equipe sobrecarregada",
    },
    solution: {
      label: "WhatsApp Platform",
      text: "Automação 24/7 com handoff humano",
      detail: "Bot responde na hora, encaminha para equipe quando necessário",
      color: "text-primary",
      bg: "bg-primary/5 border-primary/20",
    },
  },
  {
    problem: {
      icon: Wallet,
      text: "Controle financeiro em planilhas",
      detail: "Dados espalhados, sem visão clara do saldo, erros manuais constantes",
    },
    solution: {
      label: "Sistema Financeiro",
      text: "Controle centralizado e inteligente",
      detail: "Dashboard em tempo real, categorias, recorrência e fechamento mensal",
      color: "text-blue-600",
      bg: "bg-blue-500/5 border-blue-500/20",
    },
  },
  {
    problem: {
      icon: Database,
      text: "Dados de empresas difíceis de acessar",
      detail: "Consultas lentas, informações desatualizadas, múltiplos sites para checar",
    },
    solution: {
      label: "Ferramentas Integradas",
      text: "Dados em segundos, sem complicação",
      detail: "CNPJ, divisão de contas e muito mais — prontos para usar agora",
      color: "text-orange-500",
      bg: "bg-orange-500/5 border-orange-500/20",
    },
  },
];

export function ProblemSolutionSection() {
  return (
    <section
      id="problema-solucao"
      className="py-24 bg-white"
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
          <p className="mt-3 text-slate-600">
            Cada dor aqui embaixo tem resposta direta — ferramenta ou produto.
          </p>
        </div>

        {/* Pares problema → solução */}
        <div className="mt-12 space-y-6">
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
