import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { projects } from "@/lib/projects";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Projetos e Produtos Desenvolvidos",
  description:
    "Produtos SaaS e soluções digitais desenvolvidas pela DevFlow Labs. Automação, operação e ferramentas de apoio.",
  openGraph: {
    title: "Projetos e Produtos | DevFlow Labs",
    description:
      "Produtos SaaS e soluções digitais desenvolvidas pela DevFlow Labs. Automação, operação e ferramentas de apoio.",
    url: "https://devflowlabs.com.br/projetos",
  },
  twitter: {
    title: "Projetos e Produtos | DevFlow Labs",
    description:
      "Produtos SaaS e soluções digitais desenvolvidas pela DevFlow Labs.",
  },
};

export default function ProjetosPage() {
  return (
    <main>
      <section
        className="py-16 sm:py-20 lg:py-24"
        aria-labelledby="projetos-hero-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1
            id="projetos-hero-heading"
            className="text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Projetos e produtos desenvolvidos
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-center text-slate-600">
            A DevFlow Labs cria produtos próprios e soluções digitais para
            automação, operação e ferramentas de apoio.
          </p>

          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
            {projects.map((project) => (
              <article
                key={project.id}
                className={cn(
                  "rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8",
                  "transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)]"
                )}
              >
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {project.title}
                </h2>
                <p className="mt-1 text-sm font-medium text-accent">
                  {project.tagline}
                </p>
                <p className="mt-3 text-slate-600">{project.description}</p>
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
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "mt-6 inline-flex items-center gap-2 rounded-lg border border-transparent",
                    "bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground",
                    "transition-colors hover:bg-[#16a34a]"
                  )}
                >
                  Abrir aplicação
                  <ExternalLink className="size-4" aria-hidden />
                </a>
              </article>
            ))}
          </div>

          <p className="mx-auto mt-16 max-w-xl text-center text-sm text-slate-600">
            Mais projetos e cases serão adicionados aqui conforme a evolução do
            ecossistema DevFlow.
          </p>
          <p className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-primary transition-colors hover:text-[#16a34a]"
            >
              ← Voltar ao Início
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
