import Link from "next/link";
import { ArrowRight, X, Check, AlertTriangle } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import {
  PRIMARY_CONVERT_CTA_LABEL,
  PRIMARY_CONVERT_HREF,
  QUICK_WHATSAPP_CTA_LABEL,
} from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

const problems = [
  "Mensagens importantes se perdem no volume",
  "Cliente espera resposta e procura outro fornecedor",
  "Equipe responde manualmente as mesmas dúvidas todos os dias",
  "Ninguém sabe exatamente o que está parado, atrasado ou em risco",
  "Falta histórico, fila, prioridade e métrica",
];

const solutions = [
  "IA responde dúvidas repetitivas 24h",
  "Handoff leva a conversa para um humano quando precisa",
  "Inbox multiatendente organiza a operação",
  "SLA e fila priorizada mostram o que exige atenção",
  "Dashboard dá visibilidade para decidir com dados",
];

export function ProblemSolutionSection() {
  return (
    <section
      id="problema-solucao"
      className="border-y df-border-brand bg-[var(--devflow-surface)] py-24 sm:py-28"
      aria-labelledby="problem-solution-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="problem-solution-heading"
            className="df-text-primary text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Seu WhatsApp não precisa depender do improviso
          </h2>
          <p className="df-text-secondary mt-3 text-base leading-relaxed sm:text-lg">
            Quando tudo fica no celular, na memória da equipe ou em conversas soltas, o atendimento atrasa e a
            venda esfria.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-2 lg:gap-10">
          <article
            className="rounded-2xl border df-bg-danger-soft p-6 sm:p-8"
            aria-labelledby="problem-block-heading"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl df-bg-danger-soft">
                <AlertTriangle className="size-5 df-status-danger" aria-hidden />
              </div>
              <h3 id="problem-block-heading" className="df-text-primary text-lg font-bold">
                O problema
              </h3>
            </div>
            <p className="df-text-secondary mt-3 text-sm leading-relaxed">
              WhatsApp desorganizado gera demora, mensagem perdida, equipe sobrecarregada e venda escapando.
            </p>
            <ul className="mt-5 space-y-3" role="list">
              {problems.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <X className="mt-0.5 size-4 shrink-0 df-status-danger" aria-hidden />
                  <span className="df-text-primary text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article
            className="rounded-2xl border df-bg-brand-soft p-6 sm:p-8"
            aria-labelledby="solution-block-heading"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl df-bg-brand-soft">
                <Check className="size-5 df-status-brand" aria-hidden />
              </div>
              <h3 id="solution-block-heading" className="df-text-primary text-lg font-bold">
                A solução
              </h3>
            </div>
            <p className="df-text-secondary mt-3 text-sm leading-relaxed">
              IA no repetitivo, humano no que importa — com fila priorizada, SLA e dashboard operacional.
            </p>
            <ul className="mt-5 space-y-3" role="list">
              {solutions.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 df-status-success" aria-hidden />
                  <span className="df-text-primary text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <p className="df-text-primary mx-auto mt-10 max-w-xl text-center text-base font-semibold leading-relaxed sm:text-lg">
          Menos mensagem perdida. Mais resposta no tempo certo. Mais venda preservada.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={PRIMARY_CONVERT_HREF}
            aria-label="Agendar diagnóstico da operação no WhatsApp"
            className={cn(
              "df-btn-primary inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold sm:w-auto sm:min-w-[14rem]",
              "df-shadow-cta focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            )}
          >
            {PRIMARY_CONVERT_CTA_LABEL}
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
          <WhatsAppCta
            label={QUICK_WHATSAPP_CTA_LABEL}
            ariaLabel="Falar no WhatsApp com a DevFlow Labs"
            variant="secondary"
            size="lg"
            className="w-full justify-center sm:w-auto sm:min-w-[14rem]"
            text="Olá, vim pelo site. Quero falar sobre organizar atendimento e vendas no WhatsApp com a DevFlow."
          />
        </div>
      </div>
    </section>
  );
}
