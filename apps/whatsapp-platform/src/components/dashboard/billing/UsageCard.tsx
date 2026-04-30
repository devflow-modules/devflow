"use client";

type Props = {
  title: string;
  used: number;
  limit: number | null;
  percentage: number | null;
  /** Ex.: "conversas incluídas" | "interações de IA incluídas" */
  includedKindLabel: string;
};

function getProgressColor(pct: number | null): string {
  if (pct == null) return "bg-[var(--df-text-muted)]";
  if (pct < 70) return "bg-emerald-500";
  if (pct < 90) return "bg-amber-500";
  return "bg-red-500";
}

export function UsageCard({ title, used, limit, percentage, includedKindLabel }: Props) {
  const pct = percentage ?? (limit != null && limit > 0 ? Math.round((used / limit) * 100) : 0);
  const displayLimit = limit != null ? limit.toLocaleString("pt-BR") : "—";
  const isUnlimited = limit == null;

  return (
    <div className="rounded-xl border df-border-brand bg-[var(--df-bg-elevated)] p-5 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--df-text-muted)]">{title}</h3>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
        <span className="text-3xl font-bold tabular-nums tracking-tight text-[var(--df-text-primary)]">
          {used.toLocaleString("pt-BR")}
        </span>
        {!isUnlimited && (
          <>
            <span className="text-xl font-medium text-[var(--df-text-muted)]">/</span>
            <span className="text-3xl font-bold tabular-nums tracking-tight text-[var(--df-text-primary)]">
              {displayLimit}
            </span>
          </>
        )}
      </div>
      {!isUnlimited && <p className="mt-2 text-sm text-[var(--df-text-muted)]">{includedKindLabel}</p>}
      {isUnlimited && (
        <p className="mt-2 text-sm text-[var(--df-text-muted)]">Sem limite fixo incluído neste indicador</p>
      )}
      {!isUnlimited && (
        <>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--df-bg-app)]">
            <div
              className={`h-full rounded-full transition-all ${getProgressColor(pct)}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-[var(--df-text-muted)]">{pct}% do volume incluído no plano</p>
        </>
      )}
    </div>
  );
}
