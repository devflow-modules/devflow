import type { Metadata } from "next";
import Link from "next/link";
import { Check, MessageCircle, BarChart3, Users } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";

const baseUrl = "https://devflowlabs.com.br";

const features = [
  {
    icon: MessageCircle,
    title: "Central de conversas",
    description:
      "Todas as conversas em um só lugar. Histórico, tags e filas organizadas.",
  },
  {
    icon: BarChart3,
    title: "Métricas e relatórios",
    description:
      "Volume, tempo de resposta, taxa de automação. Dados para decidir.",
  },
  {
    icon: Users,
    title: "Equipe e handoff",
    description:
      "Distribua conversas entre atendentes. Handoff automático quando o bot não resolve.",
  },
];

const comparisons = [
  "WhatsApp comum: sem filas, sem métricas, sem organização",
  "Software de atendimento: tudo centralizado, mensurável e escalável",
];

export const metadata: Metadata = {
  title: "Software de Atendimento no WhatsApp | Plataforma | DevFlow Labs",
  description:
    "Plataforma de atendimento no WhatsApp com automação, métricas e equipe. Centralize conversas e escale o suporte.",
  keywords: [
    "software atendimento whatsapp",
    "plataforma atendimento whatsapp",
    "sistema atendimento whatsapp",
    "central atendimento whatsapp",
  ],
  alternates: {
    canonical: `${baseUrl}/software-atendimento-whatsapp`,
  },
  openGraph: {
    title: "Software de Atendimento no WhatsApp | DevFlow Labs",
    description:
      "Plataforma de atendimento no WhatsApp com automação, métricas e equipe.",
    url: `${baseUrl}/software-atendimento-whatsapp`,
  },
  twitter: {
    title: "Software Atendimento WhatsApp | DevFlow Labs",
    description:
      "Plataforma de atendimento no WhatsApp com automação, métricas e equipe.",
  },
};

export default function SoftwareAtendimentoWhatsAppPage() {
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
              Software de Atendimento no WhatsApp
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Plataforma completa: automação, central de conversas, métricas e equipe.
              Para quem precisa de controle real da operação.
            </p>
            <div className="mt-8">
              <WhatsAppCta
                label="Conhecer a plataforma"
                size="lg"
                text="Quero saber mais sobre o software de atendimento WhatsApp da DevFlow Labs."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f1f5f9] py-24" aria-labelledby="diferenca-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="diferenca-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Por que um software em vez do WhatsApp comum?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
            Quando o volume cresce, organização e métricas fazem a diferença.
          </p>
          <div className="mx-auto mt-12 max-w-2xl space-y-4">
            {comparisons.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-border p-4",
                  i === 0 ? "bg-muted/50" : "bg-card"
                )}
              >
                {i === 0 ? (
                  <span className="text-muted-foreground">✗</span>
                ) : (
                  <Check className="size-5 shrink-0 text-primary" aria-hidden />
                )}
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24" aria-labelledby="recursos-heading">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2
            id="recursos-heading"
            className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            O que a plataforma entrega
          </h2>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
            {features.map((f) => (
              <article
                key={f.title}
                className={cn(
                  "rounded-xl border border-border bg-card p-6",
                  "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                )}
              >
                <div className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/5">
                  <f.icon className="size-5 text-primary" aria-hidden />
                </div>
                <h3 className="mt-4 font-medium text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.description}</p>
              </article>
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
              Quer ver a plataforma em ação?
            </h2>
            <p className="mt-4 text-slate-600">
              Fala com a gente no WhatsApp e mostraremos como funciona.
            </p>
            <div className="mt-8">
              <WhatsAppCta
                label="Falar no WhatsApp"
                size="lg"
                text="Quero conhecer o software de atendimento WhatsApp da DevFlow Labs."
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
