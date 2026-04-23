import Link from "next/link";
import { ExternalLink, FolderOpen } from "lucide-react";
import { projects } from "@/lib/projects";
import { cn } from "@/lib/utils";

function ProjectThumbnail({ theme }: { theme: "music" | "finance" | "whatsapp" }) {
  if (theme === "whatsapp") {
    return (
      <div className="flex h-24 flex-col justify-end gap-1.5 rounded-lg bg-gradient-to-br from-emerald-500/18 to-slate-900/[0.04] p-3">
        <div
          className="ml-auto h-6 w-[68%] rounded-lg rounded-br-sm bg-emerald-500/85 shadow-sm"
          aria-hidden
        />
        <div
          className="mr-auto h-6 w-[58%] rounded-lg rounded-bl-sm bg-white shadow-sm ring-1 ring-slate-200/90"
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
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.8) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(15, 23, 42, 0.8) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2
            id="projects-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Sistemas reais em operação
          </h2>
          <p className="mt-3 text-slate-600">
            WhatsApp Platform em primeiro plano, financeiro ativo e laboratório separado — o mesmo recorte da página de ecossistema.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <article
              key={project.id}
              className={cn(
                "group relative rounded-xl border border-border bg-card p-6",
                "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
                project.highlight && "ring-1 ring-emerald-500/25"
              )}
            >
              <div className="absolute right-4 top-4">
                {project.highlight ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/25 bg-emerald-600/10 px-2 py-0.5 text-xs font-bold text-emerald-900">
                    <span className="size-1.5 rounded-full bg-emerald-600" />
                    Principal
                  </span>
                ) : project.isExperimental ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    Lab
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Live
                  </span>
                )}
              </div>
              <ProjectThumbnail theme={project.theme} />
              <h3 className="mt-4 font-semibold text-foreground">{project.title}</h3>
              <p className="mt-1 text-sm font-medium text-accent">{project.tagline}</p>
              <p className="mt-2 text-sm text-slate-600">{project.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-md border border-border bg-white px-2 py-0.5 text-xs font-medium text-slate-700"
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
                      "inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-transparent",
                      "bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground",
                      "transition-all duration-200 hover:bg-[#16a34a]"
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
                      "inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-transparent",
                      "bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground",
                      "transition-all duration-200 hover:bg-[#16a34a]"
                    )}
                  >
                    {project.ctaLabel}
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                )}
                <Link
                  href="/projetos"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm font-semibold",
                    "bg-white text-foreground transition-colors hover:bg-[#f1f5f9]"
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
                "inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-[#16a34a]"
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
