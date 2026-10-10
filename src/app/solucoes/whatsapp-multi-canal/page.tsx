import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Bot, LayoutDashboard, MessageSquareText } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { FaqSection, type FaqItem } from "@/components/seo/FaqSection";
import { cn } from "@/lib/utils";

const baseUrl = "https://devflowlabs.com.br";
const pagePath = "/solucoes/whatsapp-multi-canal";
const pageUrl = `${baseUrl}${pagePath}`;
const ogImage = `${baseUrl}/og-devflow.png`;

export const metadata: Metadata = {
  title: "WhatsApp Multi-canal para atendimento e prospecção | DevFlow Labs",
  description:
    "Organize filas e responsáveis para atendimento, suporte e prospecção no WhatsApp. Mais de um número entra na implantação acompanhada.",
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "WhatsApp Multi-canal para atendimento e prospecção | DevFlow Labs",
    description:
      "Filas e responsáveis para diferentes fluxos no WhatsApp, com automação supervisionada e implantação acompanhada.",
    url: pageUrl,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — filas de atendimento no WhatsApp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Multi-canal | DevFlow Labs",
    description:
      "Filas separadas no WhatsApp, inbox compartilhado e papéis de operação e gestão.",
    images: [ogImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const pains = [
  "Tudo cai no mesmo WhatsApp e a operação perde prioridade.",
  "Lead de prospecção se mistura com suporte e atendimento.",
  "O gestor não vê quem está em cada fila.",
  "O operador responde sem contexto e sem padrão claro.",
  "O histórico fica no celular de alguém, em vez de na conversa compartilhada.",
  "IA sem governança cria insegurança para o negócio.",
];

const solutionPillars = [
  "Filas de WhatsApp separadas por objetivo operacional",
  "Inbox compartilhado para a equipe atender com contexto",
  "Cada fluxo pode ter a própria fila",
  "Histórico da conversa fica com o responsável",
  "IA assistida com controle humano",
  "Permissões por perfil para proteger gestão e operação",
];

const implementationSteps = [
  {
    title: "Diagnóstico da operação",
    description: "Mapeamos atendimento, suporte e prospecção para definir desenho de canais e fluxo ideal.",
  },
  {
    title: "Configuração dos canais",
    description: "Se fizer sentido ter mais de um número, a DevFlow configura isso na implantação. Não é um cadastro self-service.",
  },
  {
    title: "Ativação do WhatsApp",
    description: "Apoiamos o setup do WhatsApp Cloud API e a validação do fluxo com a equipe.",
  },
  {
    title: "Configuração de IA assistida",
    description: "Ajustamos tom, regras e limites para apoiar o time sem perder o controle humano.",
  },
  {
    title: "Treinamento da equipe",
    description: "Mostramos à equipe como assumir, transferir e devolver uma conversa.",
  },
  {
    title: "Acompanhamento mensal",
    description: "Depois da ativação, a operação mensal segue com a equipe no inbox.",
  },
];

const faqItems: FaqItem[] = [
  {
    q: "Preciso trocar meu número?",
    a: "Não necessariamente. A implantação é desenhada para aproveitar a operação existente e organizar os canais conforme o seu cenário.",
  },
  {
    q: "Serve para equipe pequena?",
    a: "Sim. Uma equipe pequena já ganha clareza quando atendimento e prospecção ficam em filas diferentes.",
  },
  {
    q: "A IA responde sozinha?",
    a: "Só no que foi permitido, e só quando a automação está ativa. Exceção e contexto seguem para uma pessoa.",
  },
  {
    q: "Dá para separar vendas e suporte?",
    a: "Sim. Vendas e suporte podem ficar em filas diferentes, no mesmo inbox, cada conversa com um responsável.",
  },
  {
    q: "Consigo ver resultados por canal?",
    a: "Dá para ver quem está com a conversa e o que ainda precisa de resposta em cada fila. Não há relatório de tempo médio nem funil por canal.",
  },
  {
    q: "O operador vê dados de gestão?",
    a: "Não. As permissões por perfil separam operação e gestão para proteger informações sensíveis do negócio.",
  },
  {
    q: "Como funciona a implantação?",
    a: "Começamos com diagnóstico, desenhamos as filas de WhatsApp e a automação permitida, ativamos com a equipe e seguimos o acompanhamento.",
  },
  {
    q: "É produto pronto ou projeto sob medida?",
    a: "É uma oferta de implantação gerenciada sobre uma plataforma já validada, adaptada ao contexto operacional da sua empresa.",
  },
];

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      <p className="mt-3 text-muted-foreground">{description}</p>
    </div>
  );
}

