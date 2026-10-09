import Link from "next/link";
import { ArrowRight, Bot, Search, Users2 } from "lucide-react";
import { Section } from "@/components/layout/Section";
import { PRIMARY_DEMO_CTA_LABEL } from "@/lib/conversion-copy";
import { cn } from "@/lib/utils";

const inboxRows = [
  {
    initials: "MA",
    contact: "Mariana",
    meta: "Precisa resposta · Sem responsável",
    state: "Fila",
    tone: "df-bg-warning-soft",
  },
  {
    initials: "JO",
    contact: "João",
    meta: "Com Bruno · Fila Comercial",
    state: "Bruno",
    tone: "df-bg-success-soft",
  },
  {
    initials: "AN",
    contact: "Ana",
    meta: "Transferido para Carla",
    state: "Carla",
    tone: "df-bg-info-soft",
  },
];

const automationRuns = [
  {
    name: "Dúvidas frequentes",
    status: "Quando ativa",
    tone: "df-bg-success-soft df-status-success",
  },
  {
    name: "Encaminhar para a equipe",
    status: "Handoff",
    tone: "df-bg-info-soft df-status-info",
  },
  {
    name: "Aguardando pessoa",
    status: "Na fila",
    tone: "df-text-secondary bg-muted/25 border-border",
  },
];

const conversationStates = [
  { label: "Precisa resposta", value: "Sem responsável" },
  { label: "Em atendimento", value: "Com Bruno" },
  { label: "Transferido", value: "Para Carla" },
];

