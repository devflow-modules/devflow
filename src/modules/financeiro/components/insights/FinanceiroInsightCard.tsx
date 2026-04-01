"use client";

import Link from "next/link";
import { AlertTriangle, Lightbulb, Sparkles } from "lucide-react";
import type { FinanceiroInsight } from "@/modules/financeiro/insights/types";
import { trackFinanceiroInsightClicked } from "@/lib/analytics";
import { cn } from "@/modules/financeiro/lib/cn";
import { focusRingLight } from "@/modules/financeiro/lib/primitives";

type Props = {
  insight: FinanceiroInsight;
  position: number;
  /** CTA mais alto e largo no mobile (insight principal). */
  touchProminent?: boolean;
};

function Icon({ type }: { type: FinanceiroInsight["type"] }) {
  const cls = "size-5 shrink-0";
  if (type === "warning") return <AlertTriangle className={cn(cls, "text-amber-600")} aria-hidden />;
  if (type === "opportunity") return <Lightbulb className={cn(cls, "text-primary")} aria-hidden />;
  return <Sparkles className={cn(cls, "text-sky-600")} aria-hidden />;
}

function borderForType(type: FinanceiroInsight["type"]) {
  if (type === "warning") return "border-amber-200 bg-amber-50/40";
  if (type === "opportunity") return "border-primary/25 bg-primary/[0.04]";
  return "border-sky-200 bg-sky-50/40";
}

export function FinanceiroInsightCard({ insight, position, touchProminent }: Props) {
  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-start sm:justify-between sm:p-4",
        borderForType(insight.type)
      )}
    >
      <div className="flex min-w-0 gap-2 sm:gap-3">
        <Icon type={insight.type} />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
            {insight.type === "warning" ? "Atenção" : insight.type === "opportunity" ? "Oportunidade" : "Info"}
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-foreground sm:mt-1 sm:text-base">{insight.title}</h3>
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground sm:line-clamp-none sm:text-sm">
            {insight.description}
          </p>
        </div>
      </div>
      <Link
        href={insight.cta.href}
        onClick={() =>
          trackFinanceiroInsightClicked({
            insight_type: insight.type,
            insight_id: insight.id,
            priority: insight.priority,
            cta_target: insight.cta.href,
            position,
          })
        }
        className={cn(
          "inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background hover:opacity-90 sm:w-auto sm:self-center",
          touchProminent ? "min-h-11 px-4 py-3 sm:min-h-0 sm:px-4 sm:py-2" : "min-h-11 px-4 py-2.5 sm:min-h-0",
          focusRingLight
        )}
      >
        {insight.cta.label}
      </Link>
    </article>
  );
}
