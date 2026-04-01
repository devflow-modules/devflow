"use client";

import { cn } from "@/modules/financeiro/lib/cn";

type Props = {
  lines: string[];
  /** No mobile, mostra só as N primeiras linhas; em md+ mostra todas. */
  mobileMaxLines?: number;
};

/** Interpretação leve abaixo dos cards de resumo do mês. */
export function MonthlySummaryContext({ lines, mobileMaxLines = 2 }: Props) {
  if (lines.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 lg:col-span-3 md:px-4 md:py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Contexto do mês</p>
      <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground md:mt-2 md:space-y-1.5 md:text-sm">
        {lines.map((line, i) => (
          <li
            key={line}
            className={cn(
              "flex gap-2",
              mobileMaxLines != null && i >= mobileMaxLines && "max-md:hidden"
            )}
          >
            <span className="text-primary" aria-hidden>
              ·
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
