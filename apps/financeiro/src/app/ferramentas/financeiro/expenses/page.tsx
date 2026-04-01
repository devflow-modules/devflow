"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  expenseCreateSchema,
  expenseUpdateSchema,
  incomeCreateSchema,
  incomeUpdateSchema,
} from "@/modules/financeiro/schemas";
import type { FinancialContext } from "@/modules/financeiro/schemas";
import { useHousehold } from "@/modules/financeiro/lib/household/HouseholdProvider";
import { Skeleton } from "@/modules/financeiro/components/Skeleton";
import { formatDateOnlyPtBr, toDateOnly } from "@/lib/dates";
import { Breadcrumbs } from "@/modules/financeiro/components/Breadcrumbs";
import { ContextSelector, ContextBadge, ContextSelectField } from "@/modules/financeiro/components/ContextSelector";
import type { ContextFilter } from "@/modules/financeiro/components/ContextSelector";

type FinancialSource = { id: string; name: string; sourceType: "PJ" | "PF" };
type Income = {
  id: string;
  amount: number;
  receivedAt: string;
  status?: "SCHEDULED" | "RECEIVED";
  isRecurring?: boolean;
  notes?: string | null;
  context?: FinancialContext;
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
  note?: string | null;
  context?: FinancialContext;
  source?: FinancialSource | null;
};

type IncomeForm = {
  amount: string;
  receivedAt: string;
  sourceId: string;
  isRecurring: boolean;
  status: "SCHEDULED" | "RECEIVED";
  notes: string;
  context: FinancialContext;
};

type ExpenseForm = {
  category: string;
  amount: string;
  dueDate: string;
  sourceId: string;
  isRecurring: boolean;
  note: string;
  context: FinancialContext;
};

const defaultIncomeForm: IncomeForm = {
  amount: "", receivedAt: "", sourceId: "", isRecurring: false,
  status: "RECEIVED", notes: "", context: "PERSONAL",
};
const defaultExpenseForm: ExpenseForm = {
  category: "", amount: "", dueDate: "", sourceId: "",
  isRecurring: false, note: "", context: "PERSONAL",
};

