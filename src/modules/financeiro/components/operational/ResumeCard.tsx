"use client";

import Link from "next/link";
import { trackFinanceiroResumeClicked } from "@/lib/analytics";
import { getFinanceiroLastAction } from "@/modules/financeiro/navigation/operational/lastActionStorage";
import { FinanceiroSectionCard } from "./FinanceiroSectionCard";
import { useOperationalRefresh } from "./useOperationalRefresh";
import { cn } from "@/modules/financeiro/lib/cn";
import { focusRingLight } from "@/modules/financeiro/lib/primitives";

type Props = {
  source?: "dashboard" | "sidebar" | "mobile" | "fab";
};

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function ResumeCard({ source = "dashboard" }: Props) {
  useOperationalRefresh();
  const last = getFinanceiroLastAction();

  if (!last) {
    return (
      <FinanceiroSectionCard
        title="Continuar de onde parei"
        description="Quando você registrar receitas ou despesas, mostramos o atalho aqui."
      >
        <p className="text-sm text-muted-foreground">
          Nenhuma ação recente salva neste dispositivo. Use as ações rápidas acima para começar.
        </p>
      </FinanceiroSectionCard>
    );
  }

  return (
    <FinanceiroSectionCard
      title="Continuar de onde parei"
      description="Retome o último fluxo útil neste aparelho."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-foreground">{last.title}</p>
          {last.detail ? <p className="mt-1 text-sm text-muted-foreground">{last.detail}</p> : null}
          <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
            Última atividade: {formatWhen(last.at)}
          </p>
        </div>
        <Link
          href={last.href}
          onClick={() =>
            trackFinanceiroResumeClicked({
              action_type: last.kind,
              source,
              has_last_action: true,
              target_path: last.href,
            })
          }
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90",
            focusRingLight
          )}
        >
          Continuar
        </Link>
      </div>
    </FinanceiroSectionCard>
  );
}
