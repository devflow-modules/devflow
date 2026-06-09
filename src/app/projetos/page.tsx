import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { projects, type Project } from "@/lib/projects";
import { cn } from "@/lib/utils";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

export const metadata: Metadata = {
  title: "Produtos e sistemas em operação",
  description:
    "WhatsApp Platform como produto principal, Financeiro Casa em produção e FunkLab como laboratório — sistemas reais, prioridade explícita.",
  alternates: {
    canonical: `${baseUrl}/projetos`,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "Produtos e sistemas em operação | DevFlow Labs",
    description:
      "Ecossistema DevFlow: inbox e automação no WhatsApp em primeiro plano, financeiro ativo e exploração técnica separada.",
    url: `${baseUrl}/projetos`,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — ecossistema de produtos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ecossistema DevFlow | Produtos em operação",
    description:
      "WhatsApp Platform, Financeiro Casa e laboratório — sistemas reais, prioridade explícita.",
    images: [ogImage],
  },
};

const operationalProjects = projects.filter((p) => !p.isExperimental);
const experimentalProjects = projects.filter((p) => p.isExperimental);

const cardBase = cn(
  "df-surface-elevated flex h-full flex-col rounded-2xl",
  "shadow-[0_18px_50px_-24px_rgba(0,0,0,0.28)] transition-all duration-200",
  "hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--devflow-brand)_28%,transparent)] hover:shadow-[0_22px_55px_-20px_rgba(0,0,0,0.35)]"
);

function ProjectCta({ project }: { project: Project }) {
  const isExternal = project.url.startsWith("http");
  const btnClass = cn(
    "mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold",
    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    project.highlight && "sm:mt-8 sm:py-3.5 sm:text-base"
  );

  if (isExternal) {
    return (
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(btnClass, "df-btn-secondary")}
      >
        {project.ctaLabel}
        <ExternalLink className="size-4 shrink-0 opacity-90" aria-hidden />
      </a>
    );
  }

  return (
    <Link
      href={project.url}
      className={cn(
        btnClass,
        "df-btn-primary df-shadow-cta-soft active:scale-[0.98]"
      )}
    >
      {project.ctaLabel}
      <ArrowRight className="size-4 shrink-0" aria-hidden />
    </Link>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const featured = project.highlight;

  return (
    <article
      className={cn(
        cardBase,
        featured
          ? cn(
              "p-8 sm:p-10 lg:p-12",
              "ring-1 ring-[color-mix(in_srgb,var(--devflow-brand)_30%,transparent)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--devflow-brand)_16%,transparent),transparent_35%),linear-gradient(135deg,var(--devflow-surface-elevated),var(--devflow-background))]"
            )
          : "p-6 sm:p-8",
        project.isExperimental &&
          "border-dashed df-border-dark bg-card/80 opacity-90 hover:opacity-100 hover:shadow-md"
      )}
    >
      {featured ? (
        <span className="mb-4 inline-flex w-fit items-center rounded-full border df-bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wide df-status-brand sm:text-[0.8125rem]">
          Produto principal
        </span>
      ) : null}
      {project.isExperimental ? (
        <span className="mb-3 inline-flex w-fit items-center rounded-full border df-border-brand bg-muted/30 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide df-text-secondary">
          Laboratório
        </span>
      ) : null}

      <h2
        className={cn(
          "font-bold tracking-tight df-text-primary",
          featured ? "text-2xl sm:text-3xl" : "text-xl"
        )}
      >
        {project.title}
      </h2>
      <p
        className={cn(
          "font-semibold df-status-brand",
          featured ? "mt-2 text-lg sm:text-xl" : "mt-1 text-base sm:text-[1.0625rem]"
        )}
      >
        {project.tagline}
      </p>
      <p
        className={cn(
          "df-text-secondary flex-1 leading-relaxed",
          featured ? "mt-4 text-base sm:max-w-3xl sm:text-lg" : "mt-3 text-[0.9375rem] sm:text-base"
        )}
      >
        {project.description}
      </p>
      <div className={cn("flex flex-wrap gap-2", featured ? "mt-5" : "mt-4")}>
        {project.badges.map((badge) => (
          <span
            key={badge}
            className="df-text-secondary rounded-md border df-border-dark bg-muted/40 px-2 py-0.5 text-[0.8125rem] font-medium sm:text-sm"
          >
            {badge}
          </span>
        ))}
      </div>
      <ProjectCta project={project} />
    </article>
  );
}

