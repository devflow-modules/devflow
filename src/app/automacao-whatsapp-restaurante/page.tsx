import type { Metadata } from "next";
import Link from "next/link";
import { Check, MessageCircle } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

const problems = [
  {
    title: "Pedidos repetidos no WhatsApp",
    description:
      "Cardápio, horário de funcionamento, delivery — a mesma pergunta dezenas de vezes por dia.",
  },
  {
    title: "Status do pedido manual",
    description:
      'Cliente perguntando "onde está meu pedido?" e equipe perdendo tempo respondendo.',
  },
  {
    title: "Fila de atendimento desorganizada",
    description:
      "Mensagens se perdendo, clientes esperando, equipe sobrecarregada no horário de pico.",
  },
];

const botAnswers = [
  "Cardápio automático",
  "Horário de funcionamento",
  "Status do pedido",
  "Zona de entrega",
  "Formas de pagamento",
  "Chamada de atendente",
];

const demoMessages = [
  { type: "user" as const, text: "Qual o cardápio de hoje?", time: "12:15" },
  {
    type: "bot" as const,
    text: "Temos frango grelhado, filé ao molho e opção vegana. Quer ver os preços? Posso anotar seu pedido.",
    time: "12:15",
  },
  {
    type: "user" as const,
    text: "Quero falar com alguém",
    time: "12:16",
  },
  {
    type: "bot" as const,
    text: "Conectando você com nossa equipe agora.",
    time: "12:16",
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

const baseUrl = "https://devflowlabs.com.br";

export const metadata: Metadata = {
  title: "Automação de Pedidos no WhatsApp para Restaurantes | DevFlow Labs",
  alternates: {
    canonical: `${baseUrl}/automacao-whatsapp-restaurante`,
  },
  description:
    "Automatize pedidos e atendimento do seu restaurante no WhatsApp. Cardápio automático, status do pedido, delivery. Piloto de 7 dias grátis.",
  keywords: [
    "automação whatsapp restaurante",
    "pedidos whatsapp restaurante",
    "chatbot restaurante delivery",
  ],
  openGraph: {
    title: "Automação WhatsApp para Restaurantes | DevFlow Labs",
    description:
      "Automatize pedidos e atendimento do seu restaurante no WhatsApp. Cardápio, status e delivery.",
    url: "https://devflowlabs.com.br/automacao-whatsapp-restaurante",
  },
};

export default function AutomacaoWhatsAppRestaurantePage() {
  return (
    <main>
      <section
        className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 py-24"
        aria-labelledby="hero-heading"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
            <h1
              id="hero-heading"
              className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Automação de pedidos no WhatsApp para restaurantes
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Cardápio automático, status do pedido, fila de atendimento organizada. Sua equipe foca em cozinhar e entregar.
            </p>
            <div className="mt-8">
              <WhatsAppCta
                label="Quero automatizar meu restaurante"
                size="lg"
                text="Quero automatizar pedidos e atendimento do meu restaurante no WhatsApp."
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
            Restaurantes que usam WhatsApp sabem: pedidos repetidos tomam tempo.
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
          <ul className="mx-auto mt-12 flex max-w-2xl flex-wrap justify-center gap-3" role="list">
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
            Cliente pede cardápio, bot responde. Quer anotar pedido? Tudo automático.
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
                <MessageBubble key={i} type={msg.type} text={msg.text} time={msg.time} />
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
              Quer automatizar seu restaurante?
            </h2>
            <p className="mt-4 text-slate-600">
              Piloto de 7 dias para testar. Cardápio, pedidos e status automáticos.
            </p>
            <div className="mt-8">
              <WhatsAppCta
                label="Quero automatizar meu restaurante"
                size="lg"
                text="Quero automatizar pedidos e atendimento do meu restaurante no WhatsApp."
              />
            </div>
            <p className="mt-6">
              <Link href="/" className="text-sm text-slate-600 hover:text-foreground">
                ← Voltar ao início
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