export default function WhatsAppMultiCanalPage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-border bg-card py-16 sm:py-20 lg:py-24">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-50" aria-hidden>
          <div className="absolute -top-20 right-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Separe atendimento e prospecção em filas no WhatsApp.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Aqui, multi-canal quer dizer fluxos e, quando a implantação pedir, mais de um número de WhatsApp.
              Não é inbox de Instagram, Messenger ou e-mail. A equipe atende no mesmo inbox, com responsável e histórico.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/demo"
                className={cn(
                  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold",
                  "bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                )}
              >
                Agendar demonstração
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <WhatsAppCta
                label="Falar com a DevFlow Labs"
                ariaLabel="Falar com a DevFlow Labs sobre operação WhatsApp multi-canal"
                size="lg"
                variant="secondary"
                text="Olá, quero conversar sobre a implantação da operação WhatsApp multi-canal da minha empresa."
              />
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Implantação acompanhada · Filas no WhatsApp · Automação no repetitivo · Papéis de operação e gestão
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionTitle
            title="A dor que trava crescimento no WhatsApp"
            description="Quando tudo entra no mesmo fluxo, a operação perde velocidade, contexto e capacidade de decisão."
          />
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pains.map((pain) => (
              <article key={pain} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <p className="text-sm leading-relaxed text-muted-foreground">{pain}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionTitle
            title="Solução DevFlow Labs"
            description="Filas e responsáveis no WhatsApp, para separar atendimento, suporte e prospecção."
          />
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {solutionPillars.map((item) => (
              <div key={item} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <p className="text-sm leading-relaxed text-foreground">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionTitle
            title="Canal principal vs canal de prospecção"
            description="Atendimento e prospecção em filas diferentes, no mesmo inbox de WhatsApp."
          />
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-2">
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">Principal</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>- Atendimento diário de clientes ativos</li>
                <li>- Suporte e dúvidas operacionais</li>
                <li>- Continuidade de relacionamento</li>
              </ul>
            </article>
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground">Canal de prospecção</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>- Leads de campanhas e captação</li>
                <li>- Follow-up comercial estruturado</li>
                <li>- Follow-up na fila, com responsável</li>
              </ul>
            </article>
          </div>
          <p className="mx-auto mt-6 max-w-4xl text-center text-sm font-medium text-foreground">
            Cada fila fica no WhatsApp. Não é inbox de Instagram, Messenger ou e-mail.
          </p>
        </div>
      </section>

      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionTitle
            title="O que a equipe acompanha"
            description="Responsáveis, filas e o que ainda precisa de resposta. Sem tempo médio e sem funil por canal."
          />
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Quem está com a conversa",
              "O que ainda precisa de resposta",
              "Fila de atendimento e fila de prospecção",
              "Histórico compartilhado",
              "Handoff para outra pessoa",
              "Automação só no que foi permitido",
            ].map((item) => (
              <article key={item} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-2">
                  <LayoutDashboard className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionTitle
            title="IA assistida com controle humano"
            description="A automação responde o que foi permitido. Exceção e contexto seguem para uma pessoa."
          />
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
            {[
              "IA apoia respostas e mantém padrão de comunicação",
              "Contexto pode ser ajustado por canal operacional",
              "Com alguém atribuído, a resposta automática fica bloqueada",
            ].map((item) => (
              <article key={item} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-2">
                  <Bot className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionTitle
            title="Segurança por perfil e dados por tenant"
            description="Cada perfil enxerga o que precisa para executar bem seu papel, sem exposição indevida."
          />
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-2">
            {[
              "Operador foca na Inbox e rotina de atendimento",
              "Gestor acompanha responsáveis, filas e a configuração da equipe",
              "Admin da plataforma mantém governança operacional",
              "Filtros e dados respeitam o tenant autenticado",
            ].map((item) => (
              <article key={item} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionTitle
            title="Modelo de implantação gerenciada"
            description="Diagnóstico, desenho dos fluxos e implantação acompanhada."
          />
          <ol className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {implementationSteps.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <FaqSection
        title="FAQ — operação WhatsApp multi-canal"
        items={faqItems}
        pageUrl={pagePath}
        withSchema
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
            <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Vamos organizar sua operação no WhatsApp?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Fale com a DevFlow Labs para desenhar a implantação da sua operação multi-canal.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/demo"
                className={cn(
                  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold",
                  "bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                )}
              >
                Agendar demonstração
                <MessageSquareText className="size-4" aria-hidden />
              </Link>
              <WhatsAppCta
                label="Falar com a DevFlow Labs"
                ariaLabel="Falar com a DevFlow Labs sobre implantação WhatsApp multi-canal"
                size="lg"
                variant="secondary"
                text="Olá, quero agendar uma conversa sobre implantação WhatsApp multi-canal para minha equipe."
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
