import Link from "next/link";
import { ArrowRight, BarChart3, Bot, Clock3, Search, Users2 } from "lucide-react";
import { Section } from "@/components/layout/Section";
import { cn } from "@/lib/utils";

const inboxRows = [
  {
    initials: "AC",
    contact: "ACME · Upgrade anual",
    meta: "Digitando resposta… · SLA 6m",
    score: "94",
    tone: "border-emerald-200/80 bg-emerald-50/60",
  },
  {
    initials: "CH",
    contact: "Clínica Horizonte",
    meta: "Fluxo disparado há 9s · PDF enviado",
    score: "81",
    tone: "border-sky-200/80 bg-sky-50/50",
  },
  {
    initials: "SN",
    contact: "Studio North · Proposta",
    meta: "Carla assumiu há 1m · deal quente",
    score: "88",
    tone: "border-amber-200/80 bg-amber-50/50",
  },
];

const automationRuns = [
  {
    name: "Qualificação B2B",
    status: "14/min",
    tone: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    name: "Suporte nível 1",
    status: "Ativo",
    tone: "text-sky-800 bg-sky-500/10 border-sky-500/20",
  },
  {
    name: "Pós-venda D+7",
    status: "Disparou agora",
    tone: "df-text-secondary bg-muted/25 border-border",
  },
];

const metricBars = [
  { label: "1ª resposta", value: "42s", pct: 78, hint: "meta batida" },
  { label: "Bot fecha", value: "71%", pct: 71, hint: "hoje" },
  { label: "Lead → MQL", value: "18%", pct: 52, hint: "vs ontem" },
];

export function ProductPreviewSection() {
  return (
    <Section aria-labelledby="product-preview-heading" className="py-20 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90 sm:text-sm">Isso roda agora</p>
        <h2
          id="product-preview-heading"
          className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Sua fila respondendo sozinha enquanto o comercial fecha no timing certo
        </h2>
        <p className="df-text-secondary mx-auto mt-4 max-w-2xl text-base font-semibold leading-snug sm:text-lg">
          Veja ação no painel: mensagens entrando, automação disparando, SLA apertando e o lead certo subindo — sem
          planilha, sem caos no celular.
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-6xl">
        <div
          className="rounded-[1.35rem] p-[1px] shadow-[0_28px_90px_-20px_rgba(15,23,42,0.22)]"
          style={{
            background: "linear-gradient(145deg, rgba(148,163,184,0.45), rgba(226,232,240,0.9))",
          }}
        >
          <div className="overflow-hidden rounded-[1.3rem] border df-border-brand bg-card">
            <div className="flex items-center gap-2 border-b border-border bg-slate-950 px-4 py-2.5">
              <span className="flex gap-1.5" aria-hidden>
                <span className="size-2.5 rounded-full bg-red-400/90" />
                <span className="size-2.5 rounded-full bg-amber-400/90" />
                <span className="size-2.5 rounded-full bg-emerald-400/90" />
              </span>
              <p className="df-text-secondary ml-2 min-w-0 flex-1 truncate text-center text-[11px] font-medium">
                DevFlow WhatsApp Platform
              </p>
              <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                Produção
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-emerald-950/35 px-3 py-2 sm:px-4">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-emerald-200 sm:text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
                  14 msgs/min
                </span>
                <span className="rounded-full bg-muted/50 px-2 py-0.5 text-foreground ring-1 ring-border">3 fluxos ativos</span>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-100">2 SLA críticos</span>
              </div>
              <span className="df-text-secondary text-[10px] font-semibold sm:text-[11px]">Último evento há 3s</span>
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
                  {["Todas", "SLA em risco", "Minha fila"].map((tab, i) => (
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
                            <span className="shrink-0 rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-foreground ring-1 ring-border">
                              {row.score}
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
                      <p className="mt-1 truncate text-sm font-bold text-foreground">ACME · Upgrade anual</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Score 94
                        </span>
                        <span className="rounded-md bg-muted/35 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                          SLA 8m
                        </span>
                        <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-900">
                          Vendas
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-950 shadow-sm">
                      <Clock3 className="size-3.5 text-amber-700" aria-hidden />
                      SLA 6m · fila quente
                    </div>
                  </div>

                  <div className="mt-4 flex-1 space-y-3">
                    <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-2.5 text-xs leading-relaxed text-foreground shadow-sm">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Automação · agora
                      </span>
                      Vi renovação anual. Confirmo 42 licenças e já mando link de pagamento?
                    </div>
                    <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-md bg-slate-900 px-3.5 py-2.5 text-xs leading-relaxed text-white shadow-md">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/60">
                        Cliente · agora
                      </span>
                      São 42 licenças. Preciso falar com alguém sobre desconto progressivo.
                    </div>
                    <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-emerald-200/90 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-emerald-950 shadow-sm">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-emerald-800/80">
                        Sistema · +1s
                      </span>
                      Carla já entrou com score, histórico e última proposta — zero retrabalho.
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-dashed border-border/90 bg-muted/20 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Regras ativas</p>
                    <p className="mt-1 text-[11px] font-semibold leading-snug text-foreground">
                      Score mexe na fila · SLA grita antes de estourar · handoff manda contexto · zero msg duplicada
                    </p>
                  </div>
                </article>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <article className="rounded-2xl border border-border bg-muted/15 p-4 shadow-sm sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-foreground">Automação em execução</p>
                      <Bot className="size-4 text-primary" aria-hidden />
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
                          <span className="shrink-0 tabular-nums opacity-90">{run.status}</span>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="rounded-2xl border border-border bg-muted/15 p-4 shadow-sm sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-foreground">Resultado hoje</p>
                      <BarChart3 className="size-4 text-primary" aria-hidden />
                    </div>
                    <div className="mt-4 space-y-3">
                      {metricBars.map((m) => (
                        <div key={m.label}>
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-[11px] font-bold text-muted-foreground">
                              {m.label}{" "}
                              <span className="font-semibold text-emerald-700">· {m.hint}</span>
                            </p>
                            <p className="text-sm font-bold tabular-nums text-foreground">{m.value}</p>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted/50">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                              style={{ width: `${m.pct}%` }}
                            />
                          </div>
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
            Em 2 minutos você vê a fila, a automação e o SLA — o mesmo gatilho que o time sente quando o produto
            trabalha por ele.
          </p>
          <Link
            href="/demo"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-foreground px-6 text-sm font-bold text-background shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Ver demo em 2 minutos
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </Section>
  );
}
