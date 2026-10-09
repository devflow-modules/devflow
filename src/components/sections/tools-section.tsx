"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { trackEcosystemLinkClick, trackToolCardClick } from "@/lib/analytics";

const tools = [
  {
    id: "divisao",
    title: "Divisão de contas",
    description: "Rateio simples no browser, sem instalar.",
    href: "/ferramentas/divisao-de-contas",
  },
  {
    id: "cnpj",
    title: "Consulta CNPJ",
    description: "Dados públicos da empresa, direto da Receita.",
    href: "/ferramentas/consulta-cnpj",
  },
] as const;

export function ToolsSection() {
  return (
    <section id="ferramentas" className="bg-[var(--df-v2-surface-muted)] py-10 sm:py-12" aria-labelledby="tools-heading">
      <div className="df-v2-container">
        <p className="text-[13px] font-semibold text-[var(--df-v2-muted)]">Explore também</p>
        <h2 id="tools-heading" className="mt-2 text-xl font-semibold tracking-tight text-[var(--df-v2-ink)] sm:text-2xl">
          Ferramentas gratuitas
        </h2>
        <ul className="mt-6 divide-y divide-[var(--df-v2-border)] border-y border-[var(--df-v2-border)]" role="list">
          {tools.map((tool) => (
            <li key={tool.id}>
              <Link
                href={tool.href}
                onClick={() => {
                  trackToolCardClick(tool.id);
                  trackEcosystemLinkClick({ item: tool.id, surface: "home_tools_section" });
                }}
                className="group flex items-center justify-between gap-4 py-4 text-left"
              >
                <span>
                  <span className="block text-base font-semibold text-[var(--df-v2-ink)]">{tool.title}</span>
                  <span className="mt-1 block text-sm text-[var(--df-v2-muted)]">{tool.description}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-[var(--df-v2-muted)]" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
