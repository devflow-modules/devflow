import type { Metadata } from "next";
import Link from "next/link";
import { Check, MessageCircle } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const problems = [
  {
    title: "Perguntas repetidas",
    description:
      "Entrega, horário, pagamento e pedidos: a mesma pergunta dezenas de vezes por dia.",
  },
  {
    title: "Equipe ocupada com o básico",
    description:
      "Tempo da equipe em respostas que poderiam ser automáticas, em vez de vender e operar.",
  },
  {
    title: "Sem controle do que foi resolvido",
    description:
      "Difícil saber o que o bot resolveu e o que precisou de atendente — e se está funcionando.",
  },
];

const botAnswers = [
  "Entrega",
  "Horário de funcionamento",
  "Formas de pagamento",
  "Localização",
  "Perguntas frequentes",
  "Chamada de atendente",
];

const humanCases = [
  "Troca ou devolução",
  "Cliente pede atendente",
  "Situações que exigem análise",
];

const demoMessages = [
  { type: "user" as const, text: "A entrega chega hoje?", time: "14:32" },
  {
    type: "bot" as const,
    text: "Temos motoboy até as 18h e app de delivery. Qual opção você prefere?",
    time: "14:32",
  },
  {
    type: "user" as const,
    text: "Prefiro falar com um atendente",
    time: "14:33",
  },
  {
    type: "bot" as const,
    text: "Conectando você com nossa equipe agora.",
    time: "14:33",
  },
];

