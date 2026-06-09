import Link from "next/link";
import { ExternalLink, FolderOpen } from "lucide-react";
import { projects } from "@/lib/projects";
import { cn } from "@/lib/utils";

function ProjectThumbnail({ theme }: { theme: "music" | "finance" | "whatsapp" }) {
  if (theme === "whatsapp") {
    return (
      <div className="flex h-24 flex-col justify-end gap-1.5 rounded-lg bg-gradient-to-br from-[color-mix(in_srgb,var(--devflow-brand)_18%,transparent)] to-card/[0.04] p-3">
        <div
          className="ml-auto h-6 w-[68%] rounded-lg rounded-br-sm bg-[color-mix(in_srgb,var(--devflow-brand)_85%,transparent)] shadow-sm"
          aria-hidden
        />
        <div
          className="mr-auto h-6 w-[58%] rounded-lg rounded-bl-sm bg-card shadow-sm ring-1 ring-border"
          aria-hidden
        />
      </div>
    );
  }
  if (theme === "music") {
    return (
      <div className="flex h-24 items-end justify-center gap-1 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 p-4">
        {[40, 60, 45, 80, 55, 70, 50].map((h, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full bg-violet-500/60 transition-transform group-hover:scale-y-110"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="flex h-24 items-end justify-center gap-2 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 p-4">
      <div className="h-8 w-12 rounded bg-accent/40" />
      <div className="h-12 w-12 rounded bg-primary/40" />
      <div className="h-6 w-12 rounded bg-accent/30" />
    </div>
  );
}

export function ProjectsShowcase() {
  return (
    <section
      id="projetos"
      className="relative overflow-hidden py-24"
      aria-labelledby="projects-heading"
    >
      {/* Assinatura visual — grid sutil */}
      <div className="df-decor-grid-mesh pointer-events-none absolute inset-0 -z-10 opacity-[0.03]" />
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-[var(--devflow-brand)]" aria-hidden />
          <h2
            id="projects-heading"
            className="df-text-primary text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Sistemas reais em operação
          </h2>
          <p className="mt-3 df-text-secondary">
            WhatsApp Platform em primeiro plano, financeiro ativo e laboratório separado — o mesmo recorte da página de ecossistema.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <article
              key={project.id}
              className={cn(
                "df-surface-elevated group relative rounded-xl p-6",
                "transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_48px_-20px_rgba(0,0,0,0.32)]",
                project.highlight && "ring-1 ring-[color-mix(in_srgb,var(--devflow-brand)_25%,transparent)]"
              )}
            >
              <div className="absolute right-4 top-4">
                {project.highlight ? (
                  <span className="inline-flex items-center gap-1 rounded-full border df-bg-brand-soft px-2 py-0.5 text-xs font-bold df-status-brand">
                    <span className="size-1.5 rounded-full df-dot-brand" />
                    Principal
                  </span>
                ) : project.isExperimental ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs font-semibold df-text-secondary">
                    Lab
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full df-bg-brand-soft px-2 py-0.5 text-xs font-semibold df-status-brand">
                    <span className="size-1.5 rounded-full df-dot-brand" />
                    Live
                  </span>
                )}
              </div>
              <ProjectThumbnail theme={project.theme} />
              <h3 className="mt-4 font-semibold df-text-primary">{project.title}</h3>
              <p className="mt-1 text-sm font-medium text-accent">{project.tagline}</p>
              <p className="mt-2 text-sm df-text-secondary">{project.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium df-text-secondary"
                  >
                    {badge}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                {project.url.startsWith("/") ? (
                  <Link
                    href={project.url}
                    className={cn(
                      "df-btn-primary df-shadow-cta-soft inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold",
                      "transition-all duration-200"
                    )}
                  >
                    {project.ctaLabel}
                  </Link>
                ) : (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "df-btn-primary df-shadow-cta-soft inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold",
                      "transition-all duration-200"
                    )}
                  >
                    {project.ctaLabel}
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                )}
                <Link
                  href="/projetos"
                  className={cn(
                    "df-btn-secondary inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                    "transition-colors"
                  )}
                >
                  Ver projetos
                </Link>
              </div>
            </article>
          ))}
        </div>

        {projects.length >= 1 && (
          <div className="mt-8 flex justify-center">
            <Link
              href="/projetos"
              className={cn(
                "inline-flex items-center gap-2 text-sm font-medium df-status-brand transition-colors hover:text-[var(--devflow-brand-hover)]"
              )}
            >
              <FolderOpen className="size-4" aria-hidden />
              Ver todos os projetos
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
