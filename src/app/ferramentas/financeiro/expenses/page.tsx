"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  expenseCreateSchema,
  expenseUpdateSchema,
  incomeCreateSchema,
  incomeUpdateSchema,
} from "@/lib/financeiro/schema";
import { useHousehold } from "@/lib/financeiro/household/HouseholdProvider";
import { Skeleton } from "@/components/financeiro/Skeleton";
import { formatDateOnlyPtBr, toDateOnly } from "@/lib/dates";
import { Breadcrumbs } from "@/components/financeiro/Breadcrumbs";

type FinancialSource = { id: string; name: string; sourceType: "PJ" | "PF" };
type Income = {
  id: string;
  amount: number;
  receivedAt: string;
  status?: "SCHEDULED" | "RECEIVED";
  isRecurring?: boolean;
  source?: FinancialSource | null;
};
type Expense = {
  id: string;
  amount: number;
  category: string;
  dueDate: string;
  status?: "PENDING" | "PAID" | "SCHEDULED";
  paidAmount?: number | null;
  paidAt?: string | null;
  isRecurring?: boolean;
  source?: FinancialSource | null;
};

type IncomeForm = {
  amount: string;
  receivedAt: string;
  sourceId: string;
  isRecurring: boolean;
  status: "SCHEDULED" | "RECEIVED";
};

type ExpenseForm = {
  category: string;
  amount: string;
  dueDate: string;
  sourceId: string;
  isRecurring: boolean;
};

const defaultIncomeForm: IncomeForm = { amount: "", receivedAt: "", sourceId: "", isRecurring: false, status: "RECEIVED" };
const defaultExpenseForm: ExpenseForm = { category: "", amount: "", dueDate: "", sourceId: "", isRecurring: false };

