import Link from "next/link";

import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import { applyFlowButtonClass } from "@/components/ui/ApplyFlowButton";

type Props = {
  activeOpportunityCount: number;
  applicationCount: number;
  hasResume: boolean;
};

export function DashboardOverviewShortcuts({
  activeOpportunityCount,
  applicationCount,
  hasResume,
}: Props) {
  return (
    <ApplyFlowSection
      title="Onde queres trabalhar"
      description="A visão geral resume o estado. Usa os atalhos para o fluxo do dia."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <ApplyFlowCard variant="muted" padding="md" className="flex flex-col gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400/85">Descobrir</p>
            <p className="mt-2 text-sm text-[color:var(--af-text-muted)]">
              {hasResume
                ? "Pesquisar providers ou colar um anúncio."
                : "Primeiro cadastra um perfil — depois a busca faz sentido."}
            </p>
          </div>
          <Link
            href="/dashboard/discover"
            className={applyFlowButtonClass({ variant: "primary", size: "sm", className: "mt-auto w-full justify-center" })}
          >
            Ir para Descobrir
          </Link>
        </ApplyFlowCard>

        <ApplyFlowCard variant="muted" padding="md" className="flex flex-col gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400/85">Oportunidades</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[color:var(--af-text)]">
              {activeOpportunityCount}
            </p>
            <p className="text-sm text-[color:var(--af-text-muted)]">na fila ativa (salvas, ainda não candidatura)</p>
          </div>
          <Link
            href="/dashboard/opportunities"
            className={applyFlowButtonClass({ variant: "outlineBrand", size: "sm", className: "mt-auto w-full justify-center" })}
          >
            Ver fila
          </Link>
        </ApplyFlowCard>

        <ApplyFlowCard variant="muted" padding="md" className="flex flex-col gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400/85">Candidaturas</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[color:var(--af-text)]">{applicationCount}</p>
            <p className="text-sm text-[color:var(--af-text-muted)]">registadas — acompanhar estado e próximos passos</p>
          </div>
          <Link
            href="/dashboard/applications"
            className={applyFlowButtonClass({ variant: "outlineBrand", size: "sm", className: "mt-auto w-full justify-center" })}
          >
            Ver candidaturas
          </Link>
        </ApplyFlowCard>
      </div>
      <p className="mt-3 text-xs text-[color:var(--af-text-muted)]">
        Padrões e gráficos:{" "}
        <Link href="/dashboard/analytics" className="font-medium text-emerald-300 hover:text-emerald-200">
          Analytics
        </Link>
        .
      </p>
    </ApplyFlowSection>
  );
}
