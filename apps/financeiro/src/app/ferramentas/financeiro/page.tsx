import type { Metadata } from "next";
import Link from "next/link";
import { GrowthTrackVisitor } from "@/components/analytics/GrowthTrackVisitor";
import { Section } from "@/components/layout/Section";
import { SimuladorRapidoFinanceiro } from "@/modules/financeiro/components/SimuladorRapidoFinanceiro";
import { LeadCaptureForm } from "@/modules/financeiro/components/LeadCaptureForm";
import { FinanceiroTools } from "@/modules/financeiro/components/FinanceiroTools";

const baseUrl = "https://devflowlabs.com.br";

export const metadata: Metadata = {
  title: "Controle Financeiro Pessoal Online",
  description:
    "Score claro, insights objetivos e checklist mensal: entenda seu financeiro em menos de 1 minuto e saiba o que fazer — sem planilhas complexas.",
  alternates: {
    canonical: `${baseUrl}/ferramentas/financeiro`,
  },
  keywords: [
    "controle financeiro pessoal",
    "organizar despesas",
    "planejamento financeiro",
    "fluxo de caixa pessoal",
    "receitas e despesas",
    "divisão de contas",
    "projeção financeira",
  ],
  openGraph: {
    title: "Controle Financeiro Pessoal Online | DevFlow Labs",
    description:
      "Em menos de 1 minuto você entende seu mês: score, insights e checklist — sem planilhas, sem complexidade.",
    url: `${baseUrl}/ferramentas/financeiro`,
    type: "website",
  },
};

const COMPARISON_ROWS: { common: string; devflow: string }[] = [
  { common: "Mostram dados", devflow: "Interpretam o seu mês" },
  { common: "Exigem análise manual", devflow: "Dizem o que fazer" },
  { common: "Uso esporádico", devflow: "Criam rotina mensal" },
  { common: "Sem direção", devflow: "Score + insights + checklist" },
];