export default function ExpensesPage() {
  const { household, isLoading: householdLoading } = useHousehold();
  const [isLoading, setIsLoading] = useState(true);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sources, setSources] = useState<FinancialSource[]>([]);
  const [incomeForm, setIncomeForm] = useState(defaultIncomeForm);
  const [expenseForm, setExpenseForm] = useState(defaultExpenseForm);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const loadSources = async () => {
    if (!household?.id) return;
    const response = await fetch("/api/sources");
    const payload = await response.json();
    setSources(payload.data ?? []);
  };

  const loadFinancials = async () => {
    if (!household?.id) return;
    const [incomeRes, expenseRes] = await Promise.all([
      fetch("/api/incomes"),
      fetch("/api/expenses"),
    ]);

    const incomePayload = await incomeRes.json();
    const expensePayload = await expenseRes.json();

    setIncomes(incomePayload.data ?? []);
    setExpenses(expensePayload.data ?? []);
  };

  useEffect(() => {
    const run = async () => {
      if (!household?.id) return;
      setIsLoading(true);
      try {
        await Promise.all([loadSources(), loadFinancials()]);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [household?.id]);

  const handleIncomeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingIncomeId) {
      await handleIncomeUpdate();
      return;
    }

    const parsed = incomeCreateSchema.parse({
      amount: Number(incomeForm.amount),
      receivedAt: incomeForm.receivedAt,
      sourceId: incomeForm.sourceId || undefined,
      isRecurring: incomeForm.isRecurring,
      status: incomeForm.status,
    });

    const response = await fetch("/api/incomes", {
      method: "POST",
      body: JSON.stringify(parsed),
      headers: { "Content-Type": "application/json" },
    });
    const payload = await response.json();
    if (payload.success) {
      toast.success("Receita cadastrada");
      setIncomeForm(defaultIncomeForm);
      loadFinancials();
    } else {
      toast.error(payload.error?.message ?? "Erro ao cadastrar");
    }
  };

  const handleIncomeUpdate = async () => {
    if (!editingIncomeId) return;
    const parsed = incomeUpdateSchema.parse({
      amount: Number(incomeForm.amount),
      receivedAt: incomeForm.receivedAt,
      sourceId: incomeForm.sourceId || undefined,
      isRecurring: incomeForm.isRecurring,
      status: incomeForm.status,
    });

    const res = await fetch(`/api/incomes/${editingIncomeId}`, {
      method: "PATCH",
      body: JSON.stringify(parsed),
      headers: { "Content-Type": "application/json" },
    });
    const payload = await res.json();
    if (payload.success) {
      toast.success("Receita atualizada");
      setEditingIncomeId(null);
      setIncomeForm(defaultIncomeForm);
      loadFinancials();
    } else {
      toast.error(payload.error?.message ?? "Erro ao atualizar");
    }
  };

  const handleExpenseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingExpenseId) {
      await handleExpenseUpdate();
      return;
    }

    const parsed = expenseCreateSchema.parse({
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      dueDate: expenseForm.dueDate,
      sourceId: expenseForm.sourceId || undefined,
      isRecurring: expenseForm.isRecurring,
    });

    const res = await fetch("/api/expenses", {
      method: "POST",
      body: JSON.stringify(parsed),
      headers: { "Content-Type": "application/json" },
    });
    const payload = await res.json();
    if (payload.success) {
      toast.success("Despesa cadastrada");
      setExpenseForm(defaultExpenseForm);
      loadFinancials();
    } else {
      toast.error(payload.error?.message ?? "Erro ao cadastrar");
    }
  };

  const handleExpenseUpdate = async () => {
    if (!editingExpenseId) return;
    const parsed = expenseUpdateSchema.parse({
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      dueDate: expenseForm.dueDate,
      sourceId: expenseForm.sourceId || undefined,
      isRecurring: expenseForm.isRecurring,
    });

    const res = await fetch(`/api/expenses/${editingExpenseId}`, {
      method: "PATCH",
      body: JSON.stringify(parsed),
      headers: { "Content-Type": "application/json" },
    });
    const payload = await res.json();
    if (payload.success) {
      toast.success("Despesa atualizada");
      setEditingExpenseId(null);
      setExpenseForm(defaultExpenseForm);
      loadFinancials();
    } else {
      toast.error(payload.error?.message ?? "Erro ao atualizar");
    }
  };

  const deleteIncome = async (incomeId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta receita?")) return;
    const res = await fetch(`/api/incomes/${incomeId}`, { method: "DELETE" });
    const payload = await res.json();
    if (payload.success) {
      toast.success("Receita excluída");
      loadFinancials();
    } else {
      toast.error(payload.error?.message ?? "Erro ao excluir");
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta despesa?")) return;
    const res = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
    const payload = await res.json();
    if (payload.success) {
      toast.success("Despesa excluída");
      loadFinancials();
    } else {
      toast.error(payload.error?.message ?? "Erro ao excluir");
    }
  };

  const markExpensePaid = async (expense: Expense) => {
    const paidAtDefault = toDateOnly(new Date());
    const paidAt = window.prompt("Data de pagamento (YYYY-MM-DD)", paidAtDefault);
    if (!paidAt) return;
    const paidAmountDefault = String(expense.amount ?? "");
    const paidAmountRaw = window.prompt("Valor pago (ex.: 123.45)", paidAmountDefault);
    if (!paidAmountRaw) return;
    const paidAmount = Number(paidAmountRaw);
    const parsed = expenseUpdateSchema.parse({
      status: "PAID",
      paidAt,
      paidAmount,
    });
    const res = await fetch(`/api/expenses/${expense.id}`, {
      method: "PATCH",
      body: JSON.stringify(parsed),
      headers: { "Content-Type": "application/json" },
    });
    const payload = await res.json();
    if (payload.success) {
      toast.success("Despesa marcada como paga");
      loadFinancials();
    } else {
      toast.error(payload.error?.message ?? "Não foi possível marcar como paga");
    }
  };

  const unmarkExpensePaid = async (expense: Expense) => {
    if (!confirm("Desmarcar como paga? Isso limpará os campos de pagamento.")) return;
    const parsed = expenseUpdateSchema.parse({ status: "PENDING" });
    const res = await fetch(`/api/expenses/${expense.id}`, {
      method: "PATCH",
      body: JSON.stringify(parsed),
      headers: { "Content-Type": "application/json" },
    });
    const payload = await res.json();
    if (payload.success) {
      toast.success("Despesa desmarcada como paga");
      loadFinancials();
    } else {
      toast.error(payload.error?.message ?? "Não foi possível desmarcar");
    }
  };

  const totals = useMemo(() => {
    const incomeTotal = incomes.reduce((sum, income) => sum + Number(income.amount ?? 0), 0);
    const expenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
    return { incomeTotal, expenseTotal, balance: incomeTotal - expenseTotal };
  }, [incomes, expenses]);

  if (householdLoading || !household) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10 text-foreground md:py-14">
      <div className="mx-auto max-w-6xl space-y-10">
        <Breadcrumbs />
        <header>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Receitas & Despesas
          </p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            Gestão de entradas e saídas
          </h1>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Total receitas</p>
            {isLoading ? (
              <Skeleton className="mt-3 h-6 w-28" />
            ) : (
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {totals.incomeTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            )}
          </article>
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-px hover:shadow-md">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total despesas</p>
            {isLoading ? (
              <Skeleton className="mt-3 h-6 w-28" />
            ) : (
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {totals.expenseTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            )}
          </article>
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-px hover:shadow-md">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Saldo mensal</p>
            {isLoading ? (
              <Skeleton className="mt-3 h-6 w-28" />
            ) : (
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {totals.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            )}
          </article>
        </div>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
            <h2 className="text-lg font-semibold text-foreground">Receitas</h2>
            <form className="mt-4 space-y-4" onSubmit={handleIncomeSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Valor"
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                  value={incomeForm.amount}
                  onChange={(event) => setIncomeForm((prev) => ({ ...prev, amount: event.target.value }))}
                  required
                />
                <input
                  type="date"
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                  value={incomeForm.receivedAt}
                  onChange={(event) => setIncomeForm((prev) => ({ ...prev, receivedAt: event.target.value }))}
                  required
                />
              </div>
              <select
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                value={incomeForm.sourceId}
                onChange={(event) => setIncomeForm((prev) => ({ ...prev, sourceId: event.target.value }))}
              >
                <option value="">Fonte opcional</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={incomeForm.isRecurring}
                  onChange={(event) =>
                    setIncomeForm((prev) => ({ ...prev, isRecurring: event.target.checked }))
                  }
                />
                Receita recorrente
              </label>
              <label className="block text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Status
                <select
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                  value={incomeForm.status}
                  onChange={(event) =>
                    setIncomeForm((prev) => ({ ...prev, status: event.target.value as "SCHEDULED" | "RECEIVED" }))
                  }
                >
                  <option value="RECEIVED">Recebida</option>
                  <option value="SCHEDULED">Agendada</option>
                </select>
              </label>
              <button
                type="submit"
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
              >
                {editingIncomeId ? "Atualizar" : "Cadastrar receita"}
              </button>
            </form>
            <div className="mt-6 space-y-4">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full rounded-2xl" />
                  <Skeleton className="h-14 w-full rounded-2xl" />
                </div>
              ) : incomes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma receita cadastrada ainda.</p>
              ) : (
                incomes.map((income) => (
                  <div key={income.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                    <div>
                      <p className="text-base font-semibold text-foreground">{income.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateOnlyPtBr(income.receivedAt)}
                        {income.status === "SCHEDULED" ? " · agendada" : ""}
                        {income.isRecurring ? " · recorrente" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded-2xl border border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-foreground"
                        onClick={() => {
                          setEditingIncomeId(income.id);
                          setIncomeForm({
                            amount: income.amount.toString(),
                            receivedAt: toDateOnly(income.receivedAt),
                            sourceId: income.source?.id ?? "",
                            isRecurring: income.isRecurring ?? false,
                            status: income.status ?? "RECEIVED",
                          });
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="rounded-2xl border border-destructive/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-destructive"
                        onClick={() => deleteIncome(income.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
            <h2 className="text-lg font-semibold text-foreground">Despesas</h2>
            <form className="mt-4 space-y-4" onSubmit={handleExpenseSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Categoria"
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                  value={expenseForm.category}
                  onChange={(event) => setExpenseForm((prev) => ({ ...prev, category: event.target.value }))}
                  required
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Valor"
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                  value={expenseForm.amount}
                  onChange={(event) => setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="date"
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                  value={expenseForm.dueDate}
                  onChange={(event) => setExpenseForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                  required
                />
                <select
                  className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                  value={expenseForm.sourceId}
                  onChange={(event) => setExpenseForm((prev) => ({ ...prev, sourceId: event.target.value }))}
                >
                  <option value="">Fonte opcional</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>{source.name}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={expenseForm.isRecurring}
                  onChange={(event) => setExpenseForm((prev) => ({ ...prev, isRecurring: event.target.checked }))}
                />
                Despesa recorrente
              </label>
              <button
                type="submit"
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-primary-foreground"
              >
                {editingExpenseId ? "Atualizar" : "Cadastrar despesa"}
              </button>
            </form>
            <div className="mt-6 space-y-4">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full rounded-2xl" />
                  <Skeleton className="h-14 w-full rounded-2xl" />
                </div>
              ) : expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma despesa cadastrada ainda.</p>
              ) : (
                expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                    <div>
                      <p className="text-base font-semibold text-foreground">{expense.category}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateOnlyPtBr(expense.dueDate)}
                        {expense.status === "PAID" ? " · paga" : expense.status === "SCHEDULED" ? " · agendada" : " · pendente"}
                        {expense.isRecurring ? " · recorrente" : ""}
                      </p>
                      {expense.status === "PAID" ? (
                        <p className="text-xs text-muted-foreground">
                          Pago em {expense.paidAt ? formatDateOnlyPtBr(expense.paidAt) : "—"} ·{" "}
                          {(expense.paidAmount ?? expense.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">{expense.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                    </div>
                    <div className="flex gap-2">
                      {expense.status !== "PAID" ? (
                        <button
                          className="rounded-2xl border border-emerald-500/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400"
                          onClick={() => markExpensePaid(expense)}
                        >
                          Pagar
                        </button>
                      ) : (
                        <button
                          className="rounded-2xl border border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-foreground"
                          onClick={() => unmarkExpensePaid(expense)}
                        >
                          Desmarcar
                        </button>
                      )}
                      <button
                        className="rounded-2xl border border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-foreground"
                        onClick={() => {
                          setEditingExpenseId(expense.id);
                          setExpenseForm({
                            category: expense.category,
                            amount: expense.amount.toString(),
                            dueDate: toDateOnly(expense.dueDate),
                            sourceId: expense.source?.id ?? "",
                            isRecurring: expense.isRecurring ?? false,
                          });
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="rounded-2xl border border-destructive/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-destructive"
                        onClick={() => deleteExpense(expense.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
