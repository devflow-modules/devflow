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
  /** Primário à direita em ecrãs largos quando layout split */
  actions?: ReactNode;
  layout?: "stack" | "split";
  className?: string;
  /** Inbox / cabeçalhos densos */
  size?: "default" | "compact";
  showDivider?: boolean;
};

/**
 * Hierarquia tipo SaaS: eyebrow discreto → título forte → corpo suave.
 */
export function PageHeader({
  eyebrow,
  eyebrowTone = "brand",
  title,
  description,
  actions,
  layout = "stack",
  className = "",
  size = "default",
  showDivider = true,
}: Props) {
  const titleClass =
    size === "compact"
      ? "text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl"
      : "text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem] sm:leading-tight";

  const dividerSplit = showDivider ? "border-b border-slate-100 pb-8 sm:pb-10" : "pb-4 sm:pb-5";

  if (layout === "split") {
    return (
      <header
        className={`flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between ${dividerSplit} ${className}`.trim()}
      >
        <div className="min-w-0 max-w-2xl">
          {eyebrow ? (
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${eyebrowTones[eyebrowTone]}`}
            >
              {eyebrow}
            </p>
          ) : null}
          <h1 className={`mt-2 ${titleClass}`}>{title}</h1>
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
    <header className={`max-w-2xl ${className}`.trim()}>
      {eyebrow ? (
        <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${eyebrowTones[eyebrowTone]}`}>
          {eyebrow}
        </p>
      ) : null}
      <h1 className={`mt-3 ${titleClass}`}>{title}</h1>
      {description ? (
        <div className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-500 sm:text-base">{description}</div>
      ) : null}
      {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}
