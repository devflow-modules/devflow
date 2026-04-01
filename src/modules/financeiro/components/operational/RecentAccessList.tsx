"use client";

import Link from "next/link";
import { trackFinanceiroRecentAccessClicked } from "@/lib/analytics";
import { FINANCEIRO_DASHBOARD_PATH } from "@/modules/financeiro/navigation/constants";
import { getFinanceiroRecentRoutes } from "@/modules/financeiro/navigation/operational/recentRoutesStorage";
import { FinanceiroSectionCard } from "./FinanceiroSectionCard";
import { useOperationalRefresh } from "./useOperationalRefresh";
import { cn } from "@/modules/financeiro/lib/cn";
import { focusRingLight } from "@/modules/financeiro/lib/primitives";

type Props = {
  source?: "dashboard" | "sidebar" | "mobile" | "fab";
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function RecentAccessList({ source = "dashboard" }: Props) {
  useOperationalRefresh();
  const routes = getFinanceiroRecentRoutes();
  const list = routes.length > 0 ? routes : [];

  if (list.length === 0) {
    return (
      <FinanceiroSectionCard
        title="Acessos recentes"
        description="Suas últimas telas no Financeiro."
      >
        <p className="text-sm text-muted-foreground">
          Navegue pelo app — listamos até 5 telas úteis aqui. Enquanto isso, abra o{" "}
          <Link href={FINANCEIRO_DASHBOARD_PATH} className="font-medium text-primary underline">
            resumo
          </Link>
          .
        </p>
      </FinanceiroSectionCard>
    );
  }

  return (
    <FinanceiroSectionCard
      title="Acessos recentes"
      description="Últimas telas que você usou (neste dispositivo)."
    >
      <ul className="space-y-2">
        {list.map((entry, index) => (
          <li key={`${entry.path}-${entry.at}`}>
            <Link
              href={entry.path}
              onClick={() =>
                trackFinanceiroRecentAccessClicked({
                  source,
                  position: index,
                  target_path: entry.path,
                })
              }
              className={cn(
                "flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm transition hover:border-primary/30 hover:bg-primary/[0.06]",
                focusRingLight
              )}
            >
              <span className="font-medium text-foreground">{entry.label}</span>
              <span className="text-xs text-muted-foreground">{formatWhen(entry.at)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </FinanceiroSectionCard>
  );
}
