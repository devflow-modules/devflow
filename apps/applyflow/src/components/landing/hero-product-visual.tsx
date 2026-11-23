/**
 * Static marketing composition — fictional job card aligned with the in-app evaluate view.
 * Not a live dashboard; no real candidate data.
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
          <span className="ml-1 font-mono text-[10px] text-[color:var(--af-text-muted)]">
            applyflow — oportunidade (exemplo)
          </span>
        </div>

        <div className="grid gap-3 p-4 sm:p-5">
          <div className="rounded-[var(--af-radius-sm)] border border-emerald-500/25 bg-emerald-500/[0.07] p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-400/90">Vaga salva</p>
              <span className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                Revisando
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-[color:var(--af-text)]">Senior Product Engineer</p>
            <p className="mt-0.5 text-[11px] text-[color:var(--af-text-muted)]">Northstar Labs · Remoto</p>
            <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">
              Aderência <span className="tabular-nums text-emerald-300">86</span>
              <span className="mx-1.5 text-[color:var(--af-border-strong)]">·</span>
              dados fictícios
            </p>
          </div>

          <div className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--af-text-muted)]">
              O que a vaga pede
            </p>
            <ul className="mt-2 space-y-1.5 text-[11px] text-[color:var(--af-text-muted)]" role="presentation">
              <li>
                <span className="font-medium text-[color:var(--af-text)]">TypeScript</span> — demonstrado no perfil
              </li>
              <li>
                <span className="font-medium text-[color:var(--af-text)]">Next.js</span> — demonstrado no perfil
              </li>
              <li>
                <span className="font-medium text-amber-200/90">AWS</span> — ainda precisa confirmar
              </li>
            </ul>
          </div>

          <div className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-black/20 px-3 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-400/90">Próxima ação</p>
            <p className="mt-1.5 text-sm font-medium text-[color:var(--af-text)]">Abrir preparação</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--af-text-muted)]">
              Revise o anúncio, prepare o envio no portal da empresa e registre depois em Candidaturas.
            </p>
          </div>
        </div>
      </div>
      <p className="relative mt-2 text-center text-[10px] text-[color:var(--af-text-muted)] lg:text-left">
        Prévia ilustrativa — não é uma vaga real.
      </p>
    </div>
  );
}
