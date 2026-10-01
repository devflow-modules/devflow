import { applyFlowButtonClass } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowPrivacyNotice } from "@/components/ui/ApplyFlowPrivacyNotice";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import { HeroProductVisual } from "@/components/landing/hero-product-visual";
import Link from "next/link";

const heroBullets = [
  "Descobre vagas via providers (Jobgether, Remote OK; TheirStack só com opt-in).",
  "Avalia fit com Match Engine determinístico — local, sem LLM.",
  "Guarda oportunidades numa fila derivada (sem entidade Shortlist).",
  "Prepara a candidatura com checklist de orientação (não é um gate).",
  "Regista e acompanha o lifecycle — Mark Sent só após envio externo real.",
  "Local-first por defeito; V2/Postgres opcional no closed beta.",
];

const featureCards = [
  {
    title: "Discovery + Match",
    body: "Adapters de providers no servidor, preview de fit no browser. CV/perfil não vão nos pedidos de discovery.",
  },
  {
    title: "Fila + preparação",
    body: "Save cria Job, não Application. Readiness e next-action são derivados — orientação, não automação.",
  },
  {
    title: "Lifecycle + privacidade",
    body: "Registar ≠ enviar. Sem auto-apply. Persistência local ou V2 autenticada com isolamento por conta.",
  },
];

const workflowSteps = [
  { title: "Discover", body: "Pesquisa providers e cola anúncios." },
  { title: "Evaluate", body: "Preview de match — score e decisão advisory." },
  { title: "Prioritize", body: "Save explícito entra na opportunity queue." },
  { title: "Prepare", body: "Checklist de readiness e análise da vaga." },
  { title: "Track", body: "Regista candidatura, Mark Sent, lifecycle." },
];

const sectionShell =
  "rounded-[var(--af-radius)] border border-[color:var(--af-border)] bg-[color:var(--af-bg-soft)]/75 p-6 shadow-sm backdrop-blur-sm sm:p-8";

export default function HomePage() {
  return (
    <main className="text-[color:var(--af-text)]">
      <section className="relative overflow-hidden border-b border-[color:var(--af-border)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-30%,var(--af-glow-hero),transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-20 lg:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(280px,440px)] lg:gap-16 xl:gap-20">
            <div className="text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300/95">
                  DevFlow Labs
                </span>
                <span className="rounded-full border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-3 py-1 text-[11px] font-medium text-[color:var(--af-text-muted)]">
                  Local-first
                </span>
                <span className="rounded-full border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-3 py-1 text-[11px] font-medium text-[color:var(--af-text-muted)]">
                  Closed beta
                </span>
              </div>

              <h1 className="mt-8 text-5xl font-semibold tracking-tight text-[color:var(--af-text)] sm:text-6xl lg:text-7xl">
                ApplyFlow
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[color:var(--af-text-muted)] sm:text-xl lg:mx-0 lg:max-w-xl">
                A local-first workflow for <strong className="text-[color:var(--af-text)]">finding, evaluating and tracking</strong>{" "}
                job opportunities.
              </p>

              <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-[color:var(--af-text-muted)] sm:text-[15px] lg:mx-0 lg:max-w-2xl">
                Discovery, deterministic Match Engine, opportunity queue, application readiness and lifecycle tracking —
                with optional authenticated V2 cloud persistence. No auto-apply. No public signup.
              </p>

              <p className="mx-auto mt-4 max-w-xl text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--af-text-muted)] sm:text-[13px] lg:mx-0">
                Privacy-first · Human intent · Invite-only beta
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
                  Open Dashboard
                </Link>
                <Link
                  href="/login"
                  className={applyFlowButtonClass({
                    variant: "outlineBrand",
                    size: "lg",
                    className: "w-full min-h-[48px] sm:min-w-[160px] sm:flex-1 sm:shrink-0",
                  })}
                >
                  Sign in
                </Link>
                <Link
                  href="/documentacao"
                  className={applyFlowButtonClass({
                    variant: "secondary",
                    size: "lg",
                    className: "w-full min-h-[48px] sm:min-w-[160px] sm:flex-1 sm:shrink-0",
                  })}
                >
                  Documentation
                </Link>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <HeroProductVisual />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:space-y-12 sm:px-6 sm:py-20">
        <ApplyFlowSection
          className={sectionShell}
          eyebrow="Workflow"
          title="How it works"
          description="Human-controlled steps from discovery to lifecycle — recommendation never replaces intent."
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400/90">Capabilities</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--af-text)] sm:text-3xl">
            What you get
          </h2>
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
            Privacy model
          </h2>
          <div className="mt-6">
            <ApplyFlowPrivacyNotice />
          </div>
          <ul className="mt-6 grid list-disc gap-3 pl-5 text-sm text-[color:var(--af-text-muted)] marker:text-[color:var(--af-text-muted)] sm:grid-cols-2">
            <li>CV/profile stay local for discovery and matching by default.</li>
            <li>Provider secrets stay server-only; TheirStack remains off on shared hosts.</li>
            <li className="sm:col-span-2">Chrome extension companion for LinkedIn Easy Apply assist remains available — still no auto-submit.</li>
          </ul>
        </section>

        <ApplyFlowSection
          className={sectionShell}
          eyebrow="Docs"
          title="Architecture & ops"
          description="Entry point for engineers and operators: product flow, lifecycle, testing, closed-beta runbook."
        >
          <Link href="/documentacao" className="mt-2 inline-flex text-sm font-medium text-emerald-400 hover:text-emerald-300">
            Open documentation hub →
          </Link>
        </ApplyFlowSection>

        <div className="flex flex-col gap-3 border-t border-[color:var(--af-border)] pt-12 sm:flex-row sm:flex-wrap sm:justify-center">
          <Link href="/dashboard" className={applyFlowButtonClass({ variant: "primary", size: "lg", className: "min-h-[48px] justify-center" })}>
            Open Dashboard
          </Link>
          <Link href="/login" className={applyFlowButtonClass({ variant: "outlineBrand", size: "lg", className: "min-h-[48px] justify-center" })}>
            Sign in
          </Link>
          <Link href="/documentacao" className={applyFlowButtonClass({ variant: "secondary", size: "lg", className: "min-h-[48px] justify-center" })}>
            Documentation
          </Link>
        </div>
      </div>
    </main>
  );
}
