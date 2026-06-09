import Link from "next/link";
import { ArrowRight, ClipboardList, GitBranch, Settings2, LineChart } from "lucide-react";
import {
  PRIMARY_CONVERT_CTA_LABEL,
  PRIMARY_CONVERT_HREF,
  PRIMARY_DEMO_CTA_LABEL,
  PRIMARY_DEMO_HREF,
} from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: ClipboardList,
    number: "01",
    title: "Diagnóstico da operação",
    description:
      "Mapeamos volume de mensagens, horários críticos, tipos de solicitação, gargalos de resposta e pontos onde vendas ou atendimentos se perdem.",
  },
  {
    icon: GitBranch,
    number: "02",
    title: "Desenho dos fluxos",
    description:
      "Definimos o que a IA responde sozinha, quando o atendimento vai para uma pessoa, quais filas existem e quais regras de prioridade/SLA fazem sentido.",
  },
  {
    icon: Settings2,
    number: "03",
    title: "Implementação técnica",
    description:
      "Configuramos WhatsApp Cloud API oficial, webhooks, inbox multiatendente, automações, handoff humano, tags, fila priorizada e dashboard operacional.",
  },
  {
    icon: LineChart,
    number: "04",
    title: "Operação acompanhada",
    description:
      "Com a operação rodando, acompanhamos métricas reais, ajustamos fluxos, treinamos a equipe e melhoramos o atendimento com base nos dados.",
  },
];

export function HowItWorksHub() {
  return (
    <section
      id="como-funciona-hub"
      className="border-y df-border-brand bg-[var(--devflow-surface)] py-16 sm:py-20"
      aria-labelledby="how-it-works-hub-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="how-it-works-hub-heading"
            className="df-text-primary text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Como sua operação de WhatsApp sai do improviso
          </h2>
          <p className="df-text-secondary mt-4 text-base leading-relaxed sm:text-lg">
            Diagnóstico, implementação guiada e operação acompanhada para transformar mensagens soltas em um fluxo
            previsível de atendimento e vendas.
          </p>
        </div>

        <ol
          className="mx-auto mt-12 grid max-w-5xl list-none gap-6 sm:grid-cols-2 xl:max-w-none xl:grid-cols-4"
          aria-label="Etapas do processo consultivo da WhatsApp Platform"
        >
          {steps.map((step, index) => (
            <li key={step.title} className="min-w-0">
              <article
                className={cn(
                  "relative h-full rounded-2xl border border-border bg-card p-7",
                  "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                )}
              >
                {index < steps.length - 1 && (
                  <div
                    className="absolute -right-3 top-10 hidden h-0.5 w-6 bg-gradient-to-r from-primary/30 to-transparent xl:block"
                    aria-hidden
                  />
                )}

                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/5">
                    <step.icon className="size-5 text-primary" aria-hidden />
                  </div>
                  <span className="text-2xl font-bold text-primary/20" aria-hidden>
                    {step.number}
                  </span>
                </div>

                <h3 className="df-text-primary mt-4 font-semibold">{step.title}</h3>
                <p className="df-text-secondary mt-2 text-sm leading-relaxed">{step.description}</p>
              </article>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href={PRIMARY_CONVERT_HREF}
            aria-label="Agendar diagnóstico da operação no WhatsApp"
            className={cn(
              "df-btn-primary inline-flex max-w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-center text-sm font-bold leading-snug",
              "df-shadow-cta-soft transition-all hover:scale-[1.02] sm:px-7 sm:text-base"
            )}
          >
            {PRIMARY_CONVERT_CTA_LABEL}
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
          <Link
            href={PRIMARY_DEMO_HREF}
            aria-label="Ver demonstração guiada de atendimento no WhatsApp"
            className="df-btn-secondary inline-flex max-w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-center text-sm font-semibold leading-snug transition-colors sm:px-7 sm:text-base"
          >
            {PRIMARY_DEMO_CTA_LABEL}
          </Link>
        </div>
      </div>
    </section>
  );
}