function EndCtaBlock() {
  return (
    <div className="df-surface-elevated mx-auto mt-20 max-w-3xl rounded-2xl px-6 py-10 text-center shadow-[0_24px_70px_-28px_rgba(0,0,0,0.35)] sm:px-12 sm:py-12">
      <p className="text-sm font-bold uppercase tracking-[0.2em] df-status-brand sm:text-xs">Próximo passo</p>
      <h2 className="mt-3 text-balance text-xl font-bold tracking-tight df-text-primary sm:text-2xl">
        Veja a WhatsApp Platform em ação
      </h2>
      <p className="df-text-secondary mx-auto mt-3 max-w-lg text-[0.9375rem] leading-relaxed sm:text-base">
        Demo guiada em poucos minutos ou página completa do produto — o mesmo sistema que aparece em operação acima.
      </p>
      <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/demo"
          className={cn(
            "df-btn-primary h-12 flex-1 rounded-xl px-6 text-sm font-semibold",
            "df-shadow-cta sm:min-w-[11rem]"
          )}
        >
          Ver demo
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        <Link
          href="/produtos/whatsapp-platform"
          className={cn(
            "df-btn-secondary h-12 flex-1 rounded-xl px-6 text-sm font-semibold sm:min-w-[11rem]"
          )}
        >
          Ver produto principal
          <ArrowRight className="size-4 opacity-70" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

export default function ProjetosPage() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="df-decor-radial-brand-soft absolute -top-32 left-1/2 h-[28rem] w-[120%] -translate-x-1/2 opacity-40" />
      </div>

      <section
        className="py-16 sm:py-20 lg:py-24"
        aria-labelledby="projetos-hero-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <header className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] df-status-brand">
              Ecossistema DevFlow
            </p>
            <h1
              id="projetos-hero-heading"
              className="mt-3 text-balance text-3xl font-bold tracking-tight df-text-primary sm:text-4xl"
            >
              Sistemas reais em operação no WhatsApp e financeiro
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-semibold leading-snug df-text-primary sm:text-xl">
              Esses não são apenas projetos. São sistemas reais em operação.
            </p>
            <p className="df-text-secondary mx-auto mt-4 max-w-2xl text-[1.0625rem] leading-relaxed sm:text-[1.05rem]">
              Prioridade explícita: WhatsApp Platform no centro do GTM, Financeiro Casa como produto ativo complementar e experimentação isolada no laboratório.
            </p>
          </header>

          <div className="mx-auto mt-16 max-w-5xl">
            <h2 className="df-text-muted text-base font-bold uppercase tracking-[0.18em] sm:text-sm">Em operação</h2>
            <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-6">
              {operationalProjects.map((project) => (
                <div key={project.id} className={cn(project.highlight && "lg:col-span-2")}>
                  <ProjectCard project={project} />
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-16 max-w-5xl">
            <h2 className="df-text-muted text-base font-bold uppercase tracking-[0.18em] sm:text-sm">Laboratório</h2>
            <p className="df-text-secondary mt-2 max-w-2xl text-[0.9375rem] leading-relaxed sm:text-sm">
              Fora do roadmap comercial: transparência técnica sem diluir foco de produto nem de suporte.
            </p>
            <div className="mt-6 grid max-w-2xl gap-6">
              {experimentalProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>

          <EndCtaBlock />

          <p className="mt-14 text-center">
            <Link
              href="/"
              className="text-sm font-semibold df-status-brand underline-offset-4 hover:underline"
            >
              ← Voltar ao início
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
