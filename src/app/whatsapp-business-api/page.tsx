import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Server, Shield, Workflow } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { RelatedLinks } from "@/components/shared/related-links";
import { cn } from "@/lib/utils";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

const pillars = [
  {
    icon: Server,
    title: "Mensagens via infraestrutura oficial",
    description:
      "A Cloud API da Meta recebe e entrega mensagens com webhooks e políticas de uso — o que muda na prática é previsibilidade, auditoria e caminho de escala quando o volume cresce.",
  },
  {
    icon: Workflow,
    title: "Automação ≠ substituir o humano",
    description:
      "Fluxos automáticos resolvem triagem, confirmações e perguntas repetidas. Quando o cliente precisa de negociação ou exceção, o handoff leva a conversa para o inbox humano com contexto.",
  },
  {
    icon: Shield,
    title: "Conformidade e reputação do número",
    description:
      "Opt-in, templates para mensagens proativas e limites de qualidade existem por um motivo: proteger o número da empresa e a experiência do cliente. Quem ignora isso paga em bloqueio ou fila.",
  },
];

const faqItems = [
  {
    q: "WhatsApp Business App e API oficial são a mesma coisa?",
    a: "Não. O app no celular atende micro negócios; a API (Cloud API) integra sistemas, filas, CRM e operação multiagente. Se você precisa de inbox compartilhado, métricas e automação estável, o caminho é API + produto em cima dela.",
  },
  {
    q: "Preciso de BSP para usar a API?",
    a: "A Cloud API pode ser acessada diretamente pela Meta ou via parceiros certificados, conforme seu modelo de contrato e suporte. O ponto importante é: quem opera precisa domínio técnico de webhooks, tokens e políticas de mensagem.",
  },
  {
    q: "O que são message templates?",
    a: "São modelos aprovados para iniciar conversa ou retomar após a janela de 24h, em categorias definidas pela Meta. Marketing e utilidade têm regras diferentes — planejar isso evita surpresa na taxa de entrega.",
  },
  {
    q: "Como a DevFlow Labs se encaixa?",
    a: "O foco do produto é operação: inbox, automação, triagem e visão do que está acontecendo no WhatsApp. A demo guiada mostra o fluxo; a página do produto detalha posicionamento e próximos passos comerciais.",
  },
];

export const metadata: Metadata = {
  title: "WhatsApp Business API (oficial): guia prático para operação",
  description:
    "Cloud API, webhooks, templates e handoff humano — o que muda quando você sai do atendimento manual e precisa escalar com controle. Demo guiada e produto DevFlow.",
  alternates: {
    canonical: `${baseUrl}/whatsapp-business-api`,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "WhatsApp Business API | Operação, webhooks e automação",
    description:
      "Entenda a API oficial da Meta no contexto de inbox, automação e escala — sem promessa vazia, com próximo passo claro.",
    url: `${baseUrl}/whatsapp-business-api`,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — WhatsApp Business API e operação",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Business API | DevFlow Labs",
    description:
      "Cloud API, templates e operação: guia curto para quem precisa escalar atendimento no WhatsApp.",
    images: [ogImage],
  },
};

