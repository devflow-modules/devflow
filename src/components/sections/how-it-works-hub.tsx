"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { trackFunnelCtaClick } from "@/lib/analytics";
import {
  HOME_DEMO_CTA_LABEL,
  PRIMARY_CONVERT_CTA_LABEL,
  PRIMARY_CONVERT_HREF,
  PRIMARY_DEMO_HREF,
} from "@/lib/conversion-copy";
const steps = [
  {
    number: "01",
    title: "Diagnóstico da operação",
    description:
      "Mapeamos volume de mensagens, horários críticos, tipos de solicitação, gargalos de resposta e pontos onde vendas ou atendimentos se perdem.",
  },
  {
    number: "02",
    title: "Desenho dos fluxos",
    description:
      "Definimos o que a IA responde sozinha, quando o atendimento vai para uma pessoa, quais filas existem e quais regras de prioridade/SLA fazem sentido.",
  },
  {
    number: "03",
    title: "Implementação técnica",
    description:
      "Configuramos WhatsApp Cloud API oficial, webhooks, inbox multiatendente, automações, handoff humano, tags, fila priorizada e dashboard operacional.",
  },
  {
    number: "04",
    title: "Operação acompanhada",
    description:
      "Com a operação rodando, acompanhamos o que ela mostra, ajustamos fluxos, treinamos a equipe e melhoramos o atendimento com base nesses dados.",
  },
];

export function HowItWorksHub() {
  return (
    <section id="como-funciona-hub" className="df-v2-section bg-[var(--df-v2-surface)]" aria-labelledby="how-it-works-hub-heading">
      <div className="df-v2-container">
        <h2 id="how-it-works-hub-heading" className="df-v2-h2 max-w-[18ch] text-balance">
          Como sua operação de WhatsApp sai do improviso
        </h2>
        <p className="df-v2-lead mt-4 max-w-2xl">
          Diagnóstico, implementação guiada e operação acompanhada para transformar mensagens soltas em um fluxo
          previsível de atendimento e vendas.
        </p>

        <ol className="df-v2-timeline mt-12 list-none border-t border-[var(--df-v2-border)]" aria-label="Etapas do processo consultivo da WhatsApp Platform">
          {steps.map((step) => (
            <li key={step.title} className="border-b border-[var(--df-v2-border)] py-6 lg:border-b-0 lg:border-r lg:px-5 lg:py-8 lg:last:border-r-0">
              <p className="text-sm font-semibold text-[var(--df-v2-brand)]">{step.number}</p>
              <h3 className="df-v2-h3 mt-3">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--df-v2-ink-soft)]">{step.description}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href={PRIMARY_CONVERT_HREF}
            aria-label="Agendar diagnóstico da operação no WhatsApp"
            onClick={() =>
              trackFunnelCtaClick({ cta: "agendar_diagnostico", surface: "how_it_works_primary" })
            }
            className="df-btn-primary min-h-12 px-5 text-sm font-semibold"
          >
            {PRIMARY_CONVERT_CTA_LABEL}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href={PRIMARY_DEMO_HREF}
            aria-label="Ver demonstração guiada de atendimento no WhatsApp"
            onClick={() =>
              trackFunnelCtaClick({ cta: "ver_demo_guiada", surface: "how_it_works_demo" })
            }
            className="df-btn-secondary min-h-12 px-5 text-sm font-semibold"
          >
            {HOME_DEMO_CTA_LABEL}
          </Link>
        </div>
      </div>
    </section>
  );
}
