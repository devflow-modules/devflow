import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/layout/Section";
import { Calculator } from "lucide-react";

const baseUrl = "https://devflowlabs.com.br";

export const metadata: Metadata = {
  title: "Controle Financeiro Pessoal Online",
  description:
    "Organize suas despesas mensais e controle seu dinheiro com nossa ferramenta gratuita de planejamento financeiro. Receitas, despesas e fluxo do mês.",
  alternates: {
    canonical: `${baseUrl}/ferramentas/financeiro`,
  },
  keywords: [
    "controle financeiro pessoal",
    "organizar despesas",
    "planejamento financeiro",
    "fluxo de caixa pessoal",
    "receitas e despesas",
  ],
  openGraph: {
    title: "Controle Financeiro Pessoal Online | DevFlow Labs",
    description:
      "Organize suas despesas mensais e controle seu dinheiro com nossa ferramenta gratuita de planejamento financeiro.",
    url: `${baseUrl}/ferramentas/financeiro`,
    type: "website",
  },
};

const FAQ = [
  {
    q: "Preciso cadastrar cartão?",
    a: "Não. O uso é grátis e não pedimos cartão.",
  },
  {
    q: "É realmente grátis?",
    a: "Sim. Você pode usar o painel e as ferramentas sem pagar nada.",
  },
  {
    q: "Posso usar no celular?",
    a: "Sim. O site funciona no navegador do celular e do computador. Não precisa instalar app.",
  },
];

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Controle Financeiro Pessoal",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Ferramenta gratuita para organizar receitas, despesas e planejar o mês.",
  url: `${baseUrl}/ferramentas/financeiro`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
};

export default function FinanceiroPage() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />

      <Section aria-label="Hero">
        <div className="mx-auto max-w-2xl">
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10"
            aria-hidden
          >
            <Calculator className="size-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Controle Financeiro Pessoal
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Organize receitas, despesas e planeje o mês. Ferramenta gratuita para
            quem quer clareza sobre o dinheiro sem planilhas que quebram.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="https://financeiro-pi-drab.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Abrir ferramenta
            </a>
            <Link
              href="/ferramentas"
              className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              Ver outras ferramentas
            </Link>
          </div>
        </div>
      </Section>

      <Section alternate aria-labelledby="como-funciona">
        <h2
          id="como-funciona"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          Como usar
        </h2>
        <ol className="mt-4 space-y-3 text-slate-600">
          <li className="flex gap-3">
            <span className="font-semibold text-primary">1.</span>
            Preencha receitas e despesas do mês.
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-primary">2.</span>
            Veja o fluxo e o que sobra no fim do mês.
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-primary">3.</span>
            Crie conta para salvar e repetir quando precisar.
          </li>
        </ol>
      </Section>

      <Section aria-labelledby="relacionado">
        <h2
          id="relacionado"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          Ferramentas relacionadas
        </h2>
        <p className="mt-2 text-slate-600">
          Precisou dividir contas com alguém? Use nossa ferramenta de{" "}
          <a
            href="https://financeiro-pi-drab.vercel.app/ferramentas/divisao-de-contas"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            divisão de contas
          </a>{" "}
          para rateio proporcional por renda.
        </p>
        <Link
          href="/ferramentas"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          ← Voltar ao hub de ferramentas
        </Link>
      </Section>

      <Section alternate aria-labelledby="faq">
        <h2
          id="faq"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          Perguntas frequentes
        </h2>
        <dl className="mt-6 space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-lg border border-border bg-card p-4">
              <dt className="font-medium text-foreground">{item.q}</dt>
              <dd className="mt-1 text-sm text-slate-600">{item.a}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}