export default function WhatsappBusinessApiPage() {
  return (
    <main>
      <section className="py-16 sm:py-20 lg:py-24" aria-labelledby="waba-hero-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Cloud API · Meta · operação
            </p>
            <h1
              id="waba-hero-heading"
              className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              WhatsApp Business API: o que muda na operação (e o que não muda)
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Esta página é um mapa rápido para quem pesquisa &quot;API oficial&quot;, &quot;Cloud API&quot; ou &quot;integrar
              WhatsApp&quot; e precisa alinhar expectativa técnica com atendimento real — fila, SLA e time humano.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/demo"
                className={cn(
                  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold sm:w-auto",
                  "bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                )}
              >
                Ver demo
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <WhatsAppCta
                label="Falar com especialista"
                ariaLabel="Falar com especialista sobre WhatsApp Business API"
                size="lg"
                text="Quero entender WhatsApp Business API e operação com a DevFlow — falar com especialista."
                className="w-full justify-center sm:w-auto"
              />
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              <Link href="/produtos/whatsapp-platform" className="font-medium text-primary underline-offset-4 hover:underline">
                Ver WhatsApp Platform
              </Link>
              <span className="mx-2 text-border" aria-hidden>
                ·
              </span>
              <Link href="/precos" className="font-medium text-primary underline-offset-4 hover:underline">
                Preços
              </Link>
              <span className="mx-2 text-border" aria-hidden>
                ·
              </span>
              <Link href="/como-funciona" className="font-medium text-primary underline-offset-4 hover:underline">
                Como funciona
              </Link>
              <span className="mx-2 text-border" aria-hidden>
                ·
              </span>
              <Link href="/automacao-whatsapp" className="font-medium text-primary underline-offset-4 hover:underline">
                Automação no WhatsApp
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border py-16 sm:py-20" aria-labelledby="waba-context-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="waba-context-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Por que a API existe e quando faz sentido
          </h2>
          <div className="mx-auto mt-10 max-w-3xl space-y-4 text-muted-foreground">
            <p>
              A <strong className="text-foreground">WhatsApp Business Platform</strong> (incluindo Cloud API) existe para
              que empresas integrem mensagens a sistemas próprios ou a plataformas como a nossa — com filas, permissões e
              histórico centralizado. Não é um &quot;atalho&quot; para disparo em massa sem opt-in: a política da Meta é
              parte do produto.
            </p>
            <p>
              Se o seu gargalo é <strong className="text-foreground">tempo de primeira resposta</strong>, perda de lead
              fora do horário ou falta de visão do que a equipe está respondendo, a API resolve a camada de transporte;
              quem resolve a operação é o conjunto inbox + regras + métricas — é aí que entra o{" "}
              <Link href="/produtos/whatsapp-platform" className="font-medium text-primary underline-offset-4 hover:underline">
                WhatsApp Platform
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border py-16 sm:py-20" aria-labelledby="waba-pillars-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="waba-pillars-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Três pilares antes de escolher fornecedor
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Critérios úteis para comparar propostas sem cair em checklist genérico.
          </p>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
              <article
                key={p.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-border/80 hover:bg-muted/20"
              >
                <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-muted/50">
                  <Icon className="size-5 text-foreground" aria-hidden />
                </div>
                <h3 className="mt-4 font-medium text-foreground">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
              </article>
            );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-16 sm:py-20" aria-labelledby="waba-next-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="waba-next-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Próximo passo honesto
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            Se você ainda não viu o fluxo ponta a ponta, a{" "}
            <Link href="/demo" className="font-medium text-primary underline-offset-4 hover:underline">
              demo guiada
            </Link>{" "}
            mostra triagem e handoff em minutos. Se já está maduro tecnicamente,{" "}
            <Link href="/precos" className="font-medium text-primary underline-offset-4 hover:underline">
              preços e planos
            </Link>{" "}
            e a página do produto fecham o contexto comercial.
          </p>
          <ul className="mx-auto mt-8 max-w-lg space-y-2" role="list">
            {["Webhook estável e idempotência de eventos", "Janela de 24h vs templates", "Inbox com filas e ownership"].map(
              (item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
                  <span>{item}</span>
                </li>
              )
            )}
          </ul>
        </div>
      </section>

      <section className="border-t border-border py-16 sm:py-20" aria-labelledby="waba-faq-heading">
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
          <h2 id="waba-faq-heading" className="text-center text-xl font-semibold text-foreground sm:text-2xl">
            Perguntas frequentes
          </h2>
          <div className="mt-8 space-y-3">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-card px-4 py-3 shadow-sm open:bg-muted/20"
              >
                <summary className="cursor-pointer list-none text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-2">
                    {item.q}
                    <span className="shrink-0 text-muted-foreground group-open:rotate-180 motion-safe:transition-transform">
                      ▼
                    </span>
                  </span>
                </summary>
                <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-16 sm:py-20" aria-labelledby="waba-cta-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-10">
            <h2 id="waba-cta-heading" className="text-xl font-semibold text-foreground sm:text-2xl">
              Quer validar encaixe com sua operação?
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Demo primeiro (objetivo: ver fluxo). Especialista depois (objetivo: encaixe e rollout).
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/demo"
                className={cn(
                  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold",
                  "bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                )}
              >
                Ver demo
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <WhatsAppCta
                label="Falar com especialista"
                size="lg"
                text="Li sobre WhatsApp Business API e quero alinhar com minha operação — falar com especialista DevFlow."
                className="justify-center"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6 lg:px-8">
        <RelatedLinks variant="default" title="Explore o ecossistema" />
      </div>
    </main>
  );
}
