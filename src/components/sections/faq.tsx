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
      "A entrega é consultiva: diagnóstico da operação, desenho dos fluxos, implementação guiada, treinamento e acompanhamento inicial com base nas métricas reais.",
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
    <section id="faq" className="py-24" aria-labelledby="faq-heading">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="faq-heading"
            className="df-text-primary text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Perguntas frequentes
          </h2>
          <p className="df-text-secondary mt-3 leading-relaxed">
            Objeções comuns sobre operação de atendimento e vendas no WhatsApp com a DevFlow Labs.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-2xl space-y-2">
          {faqItems.map((item) => (
            <details
              key={item.question}
              className="group rounded-xl border border-border bg-card [&[open]]:border-primary/30"
            >
              <summary className="df-text-primary flex cursor-pointer list-none items-center justify-between rounded-xl px-4 py-4 font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown className="df-text-secondary size-5 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="df-text-secondary border-t border-border px-4 py-3 leading-relaxed">
                {item.answer}
              </p>
            </details>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-md text-center">
          <p className="text-sm font-medium text-foreground">Ainda tem dúvidas sobre a operação no WhatsApp?</p>
          <div className="mt-3">
            <WhatsAppCta
              label={QUICK_WHATSAPP_CTA_LABEL}
              ariaLabel="Falar no WhatsApp com a DevFlow Labs"
              size="default"
              text="Olá, tenho dúvidas sobre implementar atendimento e vendas no WhatsApp com a DevFlow."
            />
          </div>
        </div>
      </div>
    </section>
  );
}
