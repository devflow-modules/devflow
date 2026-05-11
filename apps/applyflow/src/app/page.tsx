import { applyFlowButtonClass } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowPrivacyNotice } from "@/components/ui/ApplyFlowPrivacyNotice";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import { HeroProductVisual } from "@/components/landing/hero-product-visual";
import Link from "next/link";

const heroBullets = [
  "Extensão Chrome para LinkedIn Easy Apply.",
  "Autofill assistido — só após o teu clique; sem submissão automática.",
  "Histórico em chrome.storage.local; export JSON quando quiseres.",
  "Dashboard com funil e métricas; demo fictícia incluída.",
  "IA opt-in (tua chave); texto gerado não vai para o histórico.",
  "Sem backend ApplyFlow — dados sob o teu controlo.",
];

const featureCards = [
  {
    title: "Extensão Chrome",
    body: "Parser Easy Apply, job intelligence heurística, safety gate e auditoria — tudo em armazenamento local no browser.",
  },
  {
    title: "Dashboard importável",
    body: "Funil, Recharts e tabela filtrável a partir do JSON que exportas. Ideal para rever o funil sem SaaS no meio.",
  },
  {
    title: "IA opt-in",
    body: "Textos longos só com a tua API no cliente. Desligada por defeito; sem persistência de texto gerado no histórico.",
  },
];

const sectionShell =
  "rounded-[var(--af-radius)] border border-[color:var(--af-border)] bg-[color:var(--af-bg-soft)]/75 p-6 shadow-sm backdrop-blur-sm sm:p-8";