export function ProductPreviewSection() {
  return (
    <Section aria-labelledby="product-preview-heading" className="py-20 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] df-status-brand sm:text-sm">Demonstração da plataforma</p>
        <h2
          id="product-preview-heading"
          className="mt-3 text-balance text-3xl font-bold tracking-tight df-text-primary sm:text-4xl"
        >
          A fila deixa claro o que ainda precisa de resposta
        </h2>
        <p className="df-text-secondary mx-auto mt-4 max-w-2xl text-base font-semibold leading-snug sm:text-lg">
          Dados ilustrativos. A equipe vê quem está com a conversa, o que está na fila e quando a automação encaminha para uma pessoa.
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-6xl">
        <div className="df-wa-preview-frame rounded-[1.35rem] p-[1px] shadow-[0_28px_90px_-20px_rgba(15,23,42,0.22)]">
          <div className="overflow-hidden rounded-[1.3rem] border df-border-brand bg-card">
            <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2.5">
              <span className="flex gap-1.5" aria-hidden>
                <span className="size-2.5 rounded-full df-dot-danger opacity-90" />
                <span className="size-2.5 rounded-full df-dot-warning opacity-90" />
                <span className="size-2.5 rounded-full df-dot-brand opacity-90" />
              </span>
              <p className="df-text-secondary ml-2 min-w-0 flex-1 truncate text-center text-[11px] font-medium">
                DevFlow WhatsApp Platform
              </p>
              <span className="shrink-0 rounded-full df-bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide df-status-brand">
                Dados ilustrativos
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b df-border-brand bg-[var(--devflow-surface-elevated)] px-3 py-2 sm:px-4">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide df-text-secondary sm:text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full df-bg-brand-soft px-2 py-0.5 df-status-brand">
                  <span className="size-1.5 rounded-full df-dot-brand" aria-hidden />
                  Precisa resposta
                </span>
                <span className="rounded-full bg-muted/50 px-2 py-0.5 df-text-primary ring-1 ring-border">Fila Comercial</span>
                <span className="rounded-full df-bg-warning-soft px-2 py-0.5 df-status-warning">Sem responsável</span>
              </div>
              <span className="df-text-secondary text-[10px] font-semibold sm:text-[11px]">Simulação</span>
            </div>

            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:divide-x lg:divide-border">
              {/* Inbox column */}
              <div className="flex flex-col border-b border-border bg-gradient-to-b from-muted/25 to-background p-4 sm:p-5 lg:border-b-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold tracking-tight text-foreground">Inbox</p>
                  <Users2 className="size-4 text-muted-foreground" aria-hidden />
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 shadow-sm">
                  <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="text-xs font-medium text-muted-foreground">Buscar deal, tag ou ticket…</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Todas", "Precisa resposta", "Minha fila"].map((tab, i) => (
                    <span
                      key={tab}
                      className={cn(
                        "rounded-full px-3 py-1 text-[11px] font-semibold",
                        i === 0 ? "bg-foreground text-background shadow-sm" : "border border-border bg-background text-muted-foreground"
                      )}
                    >
                      {tab}
                    </span>
                  ))}
                </div>
                <div className="mt-4 space-y-2.5">
                  {inboxRows.map((row) => (
                    <div
                      key={row.contact}
                      className={cn(
                        "rounded-xl border px-3 py-3 shadow-sm transition-shadow hover:shadow-md",
                        row.tone
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-xs font-bold text-foreground shadow-sm ring-1 ring-border">
                          {row.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-xs font-bold text-foreground">{row.contact}</p>
                            <span className="shrink-0 rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px] font-bold text-foreground ring-1 ring-border">
                              {row.state}
                            </span>
                          </div>
                          <p className="df-text-secondary mt-1 text-[11px] font-medium leading-snug">{row.meta}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat + ops column */}
              <div className="flex flex-col bg-background p-4 sm:p-5">
                <article className="flex flex-1 flex-col rounded-2xl border border-border bg-muted/15 p-4 shadow-inner sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/80 pb-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Conversa ativa</p>
                      <p className="mt-1 truncate text-sm font-bold text-foreground">João · Fila Comercial</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-md df-bg-success-soft px-2 py-0.5 text-[10px] font-bold df-status-success">
                          Com Bruno
                        </span>
                        <span className="rounded-md bg-muted/35 px-2 py-0.5 text-[10px] font-semibold df-text-primary">
                          Em atendimento
                        </span>
                        <span className="rounded-md df-bg-info-soft px-2 py-0.5 text-[10px] font-bold df-status-info">
                          Fila Comercial
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 rounded-full df-bg-warning-soft px-2.5 py-1 text-[10px] font-bold df-status-warning shadow-sm">
                      Aguardando responsável
                    </div>
                  </div>

                  <div className="mt-4 flex-1 space-y-3">
                    <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-2.5 text-xs leading-relaxed text-foreground shadow-sm">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Automação · agora
                      </span>
                      Posso confirmar o horário de entrega para o centro?
                    </div>
                    <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-md bg-muted px-3.5 py-2.5 text-xs leading-relaxed df-text-primary shadow-md">
                      <span className="df-text-secondary mb-1 block text-[10px] font-semibold uppercase tracking-wide">
                        Cliente
                      </span>
                      Preciso falar com alguém sobre uma exceção nesse pedido.
                    </div>
                    <div className="max-w-[88%] rounded-2xl rounded-tl-md border df-bg-success-soft px-3.5 py-2.5 text-xs font-medium leading-relaxed df-text-primary shadow-sm">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide df-status-success">
                        Equipe
                      </span>
                      Conversa transferida para Carla, com o histórico preservado.
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-dashed border-border/90 bg-muted/20 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">O que a equipe vê</p>
                    <p className="mt-1 text-[11px] font-semibold leading-snug text-foreground">
                      Responsável da conversa · fila · histórico compartilhado · encaminhamento para uma pessoa
                    </p>
                  </div>
                </article>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <article className="rounded-2xl border border-border bg-muted/15 p-4 shadow-sm sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-foreground">Automação em execução</p>
                      <Bot className="size-4 df-status-brand" aria-hidden />
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      {automationRuns.map((run) => (
                        <div
                          key={run.name}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[11px] font-semibold",
                            run.tone
                          )}
                        >
                          <span className="min-w-0 truncate">{run.name}</span>
                          <span className="shrink-0 tabular-nums text-current">{run.status}</span>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="rounded-2xl border border-border bg-muted/15 p-4 shadow-sm sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-foreground">Estado da conversa</p>
                      <Users2 className="size-4 df-status-brand" aria-hidden />
                    </div>
                    <div className="mt-4 space-y-3">
                      {conversationStates.map((m) => (
                        <div key={m.label} className="flex items-baseline justify-between gap-2">
                          <p className="text-[11px] font-bold text-muted-foreground">{m.label}</p>
                          <p className="text-sm font-bold text-foreground">{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-center sm:flex-row sm:text-left">
          <p className="df-text-secondary max-w-md text-sm font-semibold leading-snug">
            A demonstração mostra fila, responsável e handoff. Dados ilustrativos, não uma operação de cliente.
          </p>
          <Link
            href="/demo"
            className="df-btn-primary df-shadow-cta-soft inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {PRIMARY_DEMO_CTA_LABEL}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </Section>
  );
}
