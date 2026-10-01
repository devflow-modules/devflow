import Link from "next/link";

import { applyFlowButtonClass } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import { HeroProductVisual } from "@/components/landing/hero-product-visual";
import { ApplyFlowSiteFooter } from "@/components/ui/ApplyFlowSiteFooter";

const workflowSteps = [
  {
    title: "Descobrir",
    body: "Pesquisa providers ou cola um anúncio. O currículo não vai nos pedidos de busca.",
  },
  {
    title: "Avaliar",
    body: "Vê um Match explicável — score e decisão de orientação, não uma caixa negra.",
  },
  {
    title: "Priorizar",
    body: "Guarda só o que merece tempo. Uma vaga salva ainda não é uma candidatura.",
  },
  {
    title: "Preparar",
    body: "Checklist de prontidão antes de registar. Sem envio automático.",
  },
  {
    title: "Acompanhar",
    body: "Marca o envio real e segue o estado (triagem, entrevista, oferta…).",
  },
];

const valueCards = [
  {
    title: "Um fluxo em vez de abas soltas",
    body: "Descoberta, fit, fila e acompanhamento no mesmo produto — sem misturar salvar com candidatar.",
  },
  {
    title: "Match que podes entender",
    body: "Motor determinístico de cobertura de skills. Recomendação é advisory; a decisão é tua.",
  },
  {
    title: "Os teus dados sob o teu controlo",
    body: "O perfil fica no browser na descoberta. Não há auto-apply. Conta autenticada é opcional para sync.",
  },
];

const sectionShell =
  "rounded-[var(--af-radius)] border border-[color:var(--af-border)] bg-[color:var(--af-bg-soft)]/75 p-6 shadow-sm backdrop-blur-sm sm:p-8";

