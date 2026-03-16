/**
 * Gráfico de barras horizontais simples: distribuição PRO vs TEAM.
 * Sem dependência de bibliotecas externas — 100% Tailwind.
 */

type Props = {
  proUsers: number;
  teamUsers: number;
  freeUsers: number;
};

type BarProps = {
  label: string;
  value: number;
  total: number;
  color: string;
};

function Bar({ label, value, total, color }: BarProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value.toLocaleString("pt-BR")} usuários ({pct}%)
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${pct}%`}
        />
      </div>
    </div>
  );
}

export function PlanDistributionChart({ proUsers, teamUsers, freeUsers }: Props) {
  const total = freeUsers + proUsers + teamUsers;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-muted-foreground">Distribuição de Planos</h3>
      <div className="space-y-3">
        <Bar label="FREE" value={freeUsers} total={total} color="bg-muted-foreground/40" />
        <Bar label="PRO" value={proUsers} total={total} color="bg-primary" />
        <Bar label="TEAM" value={teamUsers} total={total} color="bg-emerald-500" />
      </div>
      {total === 0 && (
        <p className="text-center text-sm text-muted-foreground">Nenhum dado disponível</p>
      )}
    </div>
  );
}
