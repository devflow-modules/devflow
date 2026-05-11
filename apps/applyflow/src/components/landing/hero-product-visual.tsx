/**
 * Composição estática só para marketing / screenshots — sem dados reais nem lógica.
 */
export function HeroProductVisual() {
  return (
    <div
      className="relative w-full max-w-xl select-none lg:max-w-none"
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute -inset-6 rounded-[calc(var(--af-radius)+20px)] bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,var(--af-glow-hero),transparent_65%)] opacity-90" />
      <div className="relative overflow-hidden rounded-[var(--af-radius)] border border-[color:var(--af-border)] bg-[color:var(--af-bg-soft)] shadow-[var(--af-shadow-elevated)]">
        <div className="flex items-center gap-2 border-b border-[color:var(--af-border)] bg-black/25 px-3 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
          </span>
          <span className="ml-1 font-mono text-[10px] text-zinc-500">applyflow — dashboard local</span>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-5">
          <div className="rounded-[var(--af-radius-sm)] border border-emerald-500/20 bg-emerald-500/[0.06] p-3 sm:p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-400/90">Pipeline</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[color:var(--af-text)]">24</p>
            <p className="text-[11px] text-[color:var(--af-text-muted)]">candidaturas (demo)</p>
            <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <span className="w-[38%] bg-emerald-500/80" />
              <span className="w-[22%] bg-cyan-500/70" />
              <span className="w-[18%] bg-violet-500/65" />
              <span className="w-[22%] bg-zinc-700" />
            </div>
          </div>
          <div className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] p-3 sm:p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--af-text-muted)]">Extensão</p>
            <p className="mt-2 text-sm font-medium text-[color:var(--af-text)]">Easy Apply · assistido</p>
            <p className="mt-1 text-[11px] leading-snug text-[color:var(--af-text-muted)]">Safety gate · sem auto-submit</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200/95">
                Autofill
              </span>
              <span className="rounded border border-zinc-600/60 bg-zinc-900/80 px-2 py-0.5 text-[10px] text-zinc-400">JSON</span>
            </div>
          </div>
          <div className="sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-black/20 px-3 py-2.5">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-200/95">
                  Só local
                </span>
                <span className="rounded-full border border-zinc-600/50 bg-zinc-900/60 px-2.5 py-0.5 text-[10px] text-zinc-400">Sem backend</span>
                <span className="rounded-full border border-zinc-600/50 bg-zinc-900/60 px-2.5 py-0.5 text-[10px] text-zinc-400">Export JSON</span>
              </div>
              <span className="text-[10px] text-zinc-500">localStorage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