export default function HomePage() {
  return (
    <>
      <main className="text-[color:var(--af-text)]">
        <section className="relative overflow-hidden border-b border-[color:var(--af-border)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-30%,var(--af-glow-hero),transparent_55%)]" />
          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:pt-24">
            <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(280px,440px)] lg:gap-16 xl:gap-20">
              <div className="text-center lg:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                  <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300/95">
                    Fluxo de carreira
                  </span>
                  <span className="rounded-full border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-3 py-1 text-[11px] font-medium text-[color:var(--af-text-muted)]">
                    Sem auto-envio
                  </span>
                  <span className="rounded-full border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-3 py-1 text-[11px] font-medium text-[color:var(--af-text-muted)]">
                    Beta por convite
                  </span>
                </div>

                <h1 className="mt-7 text-5xl font-semibold tracking-tight text-[color:var(--af-text)] sm:text-6xl lg:text-7xl">
                  ApplyFlow
                </h1>

                <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[color:var(--af-text-muted)] sm:text-xl lg:mx-0 lg:max-w-xl">
                  Organiza a tua busca por vagas — do{" "}
                  <strong className="text-[color:var(--af-text)]">descobrimento ao acompanhamento</strong>.
                </p>

                <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--af-text-muted)] sm:text-[15px] lg:mx-0 lg:max-w-xl">
                  Descobre oportunidades em vários providers, entende o fit, prioriza onde investir tempo, prepara a
                  candidatura e acompanha o estado depois de enviares tu — fora do ApplyFlow.
                </p>

                <p className="mx-auto mt-4 max-w-xl text-sm font-medium text-emerald-200/90 lg:mx-0">
                  O teu currículo não é enviado aos provedores de busca.
                </p>

                <div className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap lg:mx-0">
                  <Link
                    href="/dashboard"
                    className={applyFlowButtonClass({
                      variant: "primary",
                      size: "lg",
                      className: "w-full min-h-[48px] sm:w-auto sm:min-w-[200px]",
                    })}
                    data-testid="home-primary-cta"
                  >
                    Começar
                  </Link>
                  <Link
                    href="/login"
                    className={applyFlowButtonClass({
                      variant: "outlineBrand",
                      size: "lg",
                      className: "w-full min-h-[48px] sm:w-auto sm:min-w-[140px]",
                    })}
                  >
                    Entrar
                  </Link>
                  <a
                    href="#como-funciona"
                    className="inline-flex min-h-[48px] items-center justify-center px-2 text-sm font-medium text-emerald-400/90 underline-offset-4 hover:text-emerald-300 hover:underline sm:min-w-0"
                  >
                    Ver como funciona
                  </a>
                </div>
              </div>

              <div className="flex justify-center lg:justify-end">
                <HeroProductVisual />
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-10 px-4 py-14 sm:space-y-12 sm:px-6 sm:py-20">
          <ApplyFlowSection
            id="como-funciona"
            className={sectionShell}
            eyebrow="Fluxo"
            title="Como o ApplyFlow funciona"
            description="Passos com controlo humano — a recomendação nunca substitui a tua intenção."
          >
            <ol className="mt-6 grid list-none gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {workflowSteps.map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-3 py-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400/85">
                    {index + 1}. {step.title}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--af-text-muted)]">{step.body}</p>
                </li>
              ))}
            </ol>
          </ApplyFlowSection>

          <section className={sectionShell}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400/90">Porquê</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--af-text)] sm:text-3xl">
              Menos fragmentação, mais clareza
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {valueCards.map((f) => (
                <ApplyFlowCard key={f.title} variant="muted" padding="md" className="h-full">
                  <h3 className="text-base font-semibold tracking-tight text-[color:var(--af-text)]">{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[color:var(--af-text-muted)]">{f.body}</p>
                </ApplyFlowCard>
              ))}
            </div>
          </section>

          <section id="privacidade" className={sectionShell}>
            <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--af-text)] sm:text-3xl">
              Privacidade no dia a dia
            </h2>
            <ul className="mt-6 grid list-none gap-3 text-sm text-[color:var(--af-text-muted)] sm:grid-cols-2">
              <li className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-4 py-3">
                O perfil e o currículo ficam no teu browser durante a descoberta e o Match.
              </li>
              <li className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-4 py-3">
                O ApplyFlow não envia candidaturas por ti — o envio é sempre externo e explícito.
              </li>
              <li className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-4 py-3 sm:col-span-2">
                Podes usar só neste dispositivo. Entrar com conta é opcional para sincronizar vagas e candidaturas.
              </li>
            </ul>
          </section>

          <section className={sectionShell}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400/90">Pré-visualização</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--af-text)] sm:text-3xl">
              O produto em ecrã
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-[color:var(--af-text-muted)]">
              Capturas com dados fictícios — Discovery, fila e lifecycle do produto atual.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["applyflow-discovery.png", "Discovery + Match"],
                  ["applyflow-queue.png", "Fila de oportunidades"],
                  ["applyflow-lifecycle.png", "Lifecycle"],
                ] as const
              ).map(([file, label]) => (
                <figure key={file} className="overflow-hidden rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/portfolio/${file}`}
                    alt={label}
                    className="aspect-video w-full object-cover object-top bg-zinc-950"
                    loading="lazy"
                  />
                  <figcaption className="border-t border-[color:var(--af-border)] px-3 py-2 text-xs text-[color:var(--af-text-muted)]">
                    {label}
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-3 text-xs text-[color:var(--af-text-muted)]">
              Assets canónicos também em{" "}
              <code className="rounded bg-zinc-900 px-1 py-0.5 text-[11px]">docs/applyflow/assets/</code> no repositório.
            </p>
          </section>

          <div className="flex flex-col items-center gap-3 border-t border-[color:var(--af-border)] pt-12 text-center">
            <p className="max-w-lg text-sm text-[color:var(--af-text-muted)]">
              Pronto para organizar a próxima vaga — sem auto-envio e com Match que consegues explicar.
            </p>
            <Link
              href="/dashboard"
              className={applyFlowButtonClass({ variant: "primary", size: "lg", className: "min-h-[48px] justify-center" })}
            >
              Começar no ApplyFlow
            </Link>
          </div>
        </div>
      </main>
      <ApplyFlowSiteFooter />
    </>
  );
}
