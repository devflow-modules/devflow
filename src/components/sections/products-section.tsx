"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { trackEcosystemLinkClick, trackToolCardClick } from "@/lib/analytics";

const products = [
  {
    id: "financeiro",
    title: "Sistema Financeiro",
    description: "Receitas, despesas e fechamento mensal, separado da operação de atendimento.",
    href: "/ferramentas/financeiro",
    tool: true,
  },
  {
    id: "products_hub",
    title: "Catálogo de produtos",
    description: "O que a DevFlow oferece hoje, com o próximo passo de cada produto.",
    href: "/produtos",
    tool: false,
  },
] as const;

export function ProductsSection() {
  return (
    <section id="produtos" className="bg-[var(--df-v2-surface-muted)] pb-12 pt-2 sm:pb-16" aria-labelledby="products-heading">
      <div className="df-v2-container">
        <h2 id="products-heading" className="text-xl font-semibold tracking-tight text-[var(--df-v2-ink)] sm:text-2xl">
          Outros produtos DevFlow
        </h2>
        <ul className="mt-6 divide-y divide-[var(--df-v2-border)] border-y border-[var(--df-v2-border)]" role="list">
          {products.map((product) => (
            <li key={product.title}>
              <Link
                href={product.href}
                onClick={() => {
                  if (product.tool) trackToolCardClick(product.id);
                  trackEcosystemLinkClick({ item: product.id, surface: "home_products_section" });
                }}
                className="flex items-center justify-between gap-4 py-4"
              >
                <span>
                  <span className="block text-base font-semibold text-[var(--df-v2-ink)]">{product.title}</span>
                  <span className="mt-1 block text-sm text-[var(--df-v2-muted)]">{product.description}</span>
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