const FAQ = [
  {
    q: "Preciso cadastrar cartão?",
    a: "Não. O uso é grátis e não pedimos cartão.",
  },
  {
    q: "É realmente grátis?",
    a: "Sim. Você pode usar as ferramentas sem pagar nada.",
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
    "Score, insights e checklist: organize receitas e despesas com direção clara, sem planilhas que quebram.",
  url: `${baseUrl}/ferramentas/financeiro`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
};

export default function FinanceiroPage() {
  return (
    <div className="min-h-screen">
      <GrowthTrackVisitor />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />

      <Section id="hero-financeiro" aria-labelledby="financeiro-hero-heading" className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h1
            id="financeiro-hero-heading"
            className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Controle financeiro pessoal
          </h1>
          <p className="mt-5 text-xl font-semibold leading-snug text-foreground sm:text-2xl">
            Em menos de 1 minuto, você entende seu financeiro e sabe exatamente o que fazer.
          </p>
          <p className="mt-4 text-lg text-muted-foreground">
            Score claro, insights objetivos e um checklist que guia seu mês — sem planilhas, sem
            complexidade.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/ferramentas/financeiro/auth"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Entrar ou criar conta
            </Link>
            <Link
              href="/planilha-vs-app-financeiro"
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              Planilha vs aplicativo financeiro
            </Link>
            <Link
              href="/ferramentas"
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              ← Voltar ao hub
            </Link>
          </div>
        </div>
      </Section>

      <Section alternate aria-labelledby="tres-pilares">
        <div className="mx-auto max-w-3xl">
          <h2 id="tres-pilares" className="text-2xl font-semibold tracking-tight text-foreground">
            Três pilares: estado, atenção e ação
          </h2>
          <p className="mt-2 text-muted-foreground">
            No app autenticado, você não fica sozinho com os números — o sistema organiza a leitura e o
            próximo passo.
          </p>
          <ul className="mt-8 grid gap-6 sm:grid-cols-3">
            <li className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">1. Score</p>
              <p className="mt-2 font-medium text-foreground">Estado instantâneo</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Veja em segundos se seu mês está organizado — um número simples, com contexto e explicação.
              </p>
            </li>
            <li className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">2. Insights</p>
              <p className="mt-2 font-medium text-foreground">O que merece atenção</p>
              <p className="mt-2 text-sm text-muted-foreground">
                O sistema aponta o que está errado ou faltando — sem análise manual, sem esforço extra.
              </p>
            </li>
            <li className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">3. Checklist</p>
              <p className="mt-2 font-medium text-foreground">O que fazer agora</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Passos claros para fechar seu mês — progresso visível e acionável.
              </p>
            </li>
          </ul>
        </div>
      </Section>

      <Section aria-labelledby="valor-comparacao">
        <div className="mx-auto max-w-3xl space-y-10">
          <div>
            <h2 id="valor-comparacao" className="sr-only">
              Valor e comparação
            </h2>
            <blockquote className="border-l-4 border-primary pl-5 text-lg font-medium leading-relaxed text-foreground">
              A maioria das ferramentas financeiras mostra números. O Financeiro da DevFlow mostra o que fazer
              com eles.
            </blockquote>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">Ferramentas comuns vs. DevFlow Financeiro</p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th scope="col" className="p-3 font-semibold text-foreground">
                      Ferramentas comuns
                    </th>
                    <th scope="col" className="p-3 font-semibold text-foreground">
                      DevFlow Financeiro
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.common} className="border-b border-border last:border-0">
                      <td className="p-3 text-muted-foreground">{row.common}</td>
                      <td className="p-3 text-foreground">{row.devflow}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Section>

      <Section alternate aria-labelledby="roteiro-demo">
        <div className="mx-auto max-w-3xl">
          <h2 id="roteiro-demo" className="text-2xl font-semibold tracking-tight text-foreground">
            Roteiro de demo (30 a 45 segundos)
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use em vídeo, apresentação ou demo guiada com o dashboard autenticado.
          </p>
          <details className="mt-6 rounded-xl border border-border bg-card p-4">
            <summary className="cursor-pointer text-sm font-semibold text-foreground">
              Ver falas sugeridas passo a passo
            </summary>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Abertura (5s).</span> “Em menos de 1 minuto você
                entende seu financeiro.”
              </li>
              <li>
                <span className="font-medium text-foreground">Score (10s).</span> “Aqui você vê seu score — por
                exemplo, 68%, em progresso.”
              </li>
              <li>
                <span className="font-medium text-foreground">Breakdown (5s).</span> “E você sabe exatamente por
                quê.”
              </li>
              <li>
                <span className="font-medium text-foreground">Insights (10s).</span> “O sistema mostra o que está
                faltando — por exemplo, você ainda não registrou despesas.”
              </li>
              <li>
                <span className="font-medium text-foreground">Checklist (10s).</span> “E aqui está o que você
                precisa fazer para fechar o mês.”
              </li>
              <li>
                <span className="font-medium text-foreground">Fechamento (5s).</span> “Sem planilhas. Sem análise
                manual. Só ação.”
              </li>
            </ol>
          </details>
        </div>
      </Section>

      <Section aria-label="Simulador" className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Experimente abaixo sem cadastro — depois, no app completo, você ganha score, insights e checklist no
            dashboard.
          </p>
          <SimuladorRapidoFinanceiro />
        </div>
      </Section>

      <Section alternate aria-label="Formulário para receber novidades do Financeiro">
        <div className="mx-auto max-w-2xl">
          <LeadCaptureForm
            source="simulator"
            title="Receba novas ferramentas financeiras e melhorias"
            buttonLabel="Quero receber"
          />
        </div>
      </Section>

      <Section aria-labelledby="ferramentas">
        <h2
          id="ferramentas"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          Ferramentas
        </h2>
        <p className="mt-2 text-muted-foreground">
          Use as calculadoras abaixo. Não precisa cadastrar.
        </p>
        <FinanceiroTools />
      </Section>

      <Section alternate aria-labelledby="relacionado">
        <h2
          id="relacionado"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          Ferramentas relacionadas
        </h2>
        <p className="mt-2 text-muted-foreground">
          <Link
            href="/ferramentas/divisao-de-contas"
            className="font-medium text-primary hover:underline"
          >
            Divisão de contas
          </Link>{" "}
          — rateio proporcional por renda para casal, república ou família.
        </p>
        <Link
          href="/ferramentas"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Ver todas as ferramentas
        </Link>
      </Section>

      <Section aria-labelledby="faq">
        <h2
          id="faq"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          Perguntas frequentes
        </h2>
        <dl className="mt-6 space-y-4">
          {FAQ.map((item) => (
            <div
              key={item.q}
              className="rounded-lg border border-border bg-card p-4"
            >
              <dt className="font-medium text-foreground">{item.q}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{item.a}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section alternate aria-labelledby="early-access">
        <div className="mx-auto max-w-xl">
          <LeadCaptureForm
            source="early_access"
            title="Estamos lançando novos recursos do Financeiro DevFlow"
            description="Entre na lista de acesso antecipado"
            buttonLabel="Quero participar"
            variant="footer"
          />
        </div>
      </Section>
    </div>
  );
}