const faqItems = [
  {
    q: "Preciso trocar de número?",
    a: "Não. O bot usa o mesmo número que você já usa no WhatsApp Business.",
  },
  {
    q: "O bot responde sozinho sempre?",
    a: "Ele responde o que você configurar (entrega, horário, pagamento etc.). Quando o cliente pede atendente ou o caso exige, encaminha para sua equipe.",
  },
  {
    q: "Funciona para delivery?",
    a: "Sim. Você configura horários, zonas e regras. O bot informa e, se precisar, chama humano.",
  },
  {
    q: "Como começa?",
    a: "Você fala com a gente no WhatsApp, alinhamos como vai funcionar e em poucos dias o bot está no ar. Piloto de 7 dias para testar.",
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
  title: "Solução para Tabacarias | Automação WhatsApp",
  description:
    "Atendimento automático para tabacaria no WhatsApp. Respostas para entrega, horário e pagamento. Piloto de 7 dias. DevFlow Labs.",
  openGraph: {
    title: "Solução para Tabacarias | DevFlow Labs",
    description:
      "Atendimento automático para tabacaria no WhatsApp. Respostas para entrega, horário e pagamento. Piloto de 7 dias.",
    url: "https://devflowlabs.com.br/segmentos/tabacarias",
  },
  twitter: {
    title: "Solução para Tabacarias | DevFlow Labs",
    description:
      "Atendimento automático para tabacaria no WhatsApp. Piloto de 7 dias.",
  },
};

export default function TabacariasPage() {
  return (
    <main>
      {/* 1. Hero nichado */}
      <section
        className="py-16 sm:py-20 lg:py-24"
        aria-labelledby="tabacarias-hero-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1
              id="tabacarias-hero-heading"
              className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              Atendimento automático para tabacaria no WhatsApp
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Respostas automáticas para entrega, horário e pagamento. Sua equipe
              foca em vender e operar.
            </p>
            <div
              className={cn(
                "mt-6 inline-flex rounded-2xl border border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground"
              )}
            >
              Atendimento automático para perguntas repetidas
            </div>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <WhatsAppCta
                label="Testar 7 dias"
                size="lg"
                text="Quero testar os 7 dias grátis para tabacaria."
              />
              <Link
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-12 rounded-2xl border border-border px-5 text-base font-medium",
                  "bg-background text-foreground transition-colors hover:bg-muted"
                )}
              >
                Falar no WhatsApp
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Problemas da operação */}
      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="problemas-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="problemas-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Dores da operação de tabacaria
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Se você vive isso, automação com controle faz diferença.
          </p>
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3 sm:gap-6">
            {problems.map((p) => (
              <article
                key={p.title}
                className={cn(
                  "rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-border/80 hover:bg-muted/20"
                )}
              >
                <h3 className="font-medium text-foreground">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {p.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. O que o bot responde */}
      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="bot-answers-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="bot-answers-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            O que o bot responde
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Exemplos do que você pode automatizar.
          </p>
          <ul
            className="mx-auto mt-12 flex max-w-2xl flex-wrap justify-center gap-3"
            role="list"
          >
            {botAnswers.map((item) => (
              <li
                key={item}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm"
                )}
              >
                <Check className="size-4 shrink-0 text-foreground" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Quando chama humano */}
      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="human-cases-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="human-cases-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Quando chama humano
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Nos casos que exigem atendente, o bot encaminha direto para sua
            equipe.
          </p>
          <ul
            className="mx-auto mt-12 flex max-w-2xl flex-wrap justify-center gap-3"
            role="list"
          >
            {humanCases.map((item) => (
              <li
                key={item}
                className={cn(
                  "inline-flex items-center rounded-2xl border border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground"
                )}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. Mini demo */}
      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="demo-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="demo-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Fluxo na prática
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Exemplo realista de conversa no WhatsApp.
          </p>
          <div
            className={cn(
              "mx-auto mt-12 max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm"
            )}
          >
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-full border border-border bg-muted">
                <MessageCircle className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  DevFlow Bot
                </p>
                <p className="text-xs text-muted-foreground">Online</p>
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
        </div>
      </section>

      {/* 5b. Prova visual / Métricas */}
      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="metrics-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="metrics-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Controle do atendimento em um só lugar
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Veja o que foi resolvido automaticamente e o que precisou de
            atendente.
          </p>

          {/* Grid de métricas */}
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3 sm:gap-6">
            <div
              className={cn(
                "rounded-2xl border border-border bg-card p-6 shadow-sm"
              )}
            >
              <p className="text-sm font-medium text-muted-foreground">
                Mensagens recebidas
              </p>
              <p className="mt-2 text-3xl font-semibold text-foreground">287</p>
            </div>
            <div
              className={cn(
                "rounded-2xl border border-border bg-card p-6 shadow-sm"
              )}
            >
              <p className="text-sm font-medium text-muted-foreground">
                Resolvidas automaticamente
              </p>
              <p className="mt-2 text-3xl font-semibold text-foreground">176</p>
            </div>
            <div
              className={cn(
                "rounded-2xl border border-border bg-card p-6 shadow-sm"
              )}
            >
              <p className="text-sm font-medium text-muted-foreground">
                Encaminhadas para atendente
              </p>
              <p className="mt-2 text-3xl font-semibold text-foreground">111</p>
            </div>
          </div>

          {/* Painel dashboard simulado */}
          <div
            className={cn(
              "mx-auto mt-8 max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
            )}
          >
            <p className="text-xs text-muted-foreground/80">
              Exemplo ilustrativo de visualização da operação
            </p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Visão do painel
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Inbound
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">287</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  últimas 24h
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Handoff
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">111</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  para atendente
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Horário de pico
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  14h–18h
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">hoje</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Taxa de automação
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  61,3%
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  resolvido pelo bot
                </p>
              </div>
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Operação com métricas, handoff e visão real do atendimento.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Oferta piloto */}
      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="oferta-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="oferta-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Oferta piloto para tabacarias
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Ideal para tabacarias que querem reduzir o atendimento repetitivo sem
            perder controle da operação.
          </p>
          <div
            className={cn(
              "mx-auto mt-12 max-w-md rounded-2xl border-2 border-border bg-card p-8 shadow-sm"
            )}
          >
            <p className="text-3xl font-semibold text-foreground">R$ 297/mês</p>
            <ul className="mt-6 space-y-2" role="list">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="size-4 shrink-0 text-foreground" />
                Até 5.000 mensagens
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="size-4 shrink-0 text-foreground" />
                Métricas e relatórios
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="size-4 shrink-0 text-foreground" />
                Handoff para equipe humana
              </li>
            </ul>
            <div className="mt-8">
              <WhatsAppCta
                label="Quero testar na minha tabacaria"
                size="lg"
                text="Quero testar o piloto na minha tabacaria."
                className="w-full justify-center"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 7. CTA final */}
      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="cta-final-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              "mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12"
            )}
          >
            <h2
              id="cta-final-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Vamos conversar?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Fala com a gente no WhatsApp e veja como começar em poucos dias.
            </p>
            <div className="mt-8">
              <WhatsAppCta
                label="Falar no WhatsApp"
                size="lg"
                text="Quero saber mais sobre a solução para tabacaria."
              />
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ */}
      <section
        className="border-t border-border py-16 sm:py-20"
        aria-labelledby="faq-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="faq-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Perguntas frequentes
          </h2>
          <div className="mx-auto mt-12 max-w-2xl space-y-4">
            {faqItems.map((item) => (
              <article
                key={item.q}
                className={cn(
                  "rounded-2xl border border-border bg-card p-6 shadow-sm"
                )}
              >
                <h3 className="font-medium text-foreground">{item.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </article>
            ))}
          </div>
          <p className="mt-8 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              ← Voltar ao Início
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
