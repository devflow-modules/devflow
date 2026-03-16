"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useHousehold } from "@/modules/financeiro/lib/household/HouseholdProvider";
import { toast } from "sonner";
import { Skeleton } from "@/modules/financeiro/components/Skeleton";
import { MonthlyTrendChart } from "@/modules/financeiro/components/MonthlyTrendChart";
import { CashFlowProjectionChart } from "@/modules/financeiro/components/CashFlowProjectionChart";
import { toDateOnly } from "@/lib/dates";
import { Breadcrumbs } from "@/modules/financeiro/components/Breadcrumbs";

type SourceRecord = { sourceType?: "PJ" | "PF" };
type FinancialRecord = {
  id?: string;
  amount: number;
  category?: string;
  receivedAt?: string;
  dueDate?: string;
  source?: SourceRecord | null;
};
type ApiSuccess<T> = { success: boolean; data: T };
type RuleSummary = { id: string; name: string; ruleType: string };
type AllocationSummary = { ruleId: string; ruleName: string; total: number };
type InviteSummary = { id: string; email: string; role: "MEMBER" | "OWNER"; expiresAt: string; createdAt: string };
type IncomeAllocationGoal = {
  id: string;
  year: number;
  month: number;
  investmentPercent?: number | null;
  savingsPercent?: number | null;
  investmentAmount?: number | null;
  savingsAmount?: number | null;
  observations?: string | null;
};
type PersonalAllocationGoal = IncomeAllocationGoal;

type CategoryBreakdown = { category: string; value: number; percentage: number };
type OverviewCategoryBreakdown = { categoryId: string | null; categoryName: string; color: string | null; value: number; percentage: number };
type BudgetProgressItem = { budgetId: string; categoryId: string; categoryName: string; color: string; spent: number; monthlyLimit: number; percent: number };
type DashboardOverview = { totalSpent: number; categoryBreakdown: OverviewCategoryBreakdown[]; budgetProgress: BudgetProgressItem[] };
type ProjectionMeta = {
  scenario?: "BASE" | "PESSIMISTIC" | "OPTIMISTIC";
  avgMonths?: number;
  estimateMethod?: string;
  incomeMultiplier?: number;
  expenseMultiplier?: number;
  horizonDays?: number;
  horizonMonths?: number | null;
  from?: string;
  to?: string;
  includedExpenseStatuses?: string[];
  startingBalancePolicy?: string;
};

