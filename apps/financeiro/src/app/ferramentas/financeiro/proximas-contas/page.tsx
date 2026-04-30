"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useHousehold } from "@/modules/financeiro/lib/household/HouseholdProvider";
import { Skeleton } from "@/modules/financeiro/components/Skeleton";
import { Breadcrumbs } from "@/modules/financeiro/components/Breadcrumbs";
import { ContextSelector, ContextBadge } from "@/modules/financeiro/components/ContextSelector";
import type { ContextFilter } from "@/modules/financeiro/components/ContextSelector";
import type { FinancialContext } from "@/modules/financeiro/schemas";
import { formatDateOnlyPtBr } from "@/lib/dates";
import { Button } from "@/components/ui/button";

type Source = { id: string; name: string; sourceType: "PJ" | "PF" };
type Category = { id: string; name: string; color: string } | null;
type UpcomingExpense = {
  id: string;
  category: string;
  amount: number;
  dueDate: string;
  status: "PENDING" | "SCHEDULED";
  isRecurring: boolean;
  note?: string | null;
  context: FinancialContext;
  source?: Source | null;
  categoryRef?: Category;
};

type UpcomingData = {
  overdue: UpcomingExpense[];
  upcoming: UpcomingExpense[];
  totalOverdue: number;
  totalUpcoming: number;
  daysAhead: number;
};

const DAYS_OPTIONS = [7, 14, 30, 60, 90] as const;

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function daysUntil(date: string): number {
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export default function ProximasContasPage() {
  const { household, isLoading: householdLoading } = useHousehold();
  const [data, setData] = useState<UpcomingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [contextFilter, setContextFilter] = useState<ContextFilter>("ALL");
  const [daysAhead, setDaysAhead] = useState<(typeof DAYS_OPTIONS)[number]>(30);

  const load = async () => {
    if (!household?.id) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ days: String(daysAhead) });
      if (contextFilter !== "ALL") params.set("context", contextFilter);
      const res = await fetch(`/api/upcoming-expenses?${params}`);
      const payload = await res.json();
      if (payload.success) setData(payload.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filters + household; load é instável
  }, [household?.id, contextFilter, daysAhead]);

  const markPaid = async (expense: UpcomingExpense) => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`/api/expenses/${expense.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID", paidAt: today, paidAmount: Number(expense.amount) }),
    });
    const payload = await res.json();
    if (payload.success) {
      toast.success(`"${expense.category}" marcada como paga`);
      load();
    } else {
      toast.error(payload.error?.message ?? "Erro ao marcar como paga");
    }
  };

  if (householdLoading || !household) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 text-foreground md:px-6 md:py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <Breadcrumbs />

        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Agenda financeira</p>
            <h1 className="mt-1 text-3xl font-semibold text-foreground">Próximas contas</h1>
            <p className="mt-1 text-sm text-muted-foreground">Despesas pendentes e agendadas por vencimento.</p>
          </div>
          <ContextSelector value={contextFilter} onChange={setContextFilter} />
        </header>

        {/* Controles */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Horizonte:</span>
          {DAYS_OPTIONS.map((d) => (
            <Button variant="secondary"
              key={d}
              type="button"
              onClick={() => setDaysAhead(d)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                daysAhead === d
                  ? "bg-indigo-600 text-white"
                  : "bg-muted df-text-secondary hover:bg-muted"
              }`}
            >
              {d} dias
            </Button>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={`rounded-2xl border p-4 ${(data?.totalOverdue ?? 0) > 0 ? "border-red-200 bg-red-50" : "border-border bg-muted/60"}`}>
            <p className={`text-xs font-medium uppercase tracking-wider ${(data?.totalOverdue ?? 0) > 0 ? "text-red-500" : "text-muted-foreground"}`}>
              ⚠ Atrasadas
            </p>
            {isLoading ? (
              <Skeleton className="mt-2 h-7 w-32" />
            ) : (
              <>
                <p className={`mt-1 text-2xl font-bold ${(data?.totalOverdue ?? 0) > 0 ? "text-red-600" : "text-foreground"}`}>
                  {formatCurrency(data?.totalOverdue ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">{data?.overdue.length ?? 0} conta(s)</p>
              </>
            )}
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-amber-600">⏰ Próximas ({daysAhead}d)</p>
            {isLoading ? (
              <Skeleton className="mt-2 h-7 w-32" />
            ) : (
              <>
                <p className="mt-1 text-2xl font-bold text-amber-700">{formatCurrency(data?.totalUpcoming ?? 0)}</p>
                <p className="text-xs text-muted-foreground">{data?.upcoming.length ?? 0} conta(s)</p>
              </>
            )}
          </div>
        </div>

        {/* Atrasadas */}
        {(data?.overdue.length ?? 0) > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Atrasadas ({data!.overdue.length})
            </h2>
            <div className="space-y-2">
              {isLoading ? (
                <Skeleton className="h-16 w-full rounded-xl" />
              ) : (
                data!.overdue.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    variant="overdue"
                    onMarkPaid={markPaid}
                  />
                ))
              )}
            </div>
          </section>
        )}

        {/* Próximas */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Próximas {daysAhead} dias ({data?.upcoming.length ?? 0})
          </h2>
          <div className="space-y-2">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </>
            ) : (data?.upcoming.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                <p className="text-sm text-emerald-700">🎉 Nenhuma conta pendente nos próximos {daysAhead} dias!</p>
              </div>
            ) : (
              data!.upcoming.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  variant="upcoming"
                  onMarkPaid={markPaid}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ExpenseCard({
  expense,
  variant,
  onMarkPaid,
}: {
  expense: UpcomingExpense;
  variant: "overdue" | "upcoming";
  onMarkPaid: (e: UpcomingExpense) => void;
}) {
  const days = daysUntil(expense.dueDate);
  const urgencyColor =
    variant === "overdue"
      ? "border-red-200 bg-red-50"
      : days <= 3
      ? "border-amber-200 bg-amber-50"
      : "border-border bg-card";

  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${urgencyColor}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{expense.category}</p>
          {expense.isRecurring && (
            <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-500">🔁 recorrente</span>
          )}
          <ContextBadge context={expense.context} />
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDateOnlyPtBr(expense.dueDate)}</span>
          {variant === "overdue" ? (
            <span className="text-red-500 font-medium">{Math.abs(days)}d em atraso</span>
          ) : (
            <span className={days <= 3 ? "text-amber-600 font-medium" : ""}>
              {days === 0 ? "vence hoje" : `em ${days}d`}
            </span>
          )}
          {expense.source && <span>· {expense.source.name}</span>}
        </div>
        {expense.note && <p className="mt-0.5 text-xs text-muted-foreground truncate">{expense.note}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <p className={`text-sm font-bold ${variant === "overdue" ? "text-red-600" : "text-foreground"}`}>
          {formatCurrency(Number(expense.amount))}
        </p>
        <Button variant="secondary"
          type="button"
          onClick={() => onMarkPaid(expense)}
          className="rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-600 active:scale-95"
        >
          Pagar
        </Button>
      </div>
    </div>
  );
}
