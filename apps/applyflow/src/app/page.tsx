import { applyFlowButtonClass } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import { HeroProductVisual } from "@/components/landing/hero-product-visual";
import { ApplyFlowSiteFooter } from "@/components/ui/ApplyFlowSiteFooter";

const workflowSteps = [
  {
    title: "Descobrir",
    body: "Busque vagas nos providers ou cole um anúncio e salve para revisar. Salvar ainda não é candidatar.",
  },
  {
    title: "Avaliar",
    body: "Veja o que a vaga pede, o que seu perfil demonstra e o que ainda precisa ser confirmado antes de investir tempo.",
  },
  {
    title: "Preparar e enviar",
    body: "Use a preparação manual ou o Pack quando disponível. O envio acontece no portal da empresa — não no ApplyFlow.",
  },
  {
    title: "Acompanhar",
    body: "Volte ao ApplyFlow, registre o envio e consulte Candidaturas para saber o que já saiu e o que ficou pendente.",
  },
];

const valueCards = [
  {
    title: "Um fluxo, do anúncio ao registro",
    body: "Descobrir, avaliar, preparar e acompanhar no mesmo produto — sem misturar salvar com enviar.",
  },
  {
    title: "Leitura que você consegue explicar",
    body: "Requisitos, evidências do perfil e lacunas ficam visíveis. A recomendação orquestra; a decisão é sua.",
  },
  {
    title: "Envio sob o seu controle",
    body: "Abrir o anúncio, candidatar no site da empresa e registrar o envio no ApplyFlow são passos distintos. Sem auto-envio.",
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
                    ApplyFlow
                  </span>
                  <span className="rounded-full border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-3 py-1 text-[11px] font-medium text-[color:var(--af-text-muted)]">
                    Sem auto-envio
                  </span>
                  <span className="rounded-full border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-3 py-1 text-[11px] font-medium text-[color:var(--af-text-muted)]">
                    Beta por convite
                  </span>
                </div>

                <h1 className="mt-7 text-balance text-4xl font-semibold tracking-tight text-[color:var(--af-text)] sm:text-5xl lg:text-6xl">
                  Organize sua busca de emprego, da vaga à candidatura
                </h1>

                <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[color:var(--af-text-muted)] sm:text-lg lg:mx-0 lg:max-w-xl">
                  Encontre ou traga vagas, compare os requisitos com seu perfil e acompanhe os envios — no mesmo
                  fluxo, com você no controle do envio externo.
                </p>

                <p className="mx-auto mt-4 max-w-xl text-sm font-medium text-emerald-200/90 lg:mx-0">
                  O currículo não é enviado aos provedores de busca.
                </p>

                <div className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap lg:mx-0">
                  {/* Native anchor: hard navigation — avoids Next Link soft-nav race before hydration. */}
                  <a
                    href="/dashboard"
                    className={applyFlowButtonClass({
                      variant: "primary",
                      size: "lg",
                      className: "w-full min-h-[48px] sm:w-auto sm:min-w-[200px]",
                    })}
                    data-testid="home-primary-cta"
                  >
                    Começar
                  </a>
                  <a
                    href="#como-funciona"
                    className={applyFlowButtonClass({
                      variant: "outlineBrand",
                      size: "lg",
                      className: "w-full min-h-[48px] sm:w-auto sm:min-w-[160px]",
                    })}
                  >
                    Como funciona
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
            title="Como funciona"
            description={
              <>
                Quatro passos com os mesmos nomes que você encontra no app. Exemplo fictício: você cola o anúncio de{" "}
                <strong className="text-[color:var(--af-text)]">Senior Product Engineer</strong> na Northstar Labs,
                avalia o que ainda falta confirmar, prepara o envio e registra depois em Candidaturas.
              </>
            }
          >
            <ol className="mt-2 grid list-none gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

            <div className="mt-6 rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-black/20 px-4 py-4 text-sm leading-relaxed text-[color:var(--af-text-muted)]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400/85">Três ações distintas</p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-[color:var(--af-text)]">Abrir o anúncio</strong> — ler a vaga no site de
                  origem ou no detalhe salvo.
                </li>
                <li>
                  <strong className="text-[color:var(--af-text)]">Enviar no portal da empresa</strong> — a candidatura
                  real acontece fora do ApplyFlow.
                </li>
                <li>
                  <strong className="text-[color:var(--af-text)]">Registrar o envio no ApplyFlow</strong> — marcar que
                  você enviou e acompanhar em Candidaturas.
                </li>
              </ul>
            </div>
          </ApplyFlowSection>

          <section className={sectionShell}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400/90">Porquê</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--af-text)] sm:text-3xl">
              Menos abas soltas, mais clareza na busca
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
                O perfil e o currículo ficam no seu browser durante a descoberta e a avaliação.
              </li>
              <li className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-4 py-3">
                O ApplyFlow não envia candidaturas por você — o envio é sempre externo e explícito.
              </li>
              <li className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-4 py-3 sm:col-span-2">
                Você pode usar só neste dispositivo. Entrar com conta é opcional para sincronizar vagas e candidaturas.
              </li>
            </ul>
          </section>

          <div className="flex flex-col items-center gap-3 border-t border-[color:var(--af-border)] pt-12 text-center">
            <p className="max-w-lg text-sm text-[color:var(--af-text-muted)]">
              Pronto para organizar a próxima vaga — sem auto-envio e com a próxima ação clara.
            </p>
            <a
              href="/dashboard"
              className={applyFlowButtonClass({
                variant: "primary",
                size: "lg",
                className: "min-h-[48px] justify-center",
              })}
            >
              Começar
            </a>
          </div>
        </div>
      </main>
      <ApplyFlowSiteFooter />
    </>
  );
}
