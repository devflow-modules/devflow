"use client";

import { ChevronDown } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { QUICK_WHATSAPP_CTA_LABEL } from "@/lib/conversion-copy";

const faqItems = [
  {
    question: "Preciso trocar meu número de WhatsApp?",
    answer:
      "Não necessariamente. No diagnóstico, avaliamos o cenário atual do número, a estrutura da conta Meta/WhatsApp Business e a melhor forma de configurar a operação com segurança.",
  },
  {
    question: "É WhatsApp oficial ou gambiarra com QR Code?",
    answer:
      "A proposta é trabalhar com WhatsApp Cloud API oficial, webhooks e estrutura rastreável. Não é automação baseada em número espelhado ou solução frágil dependente de celular logado.",
  },
  {
    question: "A IA responde tudo sozinha?",
    answer:
      "Não. A IA entra no repetitivo: dúvidas frequentes, triagem, status, links e orientações iniciais. Quando a conversa exige negociação, exceção ou contexto humano, o fluxo faz handoff para a equipe.",
  },
  {
    question: "Minha equipe consegue atender junto?",
    answer:
      "Sim. A operação é pensada para inbox multiatendente, fila, responsáveis, status das conversas e visão do que está parado, em atendimento ou resolvido.",
  },
  {
    question: "Vocês só entregam o sistema ou ajudam a implementar?",
    answer:
      "A entrega é consultiva: diagnóstico da operação, desenho dos fluxos, implementação guiada, treinamento e acompanhamento inicial com base no que a operação mostrar.",
  },
  {
    question: "Para quais negócios isso faz sentido?",
    answer:
      "Faz sentido para negócios que recebem volume relevante de mensagens no WhatsApp: restaurantes, delivery, lojas, clínicas, serviços locais, eventos, suporte e times comerciais.",
  },
  {
    question: "Quanto tempo leva para colocar no ar?",
    answer:
      "Depende do escopo e da situação atual da conta, mas o processo começa com diagnóstico e pode evoluir para um piloto guiado com os principais fluxos antes de expandir a operação.",
  },
  {
    question: "O que eu ganho além de respostas automáticas?",
    answer:
      "Você ganha operação: fila, prioridade, handoff humano, histórico, dashboard, SLA e clareza sobre onde o atendimento trava e onde a venda pode estar sendo perdida.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export function Faq() {
  return (
    <section id="faq" className="df-v2-section bg-[var(--df-v2-surface)]" aria-labelledby="faq-heading">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="df-v2-container">
        <h2 id="faq-heading" className="df-v2-h2">
          Perguntas frequentes
        </h2>
        <p className="df-v2-lead mt-4 max-w-2xl">
          Objeções comuns sobre operação de atendimento e vendas no WhatsApp com a DevFlow Labs.
        </p>

        <div className="mt-10 max-w-3xl border-t border-[var(--df-v2-border)]">
          {faqItems.map((item) => (
            <details key={item.question} className="group border-b border-[var(--df-v2-border)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-base font-semibold text-[var(--df-v2-ink)] [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown className="size-4 shrink-0 text-[var(--df-v2-muted)] group-open:rotate-180" />
              </summary>
              <p className="pb-5 text-sm leading-relaxed text-[var(--df-v2-ink-soft)]">{item.answer}</p>
            </details>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-md text-center">
          <p className="text-sm font-medium text-foreground">Ainda tem dúvidas sobre a operação no WhatsApp?</p>
          <div className="mt-3">
            <WhatsAppCta
              label={QUICK_WHATSAPP_CTA_LABEL}
              ariaLabel="Falar no WhatsApp com a DevFlow Labs"
              variant="secondary"
              size="default"
              trackingSource="faq_whatsapp"
              trackFunnel
              text="Olá, tenho dúvidas sobre implementar atendimento e vendas no WhatsApp com a DevFlow."
            />
          </div>
        </div>
      </div>
    </section>
  );
}
