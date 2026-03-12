import type { Metadata } from "next";
import Link from "next/link";
import { Check, MessageCircle } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

const baseUrl = "https://devflowlabs.com.br";

const benefits = [
  "Respostas 24 horas, 7 dias por semana",
  "Handoff para atendente humano quando preciso",
  "Integração oficial com Meta/WhatsApp",
  "Métricas e relatórios em tempo real",
];

const useCases = [
  "Perguntas frequentes (FAQ)",
  "Status de pedidos e entregas",
  "Agendamentos",
  "Catálogo de produtos",
  "Transferência para humano",
];

export const metadata: Metadata = {
  title: "Chatbot para WhatsApp | Bot de Atendimento | DevFlow Labs",
  description:
    "Chatbot WhatsApp para empresas. Automatize atendimento com bot inteligente, handoff humano e métricas. Piloto grátis.",
  keywords: [
    "chatbot whatsapp",
    "bot para whatsapp atendimento",
    "chatbot whatsapp empresa",
    "bot atendimento whatsapp",
  ],
  alternates: {
    canonical: `${baseUrl}/chatbot-whatsapp`,
  },
  openGraph: {
    title: "Chatbot para WhatsApp | DevFlow Labs",
    description:
      "Chatbot WhatsApp para empresas. Automatize atendimento com bot inteligente e handoff humano.",
    url: `${baseUrl}/chatbot-whatsapp`,
  },
  twitter: {
    title: "Chatbot para WhatsApp | DevFlow Labs",
    description:
      "Chatbot WhatsApp para empresas. Automatize atendimento com bot inteligente e handoff humano.",
  },
};

export default function ChatbotWhatsAppPage() {
  return (
    <main>
      <section
        className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 py-24"
        aria-labelledby="hero-heading"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div
              className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary"
              aria-hidden
            />
            <h1
              id="hero-heading"
              className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Chatbot para WhatsApp
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Bot de atendimento que responde clientes automaticamente e transfere
              para humano quando precisa. Vale a pena? Sim — quando feito direito.
            </p>
            <div className="mt-8">
              <WhatsAppCta
                label="Quero um chatbot no WhatsApp"
                size="lg"
                text="Quero saber mais sobre chatbot para WhatsApp da DevFlow Labs."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f1f5f9] py-24" aria-labelledby="beneficios-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="beneficios-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Por que usar um chatbot no WhatsApp?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
            Clientes esperam resposta rápida. Um bot entrega isso sem sobrecarregar
            sua equipe.
          </p>
          <ul className="mx-auto mt-12 grid max-w-2xl gap-4 sm:grid-cols-2" role="list">
            {benefits.map((item) => (
              <li
                key={item}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                )}
              >
                <Check className="size-5 shrink-0 text-primary" aria-hidden />
                <span className="font-medium text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-24" aria-labelledby="usos-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="usos-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            O que o chatbot pode fazer
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
            Casos de uso que automatizam a maior parte do atendimento.
          </p>
          <div className="mx-auto mt-12 flex max-w-2xl flex-wrap justify-center gap-3">
            {useCases.map((item) => (
              <div
                key={item}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"
                )}
              >
                <MessageCircle className="size-4 shrink-0 text-primary" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f1f5f9] py-24" aria-labelledby="cta-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
            <h2
              id="cta-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Quer um chatbot para seu WhatsApp?
            </h2>
            <p className="mt-4 text-slate-600">
              Piloto de 7 dias para testar. Sem compromisso.
            </p>
            <div className="mt-8">
              <WhatsAppCta
                label="Falar no WhatsApp"
                size="lg"
                text="Quero um chatbot para WhatsApp na minha empresa."
              />
            </div>
            <p className="mt-6">
              <Link
                href="/automacao-whatsapp"
                className="text-sm text-slate-600 hover:text-foreground"
              >
                ← Ver automação completa
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
