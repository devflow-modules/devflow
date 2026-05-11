import { applyFlowButtonClass } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowPrivacyNotice } from "@/components/ui/ApplyFlowPrivacyNotice";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import Link from "next/link";

const messagePoints = [
  "Extensão Chrome para LinkedIn Easy Apply.",
  "Autofill assistido — preenchimento só após o teu clique; sem submissão automática.",
  "IA opt-in para respostas longas (a tua chave; sem persistir texto gerado no histórico).",
  "Histórico de candidaturas em chrome.storage.local.",
  "Dashboard analítico importável (JSON local + demo fictícia).",
  "Privacidade local-first — sem backend ApplyFlow nem envio do teu histórico.",
];

const featureCards = [
  {
    title: "Chrome Extension",
    body: "Parser Easy Apply, job intelligence heurística, safety gate e auditoria — dados em chrome.storage.local.",
  },
  {
    title: "Dashboard importável",
    body: "Funil, métricas Recharts e tabela filtrável a partir do JSON que exportas. Demo fictícia incluída.",
  },
  {
    title: "IA opt-in",
    body: "Textos longos só com a tua API no cliente. Desligada por defeito; nada de histórico com texto gerado persistido.",
  },
];

export default function HomePage() {
  return (
    <main className="bg-[color:var(--af-bg)] text-[color:var(--af-text)]">
      <section className="border-b border-[color:var(--af-border)] bg-gradient-to-b from-[color:var(--af-bg)] via-[color:var(--af-bg)] to-[color:var(--af-bg-soft)] px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-emerald-400/90">DevFlow Labs</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[color:var(--af-text)] sm:text-6xl">
            ApplyFlow
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[color:var(--af-text-muted)] sm:text-xl">
            Copiloto local-first para candidaturas no LinkedIn.
          </p>
          <p className="mx-auto mt-4 max-w-lg text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 sm:text-[13px]">
            Local-first · Sem auto-submit · Easy Apply · TypeScript
          </p>

          <ul className="mx-auto mt-10 max-w-lg list-none space-y-3 text-left text-sm text-[color:var(--af-text-muted)] sm:text-[15px]">
            {messagePoints.map((line) => (
              <li key={line} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--af-brand)]" aria-hidden />
                <span className="leading-relaxed">{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-11 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link href="/dashboard" className={applyFlowButtonClass({ variant: "primary", size: "lg" })}>
              Abrir dashboard
            </Link>
            <Link href="/dashboard#carregar-demo" className={applyFlowButtonClass({ variant: "outlineBrand", size: "lg" })}>
              Carregar demo
            </Link>
            <Link href="/documentacao" className={applyFlowButtonClass({ variant: "secondary", size: "lg" })}>
              Ver documentação
            </Link>
            <Link href="/dashboard#como-importar" className={applyFlowButtonClass({ variant: "secondary", size: "lg" })}>
              Importar JSON
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-14 px-4 py-14 sm:space-y-20 sm:py-20">
        <ApplyFlowSection
          eyebrow="Produto"
          title="Problema e solução"
          description={
            <>
              O Easy Apply repete campos, espalha histórico e empurra para ferramentas agressivas. O ApplyFlow é um{" "}
              <strong className="text-[color:var(--af-text)]">copiloto no dispositivo</strong>: extensão + dashboard opcional
              ligados por JSON — sem conta cloud nem servidor no meio da tua pipeline.
            </>
          }
        />

        <ApplyFlowSection
          eyebrow="Fluxo"
          title="Como funciona"
          description={
            <ol className="list-decimal space-y-2 pl-5 marker:text-emerald-500/90">
              <li>Configuras o perfil e (opcional) IA nas opções da extensão.</li>
              <li>Numa vaga Easy Apply, o painel classifica campos e propõe respostas.</li>
              <li>Usas copiar ou preencher assistido; o envio continua manual no LinkedIn.</li>
              <li>Guardas no histórico local e exportas JSON para o dashboard quando quiseres métricas.</li>
            </ol>
          }
        />

        <section>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-400/85">Capacidades</p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--af-text)]">O que está incluído</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-1 sm:gap-5">
            {featureCards.map((f) => (
              <ApplyFlowCard key={f.title} variant="muted" padding="md">
                <h3 className="text-base font-semibold text-[color:var(--af-text)]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--af-text-muted)]">{f.body}</p>
              </ApplyFlowCard>
            ))}
          </div>
        </section>

        <section id="privacidade">
          <h2 className="text-xl font-semibold text-[color:var(--af-text)]">Privacidade e segurança</h2>
          <div className="mt-5">
            <ApplyFlowPrivacyNotice />
          </div>
          <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-[color:var(--af-text-muted)] marker:text-zinc-600">
            <li>Sem backend ApplyFlow a receber o teu histórico de candidaturas.</li>
            <li>Demo estática servida pelo mesmo host; sem dados reais embutidos.</li>
            <li>Export com candidaturas verdadeiras = dado sensível — trata o ficheiro como tal.</li>
          </ul>
        </section>

        <ApplyFlowSection
          eyebrow="Stack"
          title="Arquitetura do produto"
          description={
            <>
              Monorepo: <strong className="text-[color:var(--af-text)]">applyflow-extension</strong> (MV3),{" "}
              <strong className="text-[color:var(--af-text)]">applyflow</strong> (Next.js),{" "}
              <strong className="text-[color:var(--af-text)]">@devflow/applyflow-core</strong> e{" "}
              <strong className="text-[color:var(--af-text)]">@devflow/applyflow-linkedin</strong>. A ponte para o dashboard é{" "}
              <strong className="text-[color:var(--af-text)]">sempre um ficheiro que tu exportas</strong>.
            </>
          }
        >
          <Link href="/documentacao" className="text-sm font-medium text-emerald-400 hover:text-emerald-300">
            Ver índice da documentação →
          </Link>
        </ApplyFlowSection>

        <ApplyFlowSection
          eyebrow="Demo"
          title="Experimentar sem dados reais"
          description="No dashboard, Carregar demo mostra métricas e gráficos com candidaturas inteiramente fictícias."
        >
          <Link
            href="/dashboard#carregar-demo"
            className={applyFlowButtonClass({ variant: "outlineBrand", size: "md", className: "w-full justify-center sm:w-auto" })}
          >
            Ir para Carregar demo
          </Link>
        </ApplyFlowSection>

        <ApplyFlowSection
          title="Roadmap"
          description="Polish, materiais de portefólio e respeito explícito aos termos do LinkedIn. Detalhes em docs/applyflow/ROADMAP.md no repositório."
        >
          <p className="text-sm text-[color:var(--af-text-muted)]">
            <Link href="/documentacao" className="font-medium text-emerald-400 hover:text-emerald-300">
              Abrir documentação
            </Link>
          </p>
        </ApplyFlowSection>

        <div className="flex flex-col gap-3 border-t border-[color:var(--af-border)] pt-12 sm:flex-row sm:flex-wrap sm:justify-center">
          <Link href="/dashboard" className={applyFlowButtonClass({ variant: "primary", size: "lg", className: "justify-center" })}>
            Abrir dashboard
          </Link>
          <Link
            href="/dashboard#carregar-demo"
            className={applyFlowButtonClass({ variant: "outlineBrand", size: "lg", className: "justify-center" })}
          >
            Carregar demo
          </Link>
          <Link href="/documentacao" className={applyFlowButtonClass({ variant: "secondary", size: "lg", className: "justify-center" })}>
            Documentação
          </Link>
        </div>
      </div>
    </main>
  );
}