export default function HomePage() {
  return (
    <main className="text-[color:var(--af-text)]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[color:var(--af-border)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-30%,var(--af-glow-hero),transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-20 lg:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(280px,440px)] lg:gap-16 xl:gap-20">
            <div className="text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300/95">
                  DevFlow Labs
                </span>
                <span className="rounded-full border border-zinc-600/50 bg-zinc-900/70 px-3 py-1 text-[11px] font-medium text-zinc-400">
                  Local-first
                </span>
                <span className="rounded-full border border-zinc-600/50 bg-zinc-900/70 px-3 py-1 text-[11px] font-medium text-zinc-400">
                  Privacy-first
                </span>
              </div>

              <h1 className="mt-8 text-5xl font-semibold tracking-tight text-[color:var(--af-text)] sm:text-6xl lg:text-7xl">
                ApplyFlow
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[color:var(--af-text-muted)] sm:text-xl lg:mx-0 lg:max-w-xl">
                Copiloto local-first e privacy-first para o <strong className="text-[color:var(--af-text)]">LinkedIn Easy Apply</strong>.
              </p>

              <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-[15px] lg:mx-0 lg:max-w-2xl">
                Acompanha candidaturas, assiste o preenchimento repetitivo, exporta o histórico e analisa o funil —{" "}
                <strong className="font-medium text-[color:var(--af-text)]">sem</strong> enviar os teus dados para um
                backend ApplyFlow.
              </p>

              <p className="mx-auto mt-4 max-w-xl text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 sm:text-[13px] lg:mx-0">
                Sem auto-submit · TypeScript · JSON sob controlo
              </p>

              <ul className="mx-auto mt-10 grid max-w-2xl list-none gap-x-6 gap-y-3 text-left text-sm text-[color:var(--af-text-muted)] sm:grid-cols-2 sm:text-[15px] lg:mx-0 lg:max-w-3xl">
                {heroBullets.map((line) => (
                  <li key={line} className="flex gap-3">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--af-brand)] shadow-[0_0_8px_rgba(52,211,153,0.65)]"
                      aria-hidden
                    />
                    <span className="leading-snug">{line}</span>
                  </li>
                ))}
              </ul>

              <div className="mx-auto mt-11 flex max-w-2xl flex-col gap-3 sm:flex-row sm:flex-wrap lg:mx-0 lg:max-w-none">
                <Link
                  href="/dashboard"
                  className={applyFlowButtonClass({
                    variant: "primary",
                    size: "lg",
                    className: "w-full min-h-[48px] sm:min-w-[200px] sm:flex-1 sm:shrink-0",
                  })}
                >
                  Abrir dashboard
                </Link>
                <Link
                  href="/dashboard#carregar-demo"
                  className={applyFlowButtonClass({
                    variant: "outlineBrand",
                    size: "lg",
                    className: "w-full min-h-[48px] sm:min-w-[180px] sm:flex-1 sm:shrink-0",
                  })}
                >
                  Carregar demo
                </Link>
                <Link
                  href="/documentacao"
                  className={applyFlowButtonClass({
                    variant: "secondary",
                    size: "lg",
                    className: "w-full min-h-[48px] sm:min-w-[160px] sm:flex-1 sm:shrink-0",
                  })}
                >
                  Ver documentação
                </Link>
                <Link
                  href="/dashboard#como-importar"
                  className={applyFlowButtonClass({
                    variant: "secondary",
                    size: "lg",
                    className: "w-full min-h-[48px] sm:min-w-[160px] sm:flex-1 sm:shrink-0",
                  })}
                >
                  Importar JSON
                </Link>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <HeroProductVisual />
            </div>
          </div>
        </div>
      </section>

      {/* Blocos de conteúdo */}
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:space-y-12 sm:px-6 sm:py-20">
        <ApplyFlowSection
          className={sectionShell}
          eyebrow="Produto"
          title="Problema e solução"
          description={
            <>
              O Easy Apply repete campos, espalha histórico e empurra para ferramentas agressivas. O ApplyFlow é um{" "}
              <strong className="text-[color:var(--af-text)]">copiloto no dispositivo</strong>: extensão e dashboard
              opcional ligados por JSON — sem conta cloud nem servidor no meio da tua pipeline.
            </>
          }
        />

        <ApplyFlowSection
          className={sectionShell}
          eyebrow="Fluxo"
          title="Como funciona"
          description={
            <ol className="list-decimal space-y-3 pl-5 marker:font-medium marker:text-emerald-500/95">
              <li>Configuras o perfil e (opcional) IA nas opções da extensão.</li>
              <li>Numa vaga Easy Apply, o painel classifica campos e propõe respostas.</li>
              <li>Usas copiar ou preencher assistido; o envio continua manual no LinkedIn.</li>
              <li>Guardas no histórico local e exportas JSON para o dashboard quando quiseres métricas.</li>
            </ol>
          }
        />

        <section className={sectionShell}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400/90">Capacidades</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--af-text)] sm:text-3xl">
            O que está incluído
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--af-text-muted)]">
            Três pilares — extensão, dados locais e análise — desenhados para portefólio e uso responsável.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {featureCards.map((f) => (
              <ApplyFlowCard key={f.title} variant="muted" padding="md" className="h-full">
                <h3 className="text-base font-semibold tracking-tight text-[color:var(--af-text)]">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--af-text-muted)]">{f.body}</p>
              </ApplyFlowCard>
            ))}
          </div>
        </section>

        <section id="privacidade" className={sectionShell}>
          <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--af-text)] sm:text-3xl">
            Privacidade e segurança
          </h2>
          <div className="mt-6">
            <ApplyFlowPrivacyNotice />
          </div>
          <ul className="mt-6 grid list-disc gap-3 pl-5 text-sm text-[color:var(--af-text-muted)] marker:text-zinc-600 sm:grid-cols-2">
            <li>Sem backend ApplyFlow a receber o teu histórico de candidaturas.</li>
            <li>Demo estática no mesmo host; sem dados reais embutidos.</li>
            <li className="sm:col-span-2">Export com candidaturas verdadeiras = dado sensível — trata o ficheiro como tal.</li>
          </ul>
        </section>

        <ApplyFlowSection
          className={sectionShell}
          eyebrow="Stack"
          title="Arquitetura do produto"
          description={
            <>
              Monorepo: <strong className="text-[color:var(--af-text)]">applyflow-extension</strong> (MV3),{" "}
              <strong className="text-[color:var(--af-text)]">applyflow</strong> (Next.js),{" "}
              <strong className="text-[color:var(--af-text)]">@devflow/applyflow-core</strong> e{" "}
              <strong className="text-[color:var(--af-text)]">@devflow/applyflow-linkedin</strong>. A ponte para o
              dashboard é <strong className="text-[color:var(--af-text)]">sempre um ficheiro que tu exportas</strong>.
            </>
          }
        >
          <Link href="/documentacao" className="mt-2 inline-flex text-sm font-medium text-emerald-400 hover:text-emerald-300">
            Ver índice da documentação →
          </Link>
        </ApplyFlowSection>

        <ApplyFlowSection
          className={sectionShell}
          eyebrow="Demo"
          title="Experimentar sem dados reais"
          description="No dashboard, Carregar demo mostra métricas e gráficos com candidaturas inteiramente fictícias."
        >
          <Link
            href="/dashboard#carregar-demo"
            className={applyFlowButtonClass({
              variant: "outlineBrand",
              size: "md",
              className: "mt-2 w-full justify-center sm:w-auto",
            })}
          >
            Ir para Carregar demo
          </Link>
        </ApplyFlowSection>

        <ApplyFlowSection
          className={sectionShell}
          title="Roadmap"
          description="Polish, materiais de portefólio e respeito explícito aos termos do LinkedIn. Detalhes em docs/applyflow/ROADMAP.md no repositório."
        >
          <p className="mt-2 text-sm text-[color:var(--af-text-muted)]">
            <Link href="/documentacao" className="font-medium text-emerald-400 hover:text-emerald-300">
              Abrir documentação
            </Link>
          </p>
        </ApplyFlowSection>

        <div className="flex flex-col gap-3 border-t border-[color:var(--af-border)] pt-12 sm:flex-row sm:flex-wrap sm:justify-center">
          <Link href="/dashboard" className={applyFlowButtonClass({ variant: "primary", size: "lg", className: "min-h-[48px] justify-center" })}>
            Abrir dashboard
          </Link>
          <Link
            href="/dashboard#carregar-demo"
            className={applyFlowButtonClass({ variant: "outlineBrand", size: "lg", className: "min-h-[48px] justify-center" })}
          >
            Carregar demo
          </Link>
          <Link href="/documentacao" className={applyFlowButtonClass({ variant: "secondary", size: "lg", className: "min-h-[48px] justify-center" })}>
            Documentação
          </Link>
        </div>
      </div>
    </main>
  );
}
