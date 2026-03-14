import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/layout/Section";
import { Calculator, PieChart } from "lucide-react";

const baseUrl = "https://devflowlabs.com.br";

const TOOLS = [
  {
    slug: "financeiro",
    title: "Controle Financeiro",
    description: "Organize receitas e despesas mensais. Planeje o mês, simule cenários e tenha clareza sobre seu dinheiro.",
    href: "/ferramentas/financeiro",
    icon: Calculator,
    external: false,
  },
  {
    slug: "divisao-de-contas",
    title: "Divisão de contas",
    description: "Calcule o rateio de contas para casal, república ou família. Rateio proporcional por renda, sem discussão.",
    href: "https://financeiro-pi-drab.vercel.app/ferramentas/divisao-de-contas",
    icon: PieChart,
    external: true,
  },
] as const;

export const metadata: Metadata = {
  title: "Ferramentas gratuitas",
  description:
    "Ferramentas práticas para organizar finanças, dividir contas e planejar o mês. Use grátis, sem cadastro obrigatório. DevFlow Labs.",
  alternates: {
    canonical: `${baseUrl}/ferramentas`,
  },
  openGraph: {
    title: "Ferramentas gratuitas | DevFlow Labs",
    description:
      "Controle financeiro, divisão de contas e planejamento. Ferramentas práticas e gratuitas.",
    url: `${baseUrl}/ferramentas`,
    type: "website",
  },
};

export default function FerramentasPage() {
  return (
    <div className="min-h-screen">
      <Section aria-label="Hub de ferramentas">
        <div className="mx-auto max-w-2xl text-center">
          <div
            className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary"
            aria-hidden
          />
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ferramentas gratuitas
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Organize suas finanças, divida contas e planeje o mês. Use agora, sem
            cadastro obrigatório.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-2">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const content = (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-6" aria-hidden />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-foreground">
                  {tool.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600">{tool.description}</p>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                  Abrir ferramenta →
                </span>
              </>
            );

            if (tool.external) {
              return (
                <a
                  key={tool.slug}
                  href={tool.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  {content}
                </a>
              );
            }

            return (
              <Link
                key={tool.slug}
                href={tool.href}
                className="group flex flex-col rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                {content}
              </Link>
            );
          })}
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-slate-500">
          Mais ferramentas em breve: calculadora de poupança, planejamento
          financeiro e controle de despesas fixas.
        </p>
      </Section>
    </div>
  );
}
