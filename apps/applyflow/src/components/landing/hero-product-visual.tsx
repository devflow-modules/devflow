/**
 * Static marketing composition — current career workflow (not extension/JSON era).
 */
export function HeroProductVisual() {
  return (
    <div className="relative w-full max-w-xl select-none lg:max-w-none" aria-hidden="true">
      <div className="pointer-events-none absolute -inset-6 rounded-[calc(var(--af-radius)+20px)] bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,var(--af-glow-hero),transparent_65%)] opacity-90" />
      <div className="relative overflow-hidden rounded-[var(--af-radius)] border border-[color:var(--af-border)] bg-[color:var(--af-bg-soft)] shadow-[var(--af-shadow-elevated)]">
        <div className="flex items-center gap-2 border-b border-[color:var(--af-border)] bg-black/25 px-3 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--af-border-strong)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--af-border-strong)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--af-border-strong)]" />
          </span>
          <span className="ml-1 font-mono text-[10px] text-[color:var(--af-text-muted)]">applyflow — fluxo de carreira</span>
        </div>
        <div className="grid gap-3 p-4 sm:p-5">
          <div className="rounded-[var(--af-radius-sm)] border border-emerald-500/25 bg-emerald-500/[0.07] p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-400/90">Discovery</p>
              <span className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                APPLY
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-[color:var(--af-text)]">Senior Product Engineer</p>
            <p className="mt-0.5 text-[11px] text-[color:var(--af-text-muted)]">Northstar Labs · Remote OK</p>
            <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">
              Match <span className="tabular-nums text-emerald-300">86%</span>
              <span className="mx-1.5 text-[color:var(--af-border-strong)]">·</span>
              React · TypeScript · Next.js
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--af-text-muted)]">
                Fila
              </p>
              <p className="mt-2 text-lg font-semibold tabular-nums text-[color:var(--af-text)]">3</p>
              <p className="text-[11px] text-[color:var(--af-text-muted)]">oportunidades ativas</p>
              <p className="mt-2 text-[10px] text-[color:var(--af-text-muted)]">Salvar ≠ candidatar</p>
            </div>
            <div className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--af-text-muted)]">
                Lifecycle
              </p>
              <p className="mt-2 text-sm font-medium text-[color:var(--af-text)]">Screening</p>
              <p className="mt-1 text-[11px] text-[color:var(--af-text-muted)]">Próximo: preparar entrevista</p>
              <p className="mt-2 text-[10px] text-[color:var(--af-text-muted)]">Sem auto-envio</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-black/20 px-3 py-2.5">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-200/95">
              Perfil no browser
            </span>
            <span className="rounded-full border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-2.5 py-0.5 text-[10px] text-[color:var(--af-text-muted)]">
              Match explicável
            </span>
            <span className="rounded-full border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-2.5 py-0.5 text-[10px] text-[color:var(--af-text-muted)]">
              Controlo humano
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
