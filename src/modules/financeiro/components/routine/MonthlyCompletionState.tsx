"use client";

import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { FINANCEIRO_BASE_PATH } from "@/modules/financeiro/navigation/constants";
import { cn } from "@/modules/financeiro/lib/cn";
import { focusRingLight } from "@/modules/financeiro/lib/primitives";

const RELATORIOS_HREF = `${FINANCEIRO_BASE_PATH}/dashboard#relatorios`;

type Props = {
  className?: string;
};

export function MonthlyCompletionState({ className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 to-white px-3 py-4 text-center sm:flex-row sm:gap-3 sm:px-4 sm:py-5 sm:text-left",
        className
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 sm:size-12">
        <PartyPopper className="size-5 sm:size-6" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground sm:text-base">Seu mês está organizado</p>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Checklist em dia. Confira relatórios para manter o hábito.
        </p>
        <Link
          href={RELATORIOS_HREF}
          className={cn(
            "mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 sm:mt-3 sm:min-h-0 sm:bg-transparent sm:px-0 sm:text-primary sm:underline",
            focusRingLight
          )}
        >
          Ver relatórios
        </Link>
      </div>
    </div>
  );
}