export default function DashboardPage() {
  const { household, households, setHousehold, isLoading: householdLoading, activeMembershipRole } = useHousehold();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incomes, setIncomes] = useState<FinancialRecord[]>([]);
  const [expenses, setExpenses] = useState<FinancialRecord[]>([]);
  const [rules, setRules] = useState<RuleSummary[]>([]);
  const [allocations, setAllocations] = useState<AllocationSummary[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "OWNER">("MEMBER");
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<InviteSummary[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesError, setInvitesError] = useState<string | null>(null);
  const [goal, setGoal] = useState<IncomeAllocationGoal | null>(null);
  const [goalLoading, setGoalLoading] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [goalForm, setGoalForm] = useState({
    investmentPercent: "",
    savingsPercent: "",
    investmentAmount: "",
    savingsAmount: "",
    observations: "",
  });
  const [personalGoal, setPersonalGoal] = useState<PersonalAllocationGoal | null>(null);
  const [personalGoalLoading, setPersonalGoalLoading] = useState(false);
  const [personalGoalError, setPersonalGoalError] = useState<string | null>(null);
  const [personalGoalForm, setPersonalGoalForm] = useState({
    investmentPercent: "",
    savingsPercent: "",
    investmentAmount: "",
    savingsAmount: "",
    observations: "",
  });
  const [summarySeries, setSummarySeries] = useState<{ label: string; incomes: number; expenses: number; balance: number }[]>([]);
  const [projectionSeries, setProjectionSeries] = useState<{ date: string; projectedBalance: number; expectedIncomes: number; expectedExpenses: number }[]>([]);
  const [projectionMeta, setProjectionMeta] = useState<ProjectionMeta | null>(null);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [projectionScenario, setProjectionScenario] = useState<"BASE" | "PESSIMISTIC" | "OPTIMISTIC">("BASE");
  const [projectionHorizonMonths, setProjectionHorizonMonths] = useState<1 | 3 | 6 | 12>(1);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const fetchFinancials = async () => {
    if (!household?.id) return;
    setIsLoading(true);
    setError(null);

    try {
      const [incomeRes, expenseRes] = await Promise.all([
        fetch(`/api/incomes`),
        fetch(`/api/expenses`),
      ]);

      const incomePayload: ApiSuccess<FinancialRecord[]> = await incomeRes.json();
      const expensePayload: ApiSuccess<FinancialRecord[]> = await expenseRes.json();

      setIncomes(incomePayload.data ?? []);
      setExpenses(expensePayload.data ?? []);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os dados financeiros.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRules = async () => {
    if (!household?.id) return;
    try {
      const [rulesRes, allocationsRes] = await Promise.all([
        fetch(`/api/rules`),
        fetch(`/api/rules/allocations`),
      ]);

      const rulesPayload = await rulesRes.json();
      const allocationsPayload = await allocationsRes.json();

      setRules(rulesPayload.data ?? []);
      const history: AllocationSummary[] = allocationsPayload.data?.allocations?.map((allocation: { ruleId: string; ruleName: string; allocations: { amount?: number }[] }) => ({
        ruleId: allocation.ruleId,
        ruleName: allocation.ruleName,
        total: allocation.allocations.reduce((sum: number, entry: { amount?: number }) => sum + Number(entry.amount ?? 0), 0),
      })) ?? [];
      setAllocations(history);
    } catch (err) {
      console.error(err);
    }
  };

  const loadInvites = async () => {
    if (!household?.id) return;
    setInvitesLoading(true);
    setInvitesError(null);
    try {
      const res = await fetch("/api/invites");
      const payload = await res.json();
      if (!payload.success) {
        setInvitesError(payload.error?.message ?? "Não foi possível carregar convites.");
        setPendingInvites([]);
        return;
      }
      setPendingInvites(payload.data ?? []);
    } catch (err) {
      console.error(err);
      setInvitesError("Não foi possível carregar convites.");
    } finally {
      setInvitesLoading(false);
    }
  };

  const loadGoal = async () => {
    if (!household?.id) return;
    setGoalLoading(true);
    setGoalError(null);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const res = await fetch(`/api/income-allocation-goals?year=${year}&month=${month}`);
      const payload = await res.json();
      if (!payload.success) {
        setGoalError(payload.error?.message ?? "Não foi possível carregar metas.");
        setGoal(null);
        return;
      }
      setGoal(payload.data ?? null);
      const data = payload.data as IncomeAllocationGoal | null;
      if (data) {
        setGoalForm({
          investmentPercent: data.investmentPercent?.toString() ?? "",
          savingsPercent: data.savingsPercent?.toString() ?? "",
          investmentAmount: data.investmentAmount?.toString() ?? "",
          savingsAmount: data.savingsAmount?.toString() ?? "",
          observations: data.observations ?? "",
        });
      }
    } catch (err) {
      console.error(err);
      setGoalError("Não foi possível carregar metas.");
    } finally {
      setGoalLoading(false);
    }
  };

  const loadPersonalGoal = async () => {
    if (!household?.id) return;
    setPersonalGoalLoading(true);
    setPersonalGoalError(null);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const res = await fetch(`/api/personal-allocation-goals?year=${year}&month=${month}`);
      const payload = await res.json();
      if (!payload.success) {
        setPersonalGoalError(payload.error?.message ?? "Não foi possível carregar sua meta.");
        setPersonalGoal(null);
        return;
      }
      setPersonalGoal(payload.data ?? null);
      const data = payload.data as PersonalAllocationGoal | null;
      if (data) {
        setPersonalGoalForm({
          investmentPercent: data.investmentPercent?.toString() ?? "",
          savingsPercent: data.savingsPercent?.toString() ?? "",
          investmentAmount: data.investmentAmount?.toString() ?? "",
          savingsAmount: data.savingsAmount?.toString() ?? "",
          observations: data.observations ?? "",
        });
      }
    } catch (err) {
      console.error(err);
      setPersonalGoalError("Não foi possível carregar sua meta.");
    } finally {
      setPersonalGoalLoading(false);
    }
  };

  const loadCharts = async () => {
    if (!household?.id) return;
    setChartsLoading(true);
    try {
      const [summaryRes, projRes] = await Promise.all([
        fetch("/api/dashboard/summary?months=6"),
        fetch(`/api/dashboard/cash-flow-projection?horizonMonths=${projectionHorizonMonths}&scenario=${projectionScenario}`),
      ]);
      const [summaryPayload, projPayload] = await Promise.all([summaryRes.json(), projRes.json()]);
      if (summaryPayload.success) setSummarySeries(summaryPayload.data?.series ?? []);
      if (projPayload.success) {
        setProjectionSeries(projPayload.data?.series ?? []);
        setProjectionMeta(projPayload.data?.meta ?? null);
      }
    } finally {
      setChartsLoading(false);
    }
  };

  const loadOverview = async () => {
    if (!household?.id) return;
    setOverviewLoading(true);
    try {
      const res = await fetch("/api/dashboard/overview");
      const payload = await res.json();
      if (payload.success && payload.data) setOverview(payload.data);
      else setOverview(null);
    } catch {
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    if (household?.id) {
      fetchFinancials();
      fetchRules();
      loadCharts();
      loadOverview();
      loadGoal();
      loadPersonalGoal();
      if (activeMembershipRole === "OWNER") loadInvites();
    }
  }, [household?.id, activeMembershipRole]);

  useEffect(() => {
    if (household?.id) loadCharts();
  }, [projectionScenario, projectionHorizonMonths, household?.id]);

  const totals = useMemo(() => {
    const sumBySource = (records: FinancialRecord[], sourceType: SourceRecord["sourceType"]) =>
      records.reduce((acc, record) => (record.source?.sourceType === sourceType ? acc + Number(record.amount ?? 0) : acc), 0);

    const totalIncomes = incomes.reduce((acc, record) => acc + Number(record.amount ?? 0), 0);
    const totalExpenses = expenses.reduce((acc, record) => acc + Number(record.amount ?? 0), 0);

    return {
      totalIncomes,
      totalExpenses,
      balance: totalIncomes - totalExpenses,
      pjIncomes: sumBySource(incomes, "PJ"),
      pfIncomes: sumBySource(incomes, "PF"),
      pjExpenses: sumBySource(expenses, "PJ"),
      pfExpenses: sumBySource(expenses, "PF"),
    };
  }, [incomes, expenses]);

  const allocationSummary = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

    const monthIncomeTotal = incomes.reduce((acc, record: FinancialRecord) => {
      if (!record.receivedAt) return acc;
      const dateOnly = toDateOnly(record.receivedAt);
      if (dateOnly.slice(0, 7) !== monthKey) return acc;
      return acc + Number(record.amount ?? 0);
    }, 0);

    const investmentByPercent =
      goal?.investmentPercent != null ? (monthIncomeTotal * Number(goal.investmentPercent)) / 100 : null;
    const savingsByPercent =
      goal?.savingsPercent != null ? (monthIncomeTotal * Number(goal.savingsPercent)) / 100 : null;

    const investmentTarget = Number(goal?.investmentAmount ?? investmentByPercent ?? 0);
    const savingsTarget = Number(goal?.savingsAmount ?? savingsByPercent ?? 0);
    const remaining = monthIncomeTotal - investmentTarget - savingsTarget;

    return { monthIncomeTotal, investmentTarget, savingsTarget, remaining };
  }, [incomes, goal]);

  const categoryBreakdown = useMemo(() => {
    const totalsByCategory = expenses.reduce<Record<string, number>>((acc, expense) => {
      const category = expense.category ?? "Outros";
      acc[category] = (acc[category] ?? 0) + Number(expense.amount ?? 0);
      return acc;
    }, {});

    const total = Object.values(totalsByCategory).reduce((sum, value) => sum + value, 0) || 1;

    return Object.entries(totalsByCategory).map(([category, value]) => ({
      category,
      value,
      percentage: Number(((value / total) * 100).toFixed(1)),
    }));
  }, [expenses]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  const formatDate = (value: string) => new Date(value).toLocaleDateString("pt-BR");
  const scenarioLabel = (value: ProjectionMeta["scenario"]) =>
    value === "PESSIMISTIC" ? "pessimista" : value === "OPTIMISTIC" ? "otimista" : "base";

  if (householdLoading || (!household && !error)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-14">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-14">
        <p className="text-sm text-muted-foreground">Nenhuma casa ativa. Complete o onboarding.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10 text-foreground md:py-14">
      <div className="mx-auto max-w-6xl space-y-8">
        <Breadcrumbs />
        {!isLoading && incomes.length === 0 && expenses.length === 0 ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
            <strong>Pronto!</strong> Que tal usar uma ferramenta grátis?{" "}
            <Link href="/ferramentas" className="font-semibold text-primary underline hover:opacity-90">
              Ver ferramentas
            </Link>
          </div>
        ) : null}
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Dashboard</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            Resumo financeiro
          </h1>
          <p className="text-base text-muted-foreground">
            Totais por origem (PJ/PF), gráficos e histórico rápido das regras aplicadas.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-px hover:shadow-md">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Receitas</p>
            {isLoading ? (
              <Skeleton className="mt-3 h-8 w-32" />
            ) : (
              <p className="mt-2 text-3xl font-semibold text-foreground">{formatCurrency(totals.totalIncomes)}</p>
            )}
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Despesas</p>
            {isLoading ? (
              <Skeleton className="mt-3 h-8 w-32" />
            ) : (
              <p className="mt-2 text-3xl font-semibold text-foreground">{formatCurrency(totals.totalExpenses)}</p>
            )}
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Gasto no mês</p>
            {overviewLoading ? (
              <Skeleton className="mt-3 h-8 w-32" />
            ) : (
              <p className="mt-2 text-3xl font-semibold text-foreground">{formatCurrency(overview?.totalSpent ?? 0)}</p>
            )}
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-px hover:shadow-md">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Saldo</p>
            {isLoading ? (
              <Skeleton className="mt-3 h-8 w-32" />
            ) : (
              <p className="mt-2 text-3xl font-semibold text-foreground">{formatCurrency(totals.balance)}</p>
            )}
          </article>
        </div>

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md lg:grid-cols-[2fr,1fr]">
          <div>
            <h2 className="text-base uppercase tracking-[0.2em] text-muted-foreground">PJ vs PF</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-card p-4 shadow-sm transition hover:-translate-y-px hover:shadow-md">
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">PJ entradas</p>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-semibold text-foreground">{formatCurrency(totals.pjIncomes)}</p>
                    <p className="text-sm text-muted-foreground">Saídas: {formatCurrency(totals.pjExpenses)}</p>
                  </>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-card p-4 shadow-sm transition hover:-translate-y-px hover:shadow-md">
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">PF entradas</p>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-semibold text-foreground">{formatCurrency(totals.pfIncomes)}</p>
                    <p className="text-sm text-muted-foreground">Saídas: {formatCurrency(totals.pfExpenses)}</p>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Casa ativa</p>
            {households.length > 1 ? (
              <select
                className="w-full rounded-2xl border border-slate-200 bg-card px-3 py-2 text-sm text-foreground"
                value={household.id}
                onChange={(event) => {
                  const nextHousehold = households.find((h) => h.id === event.target.value) ?? null;
                  if (nextHousehold) setHousehold(nextHousehold);
                }}
              >
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.slug})
                  </option>
                ))}
              </select>
            ) : null}
            {household ? (
              <div className="space-y-1">
                <p className="text-lg font-semibold text-foreground">{household.name}</p>
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Slug: {household.slug}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma casa carregada.</p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-foreground hover:bg-slate-50"
                onClick={() => { fetchFinancials(); fetchRules(); loadOverview(); }}
              >
                Atualizar
              </button>
            </div>
            {activeMembershipRole === "OWNER" && (
            <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-card p-3">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Convidar</p>
              <div className="grid gap-2">
                <input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-foreground"
                />
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-foreground"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "MEMBER" | "OWNER")}
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="OWNER">OWNER</option>
                </select>
                <button
                  type="button"
                  className="rounded-2xl bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary-foreground hover:opacity-90"
                  onClick={async () => {
                    setLastInviteUrl(null);
                    const res = await fetch("/api/invites", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
                    });
                    const payload = await res.json();
                    if (!payload.success) {
                      toast.error(payload.error?.message ?? "Erro ao criar convite");
                      return;
                    }
                    const url = payload.data?.acceptUrl as string | undefined;
                    if (url) {
                      setLastInviteUrl(url);
                      try {
                        await navigator.clipboard.writeText(url);
                        toast.success("Convite criado (link copiado)");
                      } catch {
                        toast.success("Convite criado");
                      }
                    } else {
                      toast.success("Convite criado");
                    }
                    setInviteEmail("");
                    loadInvites();
                  }}
                  disabled={!inviteEmail}
                >
                  Gerar link
                </button>
                {lastInviteUrl ? (
                  <p className="break-all text-sm text-foreground">
                    Link: <a className="underline text-primary" href={lastInviteUrl}>{lastInviteUrl}</a>
                  </p>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                Apenas OWNER pode criar convites. O link expira em 7 dias.
              </p>
            </div>
            )}
            {activeMembershipRole === "OWNER" && (
            <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-card p-3">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Convites pendentes</p>
              {invitesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded-xl" />
                  <Skeleton className="h-4 w-4/5 rounded-xl" />
                  <Skeleton className="h-4 w-3/5 rounded-xl" />
                </div>
              ) : invitesError ? (
                <p className="text-sm text-rose-600">{invitesError}</p>
              ) : pendingInvites.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>
              ) : (
                <div className="space-y-2">
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                      <div>
                        <p className="text-sm text-foreground">{invite.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {invite.role} · expira em {formatDate(invite.expiresAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-xl border border-rose-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-rose-700 hover:bg-rose-50"
                        onClick={async () => {
                          const res = await fetch(`/api/invites/${invite.id}`, { method: "DELETE" });
                          const payload = await res.json();
                          if (!payload.success) {
                            toast.error(payload.error?.message ?? "Não foi possível revogar o convite");
                            return;
                          }
                          toast.success("Convite revogado");
                          loadInvites();
                        }}
                      >
                        Revogar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
            {activeMembershipRole === "OWNER" && (
            <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-card p-3">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Meta da família (total da casa)</p>
              {goalLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded-xl" />
                  <Skeleton className="h-4 w-4/5 rounded-xl" />
                </div>
              ) : goalError ? (
                <p className="text-sm text-rose-600">{goalError}</p>
              ) : (
                <>
                  <div className="grid gap-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="% investir (opcional)"
                        value={goalForm.investmentPercent}
                        onChange={(e) => setGoalForm((p) => ({ ...p, investmentPercent: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-foreground"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="% guardar (opcional)"
                        value={goalForm.savingsPercent}
                        onChange={(e) => setGoalForm((p) => ({ ...p, savingsPercent: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-foreground"
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="R$ investir (opcional)"
                        value={goalForm.investmentAmount}
                        onChange={(e) => setGoalForm((p) => ({ ...p, investmentAmount: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-foreground"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="R$ guardar (opcional)"
                        value={goalForm.savingsAmount}
                        onChange={(e) => setGoalForm((p) => ({ ...p, savingsAmount: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-foreground"
                      />
                    </div>
                    <textarea
                      placeholder="Observações"
                      value={goalForm.observations}
                      onChange={(e) => setGoalForm((p) => ({ ...p, observations: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-foreground"
                      rows={3}
                    />
                    <button
                      type="button"
                      className="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:opacity-90"
                      onClick={async () => {
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = now.getMonth() + 1;
                        const body = {
                          year,
                          month,
                          investmentPercent: goalForm.investmentPercent ? Number(goalForm.investmentPercent) : undefined,
                          savingsPercent: goalForm.savingsPercent ? Number(goalForm.savingsPercent) : undefined,
                          investmentAmount: goalForm.investmentAmount ? Number(goalForm.investmentAmount) : undefined,
                          savingsAmount: goalForm.savingsAmount ? Number(goalForm.savingsAmount) : undefined,
                          observations: goalForm.observations || undefined,
                        };
                        const res = await fetch("/api/income-allocation-goals", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(body),
                        });
                        const payload = await res.json();
                        if (!payload.success) {
                          toast.error(payload.error?.message ?? "Não foi possível salvar metas");
                          return;
                        }
                        toast.success("Meta da família salva");
                        loadGoal();
                      }}
                    >
                      Salvar meta da família
                    </button>
                  </div>

                  {goal ? (
                    <div className="mt-3 space-y-1 rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Resumo (mês atual)</p>
                      <p className="text-sm text-foreground">Receitas no mês: {formatCurrency(allocationSummary.monthIncomeTotal)}</p>
                      <p className="text-sm text-foreground">Investir: {formatCurrency(allocationSummary.investmentTarget)}</p>
                      <p className="text-sm text-foreground">Guardar: {formatCurrency(allocationSummary.savingsTarget)}</p>
                      <p className="text-sm text-foreground">Livre: {formatCurrency(allocationSummary.remaining)}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Defina a meta da família para calcular investimento e reserva.</p>
                  )}
                </>
              )}
            </div>
            )}
            {activeMembershipRole === "MEMBER" && goal && (
            <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-card p-3">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Meta da família (total da casa)</p>
              <p className="text-sm text-muted-foreground">
                Investir: {goal.investmentPercent != null ? `${Number(goal.investmentPercent)}%` : goal.investmentAmount != null ? formatCurrency(Number(goal.investmentAmount)) : "—"} · Guardar: {goal.savingsPercent != null ? `${Number(goal.savingsPercent)}%` : goal.savingsAmount != null ? formatCurrency(Number(goal.savingsAmount)) : "—"}
              </p>
              <p className="text-sm text-muted-foreground">Definida pelo responsável da casa. Abaixo, sua meta pessoal.</p>
            </div>
            )}
            <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-card p-3">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Minha meta pessoal (investir / guardar)</p>
              {personalGoalLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded-xl" />
                  <Skeleton className="h-4 w-4/5 rounded-xl" />
                </div>
              ) : personalGoalError ? (
                <p className="text-sm text-rose-600">{personalGoalError}</p>
              ) : (
                <>
                  <div className="grid gap-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="% investir (opcional)"
                        value={personalGoalForm.investmentPercent}
                        onChange={(e) => setPersonalGoalForm((p) => ({ ...p, investmentPercent: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-foreground"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="% guardar (opcional)"
                        value={personalGoalForm.savingsPercent}
                        onChange={(e) => setPersonalGoalForm((p) => ({ ...p, savingsPercent: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-foreground"
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="R$ investir (opcional)"
                        value={personalGoalForm.investmentAmount}
                        onChange={(e) => setPersonalGoalForm((p) => ({ ...p, investmentAmount: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-foreground"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="R$ guardar (opcional)"
                        value={personalGoalForm.savingsAmount}
                        onChange={(e) => setPersonalGoalForm((p) => ({ ...p, savingsAmount: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-foreground"
                      />
                    </div>
                    <textarea
                      placeholder="Observações"
                      value={personalGoalForm.observations}
                      onChange={(e) => setPersonalGoalForm((p) => ({ ...p, observations: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-foreground"
                      rows={2}
                    />
                    <button
                      type="button"
                      className="rounded-2xl bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary-foreground hover:opacity-90"
                      onClick={async () => {
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = now.getMonth() + 1;
                        const body = {
                          year,
                          month,
                          investmentPercent: personalGoalForm.investmentPercent ? Number(personalGoalForm.investmentPercent) : undefined,
                          savingsPercent: personalGoalForm.savingsPercent ? Number(personalGoalForm.savingsPercent) : undefined,
                          investmentAmount: personalGoalForm.investmentAmount ? Number(personalGoalForm.investmentAmount) : undefined,
                          savingsAmount: personalGoalForm.savingsAmount ? Number(personalGoalForm.savingsAmount) : undefined,
                          observations: personalGoalForm.observations || undefined,
                        };
                        const res = await fetch("/api/personal-allocation-goals", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(body),
                        });
                        const payload = await res.json();
                        if (!payload.success) {
                          toast.error(payload.error?.message ?? "Não foi possível salvar sua meta");
                          return;
                        }
                        toast.success("Sua meta pessoal foi salva");
                        loadPersonalGoal();
                      }}
                    >
                      Salvar minha meta
                    </button>
                  </div>
                  {personalGoal ? (
                    <p className="mt-2 text-sm text-muted-foreground">Sua meta pessoal do mês está salva. Ajuste acima se quiser.</p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base uppercase tracking-[0.2em] text-muted-foreground">Fluxo por categoria (mês)</h3>
              <span className="text-sm text-muted-foreground">Total gasto + %</span>
            </div>
            <div className="mt-4 space-y-3">
              {overviewLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/3 rounded-xl" />
                  <Skeleton className="h-2 w-full rounded-xl" />
                  <Skeleton className="h-4 w-1/2 rounded-xl" />
                </div>
              ) : (overview?.categoryBreakdown?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma despesa no mês para compor o gráfico.</p>
              ) : (
                (overview?.categoryBreakdown ?? []).map((item) => (
                  <div key={item.categoryId ?? item.categoryName} className="space-y-1">
                    <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">{item.categoryName}</p>
                    <div className="relative h-2 rounded-full bg-slate-100">
                      <div
                        className="absolute h-full rounded-full"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color ?? "var(--primary)",
                        }}
                      />
                    </div>
                    <p className="text-sm text-foreground">
                      {formatCurrency(item.value)} · {item.percentage}%
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <h3 className="text-base uppercase tracking-[0.2em] text-muted-foreground">Orçamento do mês</h3>
            <div className="mt-4 space-y-4">
              {overviewLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : (overview?.budgetProgress?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum orçamento configurado. Crie categorias e defina limites em Configurações.</p>
              ) : (
                (overview?.budgetProgress ?? []).map((b) => (
                  <div key={b.budgetId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground" style={{ color: b.color }}>{b.categoryName}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(b.spent)} / {formatCurrency(b.monthlyLimit)}
                      </span>
                    </div>
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, b.percent)}%`,
                          backgroundColor: b.percent > 100 ? "#dc2626" : b.color,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{b.percent.toFixed(0)}% do limite</p>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <h3 className="text-base uppercase tracking-[0.2em] text-muted-foreground">Últimas regras aplicadas</h3>
            <ul className="mt-4 space-y-3 text-sm text-foreground">
              {isLoading ? (
                <>
                  <li><Skeleton className="h-12 w-full rounded-2xl" /></li>
                  <li><Skeleton className="h-12 w-full rounded-2xl" /></li>
                </>
              ) : allocations.length === 0 ? (
                <li className="text-sm text-muted-foreground">Nenhum rateio calculado ainda.</li>
              ) : (
                allocations.map((allocation) => (
                  <li key={allocation.ruleId} className="rounded-2xl border border-slate-200 bg-card p-3">
                    <p className="font-semibold text-foreground">{allocation.ruleName}</p>
                    <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                      {formatCurrency(allocation.total)} total alocado
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base uppercase tracking-[0.2em] text-muted-foreground">Evolução (últimos meses)</h3>
              <span className="text-sm text-muted-foreground">Receitas · Despesas · Saldo</span>
            </div>
            <div className="mt-4">
              {chartsLoading ? <Skeleton className="h-64 w-full rounded-2xl" /> : <MonthlyTrendChart data={summarySeries} />}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base uppercase tracking-[0.2em] text-muted-foreground">Projeção de fluxo</h3>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-xl border border-slate-200 bg-card px-2 py-1 text-sm text-foreground"
                  value={projectionHorizonMonths}
                  onChange={(e) => setProjectionHorizonMonths(Number(e.target.value) as 1 | 3 | 6 | 12)}
                >
                  <option value={1}>1 mês</option>
                  <option value={3}>3 meses</option>
                  <option value={6}>6 meses</option>
                  <option value={12}>12 meses</option>
                </select>
                <select
                  className="rounded-xl border border-slate-200 bg-card px-2 py-1 text-sm text-foreground"
                  value={projectionScenario}
                  onChange={(e) => setProjectionScenario(e.target.value as "BASE" | "PESSIMISTIC" | "OPTIMISTIC")}
                >
                  <option value="BASE">Base</option>
                  <option value="PESSIMISTIC">Pessimista</option>
                  <option value="OPTIMISTIC">Otimista</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              {chartsLoading ? <Skeleton className="h-64 w-full rounded-2xl" /> : <CashFlowProjectionChart data={projectionSeries} />}
              <p className="mt-2 text-sm text-muted-foreground">
                Estimativa por fonte: média móvel mensal (últimos {projectionMeta?.avgMonths ?? 3} meses) · cenário{" "}
                {scenarioLabel(projectionMeta?.scenario ?? projectionScenario)}
                {" "}· receitas ×{(projectionMeta?.incomeMultiplier ?? 1).toFixed(2)} · despesas ×
                {(projectionMeta?.expenseMultiplier ?? 1).toFixed(2)}.
              </p>
              <details className="mt-3 rounded-2xl border border-slate-200 bg-card p-3 text-sm text-foreground">
                <summary className="cursor-pointer uppercase tracking-[0.2em] text-muted-foreground">
                  Como calculamos
                </summary>
                <div className="mt-3 space-y-2">
                  <p>
                    Cenário: <span className="font-medium">{scenarioLabel(projectionMeta?.scenario ?? projectionScenario)}</span>
                    {" "}· multiplicadores: receitas ×{(projectionMeta?.incomeMultiplier ?? 1).toFixed(2)} e despesas ×
                    {(projectionMeta?.expenseMultiplier ?? 1).toFixed(2)}.
                  </p>
                  <p>
                    Média móvel: últimos <span className="font-medium">{projectionMeta?.avgMonths ?? 3}</span> meses por fonte.
                  </p>
                  <p>
                    Horizonte:{" "}
                    <span className="font-medium">
                      {projectionMeta?.horizonMonths ? `${projectionMeta.horizonMonths} meses` : `${projectionMeta?.horizonDays ?? 30} dias`}
                    </span>
                    {projectionMeta?.from && projectionMeta?.to ? ` · período ${projectionMeta.from} → ${projectionMeta.to}` : null}
                  </p>
                  <p>
                    Despesas incluídas:{" "}
                    <span className="font-medium">
                      {(projectionMeta?.includedExpenseStatuses ?? ["PENDING", "SCHEDULED"]).join(", ")}
                    </span>
                    {" "}no período; saldo inicial = receitas anteriores - despesas anteriores não pagas.
                  </p>
                </div>
              </details>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
