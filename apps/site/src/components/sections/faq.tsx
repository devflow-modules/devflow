"use client";

import { ChevronDown } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

const faqItems = [
  {
    question: "Como funciona o robô?",
    answer:
      "O robô recebe mensagens no WhatsApp, identifica a intenção e responde automaticamente. Quando o cliente pede para falar com um atendente, fazemos o handoff para sua equipe na hora.",
  },
  {
    question: "Preciso de API do WhatsApp?",
    answer:
      "Sim. Usamos a WhatsApp Cloud API (oficial da Meta). A DevFlow gerencia a integração — você não precisa se preocupar com configurações técnicas.",
  },
  {
    question: "Funciona para qualquer negócio?",
    answer:
      "Funciona melhor para negócios que recebem muitas mensagens repetidas: restaurantes, tabacarias, lojas, clínicas. Se sua equipe repete as mesmas respostas todo dia, a automação ajuda.",
  },
  {
    question: "O WhatsApp pode bloquear?",
    answer:
      "Não, quando usado corretamente. Usamos a API oficial da Meta, em conformidade com as políticas. O robô não envia spam nem mensagens em massa não solicitadas.",
  },
  {
    question: "O cliente percebe que é automação?",
    answer:
      "As mensagens são escritas para soar naturais. Se o cliente preferir falar com humano, é só pedir — o handoff transfere na hora para sua equipe.",
  },
  {
    question: "Posso transferir para atendente?",
    answer:
      "Sim. O handoff é configurável. Quando o cliente pede ou o fluxo identifica necessidade, a conversa vai direto para um atendente humano.",
  },
  {
    question: "Preciso trocar meu número?",
    answer:
      "Não. Usamos o mesmo número que você já tem no WhatsApp Business. A automação roda em paralelo ao atendimento humano.",
  },
  {
    question: "Posso começar pequeno?",
    answer:
      "Sim. Temos plano Starter e piloto de 7 dias grátis. Você testa com volume real antes de escalar.",
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
    <section
      id="faq"
      className="py-24"
      aria-labelledby="faq-heading"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div
            className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary"
            aria-hidden
          />
          <h2
            id="faq-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Perguntas frequentes
          </h2>
          <p className="mt-3 df-text-secondary">
            Dúvidas comuns sobre a automação de atendimento no WhatsApp.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-2xl space-y-2">
          {faqItems.map((item, i) => (
            <details
              key={i}
              className="group rounded-xl border border-border bg-card [&[open]]:border-primary/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 font-medium text-foreground transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180 text-muted-foreground" />
              </summary>
              <p className="border-t border-border px-4 py-3 df-text-secondary">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
        <div className="mx-auto mt-12 max-w-md text-center">
          <p className="text-sm font-medium text-foreground">Ainda tem dúvidas?</p>
          <div className="mt-3">
            <WhatsAppCta
              label="Quero tirar dúvidas no WhatsApp"
              size="default"
              text="Olá, tenho dúvidas sobre a automação da DevFlow."
            />
          </div>
        </div>
      </div>
    </section>
  );
}
