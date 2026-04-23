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
  "flex h-full flex-col rounded-2xl border border-border bg-card",
  "shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)] transition-all duration-200",
  "hover:-translate-y-0.5 hover:border-slate-300/90 hover:shadow-[0_22px_55px_-20px_rgba(15,23,42,0.22)]"
);

function ProjectCta({ project }: { project: Project }) {
  const isExternal = project.url.startsWith("http");
  const btnClass = cn(
    "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold",
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
    project.highlight && "sm:mt-8 sm:py-3.5 sm:text-base"
  );

  if (isExternal) {
    return (
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(btnClass, "bg-foreground text-background hover:bg-slate-800")}
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
        "bg-primary text-primary-foreground shadow-[0_12px_36px_-10px_rgba(22,163,74,0.45)] hover:brightness-[1.03] active:brightness-[0.98]"
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
              "ring-2 ring-emerald-500/30 [background:linear-gradient(165deg,var(--card)_0%,rgba(236,253,245,0.55)_55%,var(--card)_100%)]"
            )
          : "p-6 sm:p-8",
        project.isExperimental && "border-slate-200/90 bg-slate-50/50"
      )}
    >
      {featured ? (
        <span className="mb-4 inline-flex w-fit items-center rounded-full border border-emerald-600/30 bg-emerald-600/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-900">
          Produto principal
        </span>
      ) : null}
      {project.isExperimental ? (
        <span className="mb-3 inline-flex w-fit items-center rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
          Laboratório
        </span>
      ) : null}

      <h2
        className={cn(
          "font-bold tracking-tight text-foreground",
          featured ? "text-2xl sm:text-3xl" : "text-xl"
        )}
      >
        {project.title}
      </h2>
      <p
        className={cn(
          "font-semibold text-primary",
          featured ? "mt-2 text-base sm:text-lg" : "mt-1 text-sm"
        )}
      >
        {project.tagline}
      </p>
      <p
        className={cn(
          "flex-1 leading-relaxed text-slate-600",
          featured ? "mt-4 text-base sm:max-w-3xl" : "mt-3 text-sm"
        )}
      >
        {project.description}
      </p>
      <div className={cn("flex flex-wrap gap-2", featured ? "mt-5" : "mt-4")}>
        {project.badges.map((badge) => (
          <span
            key={badge}
            className="rounded-md border border-border bg-white/90 px-2 py-0.5 text-xs font-medium text-slate-700"
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
    <div className="mx-auto mt-20 max-w-3xl rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-[0_24px_70px_-28px_rgba(15,23,42,0.2)] sm:px-12 sm:py-12">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90">Próximo passo</p>
      <h2 className="mt-3 text-balance text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        Veja a WhatsApp Platform em ação
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-[0.9375rem]">
        Demo guiada em poucos minutos ou página completa do produto — o mesmo sistema que aparece em operação acima.
      </p>
      <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/demo"
          className={cn(
            "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-primary-foreground",
            "bg-primary shadow-[0_14px_40px_-6px_rgba(22,163,74,0.45)] transition-all hover:brightness-[1.03] sm:min-w-[11rem]"
          )}
        >
          Ver demo
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        <Link
          href="/produtos/whatsapp-platform"
          className={cn(
            "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800",
            "shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 sm:min-w-[11rem]"
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
        <div
          className="absolute -top-32 left-1/2 h-[28rem] w-[120%] -translate-x-1/2 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(34, 197, 94, 0.14) 0%, transparent 55%)",
          }}
        />
      </div>

      <section
        className="py-16 sm:py-20 lg:py-24"
        aria-labelledby="projetos-hero-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <header className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90">
              Ecossistema DevFlow
            </p>
            <h1
              id="projetos-hero-heading"
              className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Produtos e sistemas em operação
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-semibold leading-snug text-foreground sm:text-xl">
              Esses não são apenas projetos. São sistemas reais em operação.
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-[1.05rem]">
              Prioridade explícita: WhatsApp Platform no centro do GTM, Financeiro Casa como produto ativo complementar e experimentação isolada no laboratório.
            </p>
          </header>

          <div className="mx-auto mt-16 max-w-5xl">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Em operação</h2>
            <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-6">
              {operationalProjects.map((project) => (
                <div key={project.id} className={cn(project.highlight && "lg:col-span-2")}>
                  <ProjectCard project={project} />
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-16 max-w-5xl">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Laboratório</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
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
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              ← Voltar ao início
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
