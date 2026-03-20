"use client";

type Props = {
  title: string;
  used: number;
  limit: number | null;
  percentage: number | null;
};

function getProgressColor(pct: number | null): string {
  if (pct == null) return "bg-slate-300";
  if (pct < 70) return "bg-emerald-500";
  if (pct < 90) return "bg-amber-500";
  return "bg-red-500";
}

export function UsageCard({ title, used, limit, percentage }: Props) {
  const pct = percentage ?? (limit != null && limit > 0 ? Math.round((used / limit) * 100) : 0);
  const displayLimit = limit != null ? limit.toLocaleString("pt-BR") : "—";
  const isUnlimited = limit == null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-medium text-slate-600">{title}</h3>
      <p className="mt-1 text-2xl font-semibold text-slate-900">
        {used.toLocaleString("pt-BR")}
        {!isUnlimited && (
          <span className="text-base font-normal text-slate-500"> / {displayLimit}</span>
        )}
      </p>
      {!isUnlimited && (
        <>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${getProgressColor(pct)}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">{pct}% utilizado</p>
        </>
      )}
    </div>
  );
}
