"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  getHealthScoreFactors,
  type FinanceiroHealthScoreResult,
} from "@/modules/financeiro/health/getFinanceiroHealthScore";
import { getHealthScoreCriterionHref } from "@/modules/financeiro/health/criterionHrefs";
import { getScorePrimaryCta } from "@/modules/financeiro/health/getScorePrimaryCta";
import type { HealthScoreBreakdownItem } from "@/modules/financeiro/health/types";
import {
  trackFinanceiroMobileExpandScoreBreakdown,
  trackFinanceiroScoreBreakdownClicked,
  trackFinanceiroScoreViewed,
} from "@/lib/analytics";
import { Skeleton } from "@/modules/financeiro/components/Skeleton";
import { FinanceiroScoreRing } from "./FinanceiroScoreRing";
import { cn } from "@/modules/financeiro/lib/cn";
import { focusRingLight } from "@/modules/financeiro/lib/primitives";
import { useIsNarrowScreen } from "@/modules/financeiro/lib/useIsNarrowScreen";

const LEVEL_BADGE: Record<
  FinanceiroHealthScoreResult["level"],
  { className: string; emoji: string }
> = {
  critical: { className: "bg-rose-50 text-rose-800 ring-rose-200", emoji: "🔴" },
  warning: { className: "bg-amber-50 text-amber-900 ring-amber-200", emoji: "🟡" },
  progress: { className: "bg-sky-50 text-sky-900 ring-sky-200", emoji: "🔵" },
  good: { className: "bg-emerald-50 text-emerald-900 ring-emerald-200", emoji: "🟢" },
};

function statusIcon(passed: boolean, weight: number) {
  if (passed) return "✔️";
  if (weight >= 20) return "❌";
  return "⚠️";
}

function BreakdownRow({
  item,
  href,
  onNavigate,
}: {
  item: HealthScoreBreakdownItem;
  href: string;
  onNavigate: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          "flex min-h-11 items-start gap-2 rounded-lg border border-transparent px-2 py-2 text-left text-sm transition hover:border-slate-200 hover:bg-slate-50/80",
          focusRingLight
        )}
      >
        <span className="mt-0.5 shrink-0" aria-hidden>
          {statusIcon(item.passed, item.weight)}
        </span>
        <span className="min-w-0 flex-1 leading-snug text-foreground">
          <span className="font-medium">{item.label}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {item.passed ? "Critério atendido" : `Até ${item.weight} pts neste item`}
          </span>
        </span>
      </Link>
    </li>
  );
}

type Props = {
  result: FinanceiroHealthScoreResult | null;
  isLoading: boolean;
  isOwner: boolean;
  householdId: string;
};

export function FinanceiroHealthScorePanel({ result, isLoading, isOwner, householdId }: Props) {
  const headingId = useId();
  const viewedRef = useRef<string | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const narrow = useIsNarrowScreen();

  useEffect(() => {
    if (isLoading || !result) return;
    const key = `${householdId}-${result.score}-${result.level}`;
    if (viewedRef.current === key) return;
    viewedRef.current = key;
    const { lowest_factor, highest_factor } = getHealthScoreFactors(result.breakdown);
    trackFinanceiroScoreViewed({
      score: result.score,
      level: result.level,
      lowest_factor,
      highest_factor,
    });
  }, [isLoading, result, householdId]);

  const toggleBreakdown = () => {
    setBreakdownOpen((prev) => {
      const next = !prev;
      if (next && narrow) trackFinanceiroMobileExpandScoreBreakdown();
      return next;
    });
  };

  if (isLoading) {
    return (
      <section
        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-5"
        aria-busy="true"
        aria-labelledby={headingId}
      >
        <Skeleton className="h-3 w-36 md:h-4 md:w-48" />
        <div className="mt-3 flex gap-3 md:mt-4 md:gap-4">
          <Skeleton className="size-[72px] shrink-0 rounded-full md:size-[88px]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3 md:h-6 md:w-3/4" />
            <Skeleton className="h-10 w-full md:h-4" />
          </div>
        </div>
      </section>
    );
  }

  if (!result) return null;

  const badge = LEVEL_BADGE[result.level];
  const factors = getHealthScoreFactors(result.breakdown);
  const primary = getScorePrimaryCta(result, isOwner);

  return (
    <section
      className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-5"
      aria-labelledby={headingId}
      id="score-saude-financeira"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 md:text-xs md:tracking-[0.25em]">
        Saúde do mês
      </p>
      <h2 id={headingId} className="mt-0.5 text-base font-semibold text-foreground md:mt-1 md:text-lg">
        <span className="md:hidden">Como está seu mês</span>
        <span className="hidden md:inline">Quão organizado está seu financeiro?</span>
      </h2>

      <div className="mt-3 flex flex-row items-center gap-3 md:mt-4 md:items-start md:gap-6">
        <div className="shrink-0 scale-[0.92] md:scale-100">
          <FinanceiroScoreRing score={result.score} level={result.level} size={76} strokeWidth={7} />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 md:space-y-2">
          <p className="text-sm font-medium text-foreground md:text-base lg:text-lg">
            <span className="tabular-nums font-semibold">{result.score}%</span>
            <span className="text-muted-foreground"> · </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 align-middle text-[11px] font-semibold ring-1 ring-inset md:text-xs",
                badge.className
              )}
            >
              <span aria-hidden>{badge.emoji}</span>
              {result.headlineLabel}
            </span>
          </p>
          <p className="line-clamp-2 text-xs leading-snug text-muted-foreground md:line-clamp-none md:text-sm md:leading-relaxed">
            {result.ctaHint}
          </p>
        </div>
      </div>

      <Link
        href={primary.href}
        className={cn(
          "mt-4 flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:opacity-90 md:mt-5 md:inline-flex md:w-auto md:min-h-10 md:px-5",
          focusRingLight
        )}
      >
        {primary.label}
      </Link>

      <div className="mt-3 border-t border-slate-100 pt-2 md:mt-4 md:pt-3">
        <button
          type="button"
          onClick={toggleBreakdown}
          className={cn(
            "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-foreground hover:bg-slate-50 md:min-h-10",
            focusRingLight
          )}
          aria-expanded={breakdownOpen}
        >
          Ver critérios do score
          <ChevronDown className={cn("size-4 shrink-0 transition-transform", breakdownOpen && "rotate-180")} />
        </button>
        {breakdownOpen ? (
          <ul className="mt-1 space-y-0.5 border-t border-slate-50 pt-2">
            {result.breakdown.map((item) => (
              <BreakdownRow
                key={item.id}
                item={item}
                href={getHealthScoreCriterionHref(item.id, { isOwner })}
                onNavigate={() =>
                  trackFinanceiroScoreBreakdownClicked({
                    score: result.score,
                    level: result.level,
                    lowest_factor: factors.lowest_factor,
                    highest_factor: factors.highest_factor,
                    criterion_id: item.id,
                  })
                }
              />
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
