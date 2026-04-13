import type { ReactNode } from "react";

/**
 * Secção numerada do fluxo de configuração de IA (visão geral → … → teste).
 * Card único com hierarquia clara; evita sensação de formulário solto.
 */
export function AiSettingsPhase({
  id,
  phase,
  title,
  description,
  children,
}: {
  id: string;
  phase: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-24 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[var(--df-shadow-card)] ring-1 ring-slate-900/[0.03] sm:p-7"
    >
      <header className="border-b border-slate-100/90 pb-5">
        <span className="inline-flex rounded-full bg-[var(--df-brand-50)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--df-brand-800)] ring-1 ring-[var(--df-brand-200)]/70">
          {phase}
        </span>
        <h2 id={`${id}-heading`} className="mt-3 text-lg font-bold tracking-tight text-slate-950">
          {title}
        </h2>
        {description ? (
          <div className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{description}</div>
        ) : null}
      </header>
      <div className="mt-6 space-y-8">{children}</div>
    </section>
  );
}

/** Subtítulo dentro de uma fase (evita níveis de `h2` duplicados). */
export function AiSettingsSubheading({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-bold text-slate-900">{children}</h3>;
}