const fieldCls = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-400";

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
  const [contextFilter, setContextFilter] = useState<ContextFilter>("ALL");

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id]);

  const filteredIncomes = useMemo(() =>
    contextFilter === "ALL" ? incomes : incomes.filter((i) => (i.context ?? "PERSONAL") === contextFilter),
    [incomes, contextFilter]
  );
  const filteredExpenses = useMemo(() =>
    contextFilter === "ALL" ? expenses : expenses.filter((e) => (e.context ?? "PERSONAL") === contextFilter),
    [expenses, contextFilter]
  );

  const handleIncomeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingIncomeId) { await handleIncomeUpdate(); return; }
    const parsed = incomeCreateSchema.parse({
      amount: Number(incomeForm.amount),
      receivedAt: incomeForm.receivedAt,
      sourceId: incomeForm.sourceId || undefined,
      isRecurring: incomeForm.isRecurring,
      status: incomeForm.status,
      notes: incomeForm.notes || undefined,
      context: incomeForm.context,
    });
    const response = await fetch("/api/incomes", {
      method: "POST",
      body: JSON.stringify(parsed),
      headers: { "Content-Type": "application/json" },
    });
    const payload = await response.json();
    if (payload.success) {
      toast.success("Receita cadastrada");
      setIncomeForm({ ...defaultIncomeForm, context: incomeForm.context });
      loadFinancials();
    } else { toast.error(payload.error?.message ?? "Erro ao cadastrar"); }
  };

  const handleIncomeUpdate = async () => {
    if (!editingIncomeId) return;
    const parsed = incomeUpdateSchema.parse({
      amount: Number(incomeForm.amount),
      receivedAt: incomeForm.receivedAt,
      sourceId: incomeForm.sourceId || undefined,
      isRecurring: incomeForm.isRecurring,
      status: incomeForm.status,
      notes: incomeForm.notes || undefined,
      context: incomeForm.context,
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
    } else { toast.error(payload.error?.message ?? "Erro ao atualizar"); }
  };

  const handleExpenseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingExpenseId) { await handleExpenseUpdate(); return; }
    const parsed = expenseCreateSchema.parse({
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      dueDate: expenseForm.dueDate,
      sourceId: expenseForm.sourceId || undefined,
      isRecurring: expenseForm.isRecurring,
      note: expenseForm.note || undefined,
      context: expenseForm.context,
    });
    const res = await fetch("/api/expenses", {
      method: "POST",
      body: JSON.stringify(parsed),
      headers: { "Content-Type": "application/json" },
    });
    const payload = await res.json();
    if (payload.success) {
      toast.success("Despesa cadastrada");
      setExpenseForm({ ...defaultExpenseForm, context: expenseForm.context });
      loadFinancials();
    } else { toast.error(payload.error?.message ?? "Erro ao cadastrar"); }
  };

  const handleExpenseUpdate = async () => {
    if (!editingExpenseId) return;
    const parsed = expenseUpdateSchema.parse({
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      dueDate: expenseForm.dueDate,
      sourceId: expenseForm.sourceId || undefined,
      isRecurring: expenseForm.isRecurring,
      note: expenseForm.note || undefined,
      context: expenseForm.context,
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
    } else { toast.error(payload.error?.message ?? "Erro ao atualizar"); }
  };

  const deleteIncome = async (incomeId: string) => {
    if (!confirm("Excluir esta receita?")) return;
    const res = await fetch(`/api/incomes/${incomeId}`, { method: "DELETE" });
    const payload = await res.json();
    if (payload.success) { toast.success("Receita excluída"); loadFinancials(); }
    else { toast.error(payload.error?.message ?? "Erro ao excluir"); }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!confirm("Excluir esta despesa?")) return;
    const res = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
    const payload = await res.json();
    if (payload.success) { toast.success("Despesa excluída"); loadFinancials(); }
    else { toast.error(payload.error?.message ?? "Erro ao excluir"); }
  };

  const markExpensePaid = async (expense: Expense) => {
    const paidAtDefault = toDateOnly(new Date());
    const paidAt = window.prompt("Data de pagamento (YYYY-MM-DD)", paidAtDefault);
    if (!paidAt) return;
    const paidAmountRaw = window.prompt("Valor pago (ex.: 123.45)", String(expense.amount ?? ""));
    if (!paidAmountRaw) return;
    const paidAmount = Number(paidAmountRaw);
    const parsed = expenseUpdateSchema.parse({ status: "PAID", paidAt, paidAmount });
    const res = await fetch(`/api/expenses/${expense.id}`, {
      method: "PATCH", body: JSON.stringify(parsed),
      headers: { "Content-Type": "application/json" },
    });
    const payload = await res.json();
    if (payload.success) { toast.success("Marcada como paga"); loadFinancials(); }
    else { toast.error(payload.error?.message ?? "Erro ao marcar como paga"); }
  };

  const unmarkExpensePaid = async (expense: Expense) => {
    if (!confirm("Desmarcar como paga?")) return;
    const parsed = expenseUpdateSchema.parse({ status: "PENDING" });
    const res = await fetch(`/api/expenses/${expense.id}`, {
      method: "PATCH", body: JSON.stringify(parsed),
      headers: { "Content-Type": "application/json" },
    });
    const payload = await res.json();
    if (payload.success) { toast.success("Desmarcada"); loadFinancials(); }
    else { toast.error(payload.error?.message ?? "Erro"); }
  };

  const totals = useMemo(() => {
    const incomeTotal = filteredIncomes.reduce((sum, i) => sum + Number(i.amount ?? 0), 0);
    const expenseTotal = filteredExpenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
    return { incomeTotal, expenseTotal, balance: incomeTotal - expenseTotal };
  }, [filteredIncomes, filteredExpenses]);

  if (householdLoading || !household) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 text-foreground md:px-6 md:py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <Breadcrumbs />

        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Lançamentos</p>
            <h1 className="mt-1 text-3xl font-semibold text-foreground">Receitas & Despesas</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Ou use <kbd className="rounded border border-slate-300 px-1 py-0.5 text-[10px] font-mono">⌘K</kbd> para lançar em segundos
            </p>
          </div>
          <ContextSelector value={contextFilter} onChange={setContextFilter} />
        </header>

        {/* KPI cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Total receitas", value: totals.incomeTotal, color: "text-emerald-600" },
            { label: "Total despesas", value: totals.expenseTotal, color: "text-red-500" },
            {
              label: "Saldo",
              value: totals.balance,
              color: totals.balance >= 0 ? "text-emerald-600" : "text-red-500",
            },
          ].map(({ label, value, color }) => (
            <article key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
              {isLoading ? (
                <Skeleton className="mt-2 h-6 w-28" />
              ) : (
                <p className={`mt-1 text-2xl font-semibold ${color}`}>
                  {value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              )}
            </article>
          ))}
        </div>

        <section className="grid gap-6 lg:grid-cols-2">
          {/* Receitas */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">
              {editingIncomeId ? "✏️ Editando receita" : "➕ Nova receita"}
            </h2>
            <form className="space-y-3" onSubmit={handleIncomeSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number" min={0} step="0.01" placeholder="Valor (R$)" required
                  className={fieldCls} value={incomeForm.amount}
                  onChange={(e) => setIncomeForm((p) => ({ ...p, amount: e.target.value }))}
                />
                <input
                  type="date" required className={fieldCls} value={incomeForm.receivedAt}
                  onChange={(e) => setIncomeForm((p) => ({ ...p, receivedAt: e.target.value }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className={fieldCls} value={incomeForm.sourceId}
                  onChange={(e) => setIncomeForm((p) => ({ ...p, sourceId: e.target.value }))}
                >
                  <option value="">Fonte opcional</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <select
                  className={fieldCls} value={incomeForm.status}
                  onChange={(e) => setIncomeForm((p) => ({ ...p, status: e.target.value as "SCHEDULED" | "RECEIVED" }))}
                >
                  <option value="RECEIVED">Recebida</option>
                  <option value="SCHEDULED">Agendada</option>
                </select>
              </div>
              <ContextSelectField
                value={incomeForm.context}
                onChange={(v) => setIncomeForm((p) => ({ ...p, context: v }))}
              />
              <input
                type="text" placeholder="Observação (opcional)"
                className={fieldCls} value={incomeForm.notes}
                onChange={(e) => setIncomeForm((p) => ({ ...p, notes: e.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox" checked={incomeForm.isRecurring}
                  onChange={(e) => setIncomeForm((p) => ({ ...p, isRecurring: e.target.checked }))}
                />
                Receita recorrente
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  {editingIncomeId ? "Atualizar" : "Cadastrar receita"}
                </button>
                {editingIncomeId && (
                  <button
                    type="button"
                    className="rounded-xl border border-border px-4 py-2.5 text-sm text-foreground"
                    onClick={() => { setEditingIncomeId(null); setIncomeForm(defaultIncomeForm); }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <div className="mt-5 space-y-2">
              {isLoading ? (
                <><Skeleton className="h-14 w-full rounded-xl" /><Skeleton className="h-14 w-full rounded-xl" /></>
              ) : filteredIncomes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {contextFilter !== "ALL"
                    ? "Nenhuma receita neste contexto — troque o filtro ou lance uma entrada."
                    : "Sem receitas ainda — mostre pro cliente como cada entrada (PJ/PF/compartilhado) alimenta o saldo do mês."}
                </p>
              ) : (
                filteredIncomes.map((income) => (
                  <div key={income.id} className="flex items-start justify-between rounded-xl border border-border bg-background p-3 gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {Number(income.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateOnlyPtBr(income.receivedAt)}
                        {income.status === "SCHEDULED" ? " · agendada" : ""}
                        {income.isRecurring ? " · 🔁" : ""}
                        {income.source ? ` · ${income.source.name}` : ""}
                      </p>
                      {income.notes && <p className="text-xs text-muted-foreground truncate">{income.notes}</p>}
                      <ContextBadge context={income.context ?? "PERSONAL"} className="mt-1" />
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground"
                        onClick={() => {
                          setEditingIncomeId(income.id);
                          setIncomeForm({
                            amount: income.amount.toString(),
                            receivedAt: toDateOnly(income.receivedAt),
                            sourceId: income.source?.id ?? "",
                            isRecurring: income.isRecurring ?? false,
                            status: income.status ?? "RECEIVED",
                            notes: income.notes ?? "",
                            context: income.context ?? "PERSONAL",
                          });
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="rounded-lg border border-destructive/50 px-2.5 py-1.5 text-xs font-medium text-destructive"
                        onClick={() => deleteIncome(income.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Despesas */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-foreground">
              {editingExpenseId ? "✏️ Editando despesa" : "➕ Nova despesa"}
            </h2>
            <form className="space-y-3" onSubmit={handleExpenseSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text" placeholder="Categoria" required
                  className={fieldCls} value={expenseForm.category}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))}
                />
                <input
                  type="number" min={0} step="0.01" placeholder="Valor (R$)" required
                  className={fieldCls} value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="date" required className={fieldCls} value={expenseForm.dueDate}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, dueDate: e.target.value }))}
                />
                <select
                  className={fieldCls} value={expenseForm.sourceId}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, sourceId: e.target.value }))}
                >
                  <option value="">Fonte opcional</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <ContextSelectField
                value={expenseForm.context}
                onChange={(v) => setExpenseForm((p) => ({ ...p, context: v }))}
              />
              <input
                type="text" placeholder="Observação / nota"
                className={fieldCls} value={expenseForm.note}
                onChange={(e) => setExpenseForm((p) => ({ ...p, note: e.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox" checked={expenseForm.isRecurring}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, isRecurring: e.target.checked }))}
                />
                Despesa recorrente
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  {editingExpenseId ? "Atualizar" : "Cadastrar despesa"}
                </button>
                {editingExpenseId && (
                  <button
                    type="button"
                    className="rounded-xl border border-border px-4 py-2.5 text-sm text-foreground"
                    onClick={() => { setEditingExpenseId(null); setExpenseForm(defaultExpenseForm); }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <div className="mt-5 space-y-2">
              {isLoading ? (
                <><Skeleton className="h-14 w-full rounded-xl" /><Skeleton className="h-14 w-full rounded-xl" /></>
              ) : filteredExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {contextFilter !== "ALL"
                    ? "Nenhuma despesa neste contexto — ajuste o filtro ou cadastre um compromisso."
                    : "Sem despesas ainda — aqui você demonstra vencimentos, status pago/pendente e visão por categoria."}
                </p>
              ) : (
                filteredExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-start justify-between rounded-xl border border-border bg-background p-3 gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{expense.category}</p>
                        <span className={`text-xs font-medium ${
                          expense.status === "PAID" ? "text-emerald-600" :
                          expense.status === "SCHEDULED" ? "text-amber-500" : "text-slate-500"
                        }`}>
                          {expense.status === "PAID" ? "✓ paga" : expense.status === "SCHEDULED" ? "⏰ agendada" : "• pendente"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDateOnlyPtBr(expense.dueDate)}
                        {expense.isRecurring ? " · 🔁" : ""}
                        {expense.source ? ` · ${expense.source.name}` : ""}
                        {" · "}
                        <strong>{Number(expense.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                      </p>
                      {expense.status === "PAID" && expense.paidAt && (
                        <p className="text-xs text-muted-foreground">
                          Pago em {formatDateOnlyPtBr(expense.paidAt)} ·{" "}
                          {Number(expense.paidAmount ?? expense.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                      )}
                      {expense.note && <p className="text-xs text-muted-foreground truncate">{expense.note}</p>}
                      <ContextBadge context={expense.context ?? "PERSONAL"} className="mt-1" />
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {expense.status !== "PAID" ? (
                        <button
                          className="rounded-lg border border-emerald-400/60 px-2.5 py-1 text-xs font-medium text-emerald-600"
                          onClick={() => markExpensePaid(expense)}
                        >
                          Pagar
                        </button>
                      ) : (
                        <button
                          className="rounded-lg border border-border px-2.5 py-1 text-xs text-foreground"
                          onClick={() => unmarkExpensePaid(expense)}
                        >
                          Desmarcar
                        </button>
                      )}
                      <button
                        className="rounded-lg border border-border px-2.5 py-1 text-xs text-foreground"
                        onClick={() => {
                          setEditingExpenseId(expense.id);
                          setExpenseForm({
                            category: expense.category,
                            amount: expense.amount.toString(),
                            dueDate: toDateOnly(expense.dueDate),
                            sourceId: expense.source?.id ?? "",
                            isRecurring: expense.isRecurring ?? false,
                            note: expense.note ?? "",
                            context: expense.context ?? "PERSONAL",
                          });
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="rounded-lg border border-destructive/50 px-2.5 py-1 text-xs text-destructive"
                        onClick={() => deleteExpense(expense.id)}
                      >
                        ✕
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
