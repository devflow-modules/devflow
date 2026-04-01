"use client";

import { useEffect, useRef, useState } from "react";
import type { FinanceiroInsight } from "@/modules/financeiro/insights/types";
import { trackFinanceiroInsightViewed, trackFinanceiroMobileExpandInsights } from "@/lib/analytics";
import { FinanceiroInsightCard } from "./FinanceiroInsightCard";
import { Skeleton } from "@/modules/financeiro/components/Skeleton";
import { cn } from "@/modules/financeiro/lib/cn";
import { focusRingLight } from "@/modules/financeiro/lib/primitives";

type Props = {
  insights: FinanceiroInsight[];
  isLoading: boolean;
};

export function FinanceiroInsightsPanel({ insights, isLoading }: Props) {
  const viewedRef = useRef<Set<string>>(new Set());
  const [insightsExpanded, setInsightsExpanded] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    for (let i = 0; i < insights.length; i++) {
      const insight = insights[i];
      if (viewedRef.current.has(insight.id)) continue;
      viewedRef.current.add(insight.id);
      trackFinanceiroInsightViewed({
        insight_type: insight.type,
        insight_id: insight.id,
        priority: insight.priority,
        cta_target: insight.cta.href,
        position: i,
      });
    }
  }, [insights, isLoading]);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-5" aria-busy="true">
        <Skeleton className="h-3 w-40 md:h-4 md:w-48" />
        <div className="mt-3 space-y-3 md:mt-4">
          <Skeleton className="h-28 w-full rounded-xl md:h-24" />
          <Skeleton className="hidden h-24 w-full rounded-xl md:block" />
        </div>
      </section>
    );
  }

  if (insights.length === 0) return null;

  const moreCount = insights.length - 1;

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/80 to-white p-3 shadow-sm md:p-5"
      aria-labelledby="financeiro-insights-heading"
    >
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2 md:mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary md:text-xs md:tracking-[0.25em]">
            Hoje no seu Financeiro
          </p>
          <h2 id="financeiro-insights-heading" className="mt-0.5 text-base font-semibold text-foreground md:text-lg">
            O que merece atenção agora
          </h2>
        </div>
        <span className="hidden rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:inline">
          Até 3 prioridades
        </span>
      </div>
      <ul className="space-y-2 md:space-y-3">
        {insights.map((insight, index) => (
          <li
            key={insight.id}
            className={cn(index > 0 && !insightsExpanded && "max-md:hidden")}
          >
            <FinanceiroInsightCard
              insight={insight}
              position={index}
              touchProminent={index === 0}
            />
          </li>
        ))}
      </ul>
      {moreCount > 0 && !insightsExpanded ? (
        <button
          type="button"
          className={cn(
            "mt-3 hidden min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-foreground shadow-sm hover:bg-slate-50 max-md:flex",
            focusRingLight
          )}
          onClick={() => {
            trackFinanceiroMobileExpandInsights({ hidden_count: moreCount });
            setInsightsExpanded(true);
          }}
        >
          Ver mais alertas ({moreCount})
        </button>
      ) : null}
    </section>
  );
}
