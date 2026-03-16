import type { Metadata } from "next";
import Link from "next/link";
import { Check, MessageCircle } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

const baseUrl = "https://devflowlabs.com.br";

const problems = [
  {
    title: "Agendamentos e confirmações manuais",
    description:
      "Pacientes ligando para agendar, confirmar ou remarcar. Tudo manual.",
  },
  {
    title: "Perguntas repetidas sobre horários",
    description:
      "Horário de funcionamento, convênios aceitos, documentos — mesma pergunta o dia todo.",
  },
  {
    title: "Recepcionista sobrecarregada",
    description:
      "Tempo da recepção em perguntas que um bot resolve, em vez de atender presencialmente.",
  },
];

const botAnswers = [
  "Agendamento e remarcação",
  "Horário de funcionamento",
  "Convênios aceitos",
  "Documentos necessários",
  "Preparo para exames",
  "Chamada de atendente",
];

const demoMessages = [
  {
    type: "user" as const,
    text: "Quero agendar uma consulta",
    time: "09:15",
  },
  {
    type: "bot" as const,
    text: "Ótimo! Qual especialidade? Temos disponibilidade para esta semana.",
    time: "09:15",
  },
  {
    type: "user" as const,
    text: "Prefiro falar com a recepção",
    time: "09:16",
  },
  {
    type: "bot" as const,
    text: "Conectando você com nossa equipe agora.",
    time: "09:16",
  },
];

function MessageBubble({
  type,
  text,
  time,
}: {
  type: "user" | "bot";
  text: string;
  time: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 max-w-[85%]",
        type === "user" ? "self-end items-end" : "self-start items-start"
      )}
    >
      <div
        className={cn(
          "rounded-2xl px-3 py-2 text-sm",
          type === "user"
            ? "rounded-tr-md bg-muted text-foreground"
            : "rounded-tl-md border border-border bg-card text-foreground"
        )}
      >
        {text}
      </div>
      <span className="text-[10px] text-muted-foreground">{time}</span>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Automação de Atendimento para Clínicas no WhatsApp | DevFlow Labs",
  description:
    "Automatize atendimento da sua clínica no WhatsApp. Agendamentos, confirmações, horários e convênios. Piloto de 7 dias grátis.",
  keywords: [
    "automação whatsapp clínica",
    "chatbot clínica",
    "atendimento automático clínica",
    "agendamento whatsapp clínica",
  ],
  alternates: {
    canonical: `${baseUrl}/automacao-whatsapp-clinica`,
  },
  openGraph: {
    title: "Automação WhatsApp para Clínicas | DevFlow Labs",
    description:
      "Automatize atendimento da sua clínica no WhatsApp. Agendamentos, horários e convênios.",
    url: `${baseUrl}/automacao-whatsapp-clinica`,
  },
};

export default function AutomacaoWhatsAppClinicaPage() {
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
              Automação de atendimento para clínicas no WhatsApp
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Agendamentos, confirmações e perguntas frequentes — respostas
              automáticas 24/7. Sua recepção foca em atender presencialmente.
            </p>
            <div className="mt-8">
              <WhatsAppCta
                label="Quero automatizar minha clínica"
                size="lg"
                text="Quero automatizar o atendimento da minha clínica no WhatsApp."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f1f5f9] py-24" aria-labelledby="problemas-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="problemas-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Dores que a automação resolve
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
            Clínicas que usam WhatsApp sabem: volume de mensagens cresce rápido.
          </p>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
            {problems.map((p) => (
              <article
                key={p.title}
                className={cn(
                  "rounded-xl border border-border bg-card p-6",
                  "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                )}
              >
                <h3 className="font-medium text-foreground">{p.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{p.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24" aria-labelledby="bot-answers-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="bot-answers-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            O que o bot responde automaticamente
          </h2>
          <ul
            className="mx-auto mt-12 flex max-w-2xl flex-wrap justify-center gap-3"
            role="list"
          >
            {botAnswers.map((item) => (
              <li
                key={item}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"
                )}
              >
                <Check className="size-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[#f1f5f9] py-24" aria-labelledby="demo-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="demo-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Exemplo real de conversa
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
            Paciente quer agendar, bot responde. Precisa de atendente? Handoff
            na hora.
          </p>
          <div className="mx-auto mt-12 max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
                <MessageCircle className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">DevFlow Bot</p>
                <p className="text-xs text-primary">online</p>
              </div>
            </div>
            <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
              {demoMessages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  type={msg.type}
                  text={msg.text}
                  time={msg.time}
                />
              ))}
            </div>
          </div>
          <p className="mt-6 text-center">
            <Link
              href="/demo"
              className="text-sm font-medium text-primary hover:underline"
            >
              Simule um atendimento →
            </Link>
          </p>
        </div>
      </section>

      <section className="py-24" aria-labelledby="cta-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
            <h2
              id="cta-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Quer automatizar sua clínica?
            </h2>
            <p className="mt-4 text-slate-600">
              Piloto de 7 dias para testar. Sem compromisso.
            </p>
            <div className="mt-8">
              <WhatsAppCta
                label="Quero automatizar minha clínica"
                size="lg"
                text="Quero automatizar o atendimento da minha clínica no WhatsApp."
              />
            </div>
            <p className="mt-6">
              <Link
                href="/automacao-whatsapp"
                className="text-sm text-slate-600 hover:text-foreground"
              >
                ← Ver automação WhatsApp
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
