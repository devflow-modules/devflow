import type { ReactNode } from "react";

const eyebrowTones = {
  brand: "text-slate-500",
  neutral: "text-slate-400",
  amber: "text-amber-600/90",
} as const;

export type PageHeaderEyebrowTone = keyof typeof eyebrowTones;

type Props = {
  eyebrow?: string;
  eyebrowTone?: PageHeaderEyebrowTone;
  title: string;
  description?: ReactNode;
  /** Atalhos contextuais (ex.: links para filas, documentação) — abaixo do título em split. */
  quickActions?: ReactNode;
  /** Primário à direita em ecrãs largos quando layout split */
  actions?: ReactNode;
  layout?: "stack" | "split";
  className?: string;
  /** Inbox / cabeçalhos densos */
  size?: "default" | "compact";
  showDivider?: boolean;
  /** `admin` — realce discreto para páginas de configuração / áreas sensíveis. */
  tone?: "default" | "admin";
  /** Mostrar selo “Área administrativa” (por omissão: sim quando `tone="admin"`). */
  sensitivityBadge?: boolean;
};

/**
 * Hierarquia tipo SaaS: eyebrow discreto → título forte → corpo suave.
 */
export function PageHeader({
  eyebrow,
  eyebrowTone = "brand",
  title,
  description,
  quickActions,
  actions,
  layout = "stack",
  className = "",
  size = "default",
  showDivider = true,
  tone = "default",
  sensitivityBadge,
}: Props) {
  const showBadge = sensitivityBadge ?? tone === "admin";
  const titleClass =
    size === "compact"
      ? "text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl"
      : "text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem] sm:leading-tight";

  const dividerSplit = showDivider ? "border-b border-slate-100 pb-8 sm:pb-10" : "pb-4 sm:pb-5";
  const toneRing = tone === "admin" ? "rounded-2xl border border-amber-100/90 bg-amber-50/25 pl-4 ring-1 ring-amber-100/80" : "";

  if (layout === "split") {
    return (
      <header
        className={`flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between ${dividerSplit} ${toneRing} ${className}`.trim()}
      >
        <div className="min-w-0 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            {eyebrow ? (
              <p
                className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${eyebrowTones[eyebrowTone]}`}
              >
                {eyebrow}
              </p>
            ) : null}
            {showBadge ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-amber-200/90 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900/90"
                title="Configuração do espaço de trabalho — fora da operação diária da Inbox"
              >
                <span aria-hidden>🔒</span>
                Área administrativa
              </span>
            ) : null}
          </div>
          <h1 className={`mt-2 ${titleClass}`}>{title}</h1>
          {quickActions ? (
            <div className="mt-3 flex flex-wrap gap-2 text-sm">{quickActions}</div>
          ) : null}
          {description ? (
            <div className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-500 sm:text-base">{description}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full shrink-0 flex-wrap gap-2 lg:w-auto lg:justify-end">{actions}</div>
        ) : null}
      </header>
    );
  }

  return (
    <header className={`max-w-2xl ${toneRing} ${className}`.trim()}>
      <div className="flex flex-wrap items-center gap-2">
        {eyebrow ? (
          <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${eyebrowTones[eyebrowTone]}`}>
            {eyebrow}
          </p>
        ) : null}
        {showBadge ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/90 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900/90">
            <span aria-hidden>🔒</span>
            Área administrativa
          </span>
        ) : null}
      </div>
      <h1 className={`mt-3 ${titleClass}`}>{title}</h1>
      {quickActions ? <div className="mt-3 flex flex-wrap gap-2 text-sm">{quickActions}</div> : null}
      {description ? (
        <div className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-500 sm:text-base">{description}</div>
      ) : null}
      {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}
