"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { GitBranch, LayoutGrid, MinusCircle, PlusCircle, Tags, UserRound } from "lucide-react";
import { trackFinanceiroQuickActionClicked } from "@/lib/analytics";
import type { FinanceiroQuickAction } from "@/modules/financeiro/navigation/operational/quickActions";
import { FinanceiroSectionCard } from "./FinanceiroSectionCard";
import { cn } from "@/modules/financeiro/lib/cn";
import { focusRingLight } from "@/modules/financeiro/lib/primitives";

const ICONS: Record<string, LucideIcon> = {
  new_expense: MinusCircle,
  new_income: PlusCircle,
  month_summary: LayoutGrid,
  rules: GitBranch,
  categories: Tags,
  account: UserRound,
};

type Props = {
  actions: FinanceiroQuickAction[];
  source?: "dashboard" | "sidebar" | "mobile" | "fab";
  hasLastAction?: boolean;
};

export function QuickActionsPanel({ actions, source = "dashboard", hasLastAction }: Props) {
  return (
    <FinanceiroSectionCard
      title="Ações rápidas"
      description="Um clique para registrar ou revisar o essencial."
    >
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        {actions.map((action, index) => {
          const Icon = ICONS[action.action_type] ?? LayoutGrid;
          return (
            <li key={action.action_type}>
              <Link
                href={action.href}
                onClick={() =>
                  trackFinanceiroQuickActionClicked({
                    action_type: action.action_type,
                    source,
                    position: index,
                    has_last_action: hasLastAction ?? false,
                    target_path: action.href,
                  })
                }
                className={cn(
                  "flex min-h-[88px] flex-col justify-between rounded-xl border border-slate-200 bg-card p-3 text-left transition hover:border-primary/40 hover:bg-primary/[0.04] active:scale-[0.99] sm:min-h-[96px] sm:p-4",
                  focusRingLight
                )}
              >
                <Icon className="size-5 shrink-0 text-primary" aria-hidden />
                <span className="mt-2 text-xs font-semibold leading-tight text-foreground sm:text-sm">
                  {action.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </FinanceiroSectionCard>
  );
}
