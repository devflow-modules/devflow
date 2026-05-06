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
    "Separe atendimento, suporte e prospecção no WhatsApp com Inbox unificada, IA assistida, dashboard por canal e operação gerenciada pela DevFlow Labs.",
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "WhatsApp Multi-canal para atendimento e prospecção | DevFlow Labs",
    description:
      "Separe atendimento, suporte e prospecção no WhatsApp com gestão por canal, IA assistida e operação gerenciada.",
    url: pageUrl,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — operação WhatsApp multi-canal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Multi-canal | DevFlow Labs",
    description:
      "Operação WhatsApp com canais separados, Inbox unificada, IA assistida e gestão por perfil.",
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
  "O gestor não consegue ler performance por canal.",
  "O operador responde sem contexto e sem padrão claro.",
  "O histórico vira conversa perdida em vez de inteligência operacional.",
  "IA sem governança cria insegurança para o negócio.",
];

const solutionPillars = [
  "Canais separados por objetivo operacional",
  "Inbox unificada para o time trabalhar com fluidez",
  "Leitura por linha com recorte gerencial",
  "Histórico auditável por canal e por responsável",
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
    description: "Organizamos linha principal e canal de prospecção com regras e contextos próprios.",
  },
  {
    title: "Ativação do WhatsApp",
    description: "Conduzimos o setup técnico e a validação operacional para entrada em produção segura.",
  },
  {
    title: "Configuração de IA assistida",
    description: "Ajustamos tom, regras e limites para apoiar o time sem perder o controle humano.",
  },
  {
    title: "Treinamento da equipe",
    description: "Capacitamos operador e gestor com fluxo prático e leitura dos indicadores principais.",
  },
  {
    title: "Acompanhamento mensal",
    description: "Evoluímos a operação continuamente com suporte e revisão de resultados por canal.",
  },
];

const faqItems: FaqItem[] = [
  {
    q: "Preciso trocar meu número?",
    a: "Não necessariamente. A implantação é desenhada para aproveitar a operação existente e organizar os canais conforme o seu cenário.",
  },
  {
    q: "Serve para equipe pequena?",
    a: "Sim. Equipes pequenas ganham clareza, prioridade e padrão operacional mais rápido quando atendimento e prospecção são separados.",
  },
  {
    q: "A IA responde sozinha?",
    a: "A IA apoia a operação e pode atuar em fluxos definidos, sempre com controle humano e regras de segurança.",
  },
  {
    q: "Dá para separar vendas e suporte?",
    a: "Sim. Esse é um dos pilares do modelo multi-canal: cada frente com objetivo, contexto e leitura próprios.",
  },
  {
    q: "Consigo ver resultados por canal?",
    a: "Sim. A gestão acompanha indicadores por canal, compara desempenho e identifica gargalos com muito mais precisão.",
  },
  {
    q: "O operador vê dados de gestão?",
    a: "Não. As permissões por perfil separam operação e gestão para proteger informações sensíveis do negócio.",
  },
  {
    q: "Como funciona a implantação?",
    a: "Começamos com diagnóstico, configuramos canais e IA, ativamos a operação e seguimos com acompanhamento mensal.",
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
              Separe atendimento e prospecção no WhatsApp sem perder o controle da operação.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Uma operação multi-canal para equipes que vendem, atendem e acompanham leads pelo WhatsApp — com Inbox unificada,
              IA assistida, dashboard por canal e permissões por perfil.
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
              Implantação gerenciada · Multi-canal · IA assistida · Gestão por perfil
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
            description="Uma operação white-label para separar canais, dar previsibilidade ao gestor e ritmo ao time."
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
            description="Cada canal com papel claro para reduzir ruído operacional e melhorar conversão."
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
                <li>- Gestão de oportunidades</li>
              </ul>
            </article>
          </div>
          <p className="mx-auto mt-6 max-w-4xl text-center text-sm font-medium text-foreground">
            Cada canal pode ter contexto, objetivo e leitura gerencial própria.
          </p>
        </div>
      </section>

      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionTitle
            title="Dashboard por canal para decidir com clareza"
            description="A gestão alterna visão geral e recorte por canal para agir com prioridade."
          />
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Visão geral da operação em tempo real",
              "Filtro por canal para comparar frentes",
              "SLA e tempo médio por contexto de atendimento",
              "Leitura de equipe e carga operacional",
              "Funil e evolução por canal",
              "Indicadores de IA para gestão contínua",
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
            description="A IA acelera resposta e padronização, enquanto o time mantém decisão final em pontos críticos."
          />
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
            {[
              "IA apoia respostas e mantém padrão de comunicação",
              "Contexto pode ser ajustado por canal operacional",
              "Gestor acompanha qualidade e uso da IA",
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
              "Gestor acessa dashboard e configurações de gestão",
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
            description="Da estratégia ao acompanhamento mensal, com foco em operação real e resultado."
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
