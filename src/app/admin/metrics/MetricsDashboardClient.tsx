"use client";

import { useCallback, useEffect, useState } from "react";
import { MetricsCard, MetricsSection, FunnelVisualization } from "@/components/admin/metrics";
import type { MetricsPayload } from "./actions";
import { getMetrics } from "./actions";

type Props = { initialData: MetricsPayload };

function get(g: Record<string, number>, key: string): number {
  return g[key] ?? 0;
}

export function MetricsDashboardClient({ initialData }: Props) {
  const [data, setData] = useState<MetricsPayload>(initialData);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getMetrics();
      setData(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const growth = data.growth.metrics;
  const finance = data.finance.metrics;

  const visitors = get(growth, "devflow.visitors.count");
  const simulator = get(growth, "devflow.simulator.usage");
  const leads = get(growth, "devflow.leads.submitted");
  const signupStarted = get(growth, "devflow.signup.started");
  const signupCompleted = get(growth, "devflow.signup.completed");
  const households = get(growth, "devflow.households.created");
  const activationExpense = get(growth, "devflow.activation.expense");
  const activationIncome = get(growth, "devflow.activation.income");
  const activationRule = get(growth, "devflow.activation.rule");

  const conversionVisitorToLead = visitors > 0 ? (leads / visitors) * 100 : 0;
  const conversionLeadToSignup = leads > 0 ? (signupCompleted / leads) * 100 : 0;
  const activationRate = households > 0 ? (activationExpense / households) * 100 : 0;

  const funnelSteps = [
    { label: "Visitors", value: visitors, key: "visitors" },
    { label: "Simulator used", value: simulator, key: "simulator" },
    { label: "Leads", value: leads, key: "leads" },
    { label: "Signup started", value: signupStarted, key: "signup_started" },
    { label: "Signup completed", value: signupCompleted, key: "signup_completed" },
    { label: "Households created", value: households, key: "households" },
    { label: "First expense", value: activationExpense, key: "activation_expense" },
    { label: "First income", value: activationIncome, key: "activation_income" },
    { label: "First rule", value: activationRule, key: "activation_rule" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Métricas internas</h1>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "Atualizando…" : "Atualizar"}
        </button>
      </div>

      <MetricsSection title="Finance Metrics">
        <MetricsCard label="Expenses created" value={get(finance, "finance.tool.expenses.usage")} />
        <MetricsCard label="Incomes created" value={get(finance, "finance.tool.incomes.usage")} />
        <MetricsCard label="Rules created" value={get(finance, "finance.feature.rules.created")} />
        <MetricsCard label="Rules updated" value={get(finance, "finance.feature.rules.updated")} />
        <MetricsCard label="Invites sent" value={get(finance, "finance.household.invites.sent")} />
        <MetricsCard label="Expenses (domain)" value={get(finance, "finance.expenses.created.count")} />
        <MetricsCard label="Incomes (domain)" value={get(finance, "finance.incomes.created.count")} />
      </MetricsSection>

      <MetricsSection title="Growth Funnel" className="mt-10">
        <MetricsCard label="Visitors" value={visitors} />
        <MetricsCard label="Simulator usage" value={simulator} />
        <MetricsCard label="Leads submitted" value={leads} />
        <MetricsCard label="Signup started" value={signupStarted} />
        <MetricsCard label="Signup completed" value={signupCompleted} />
        <MetricsCard label="Households created" value={households} />
      </MetricsSection>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Funil visual</h2>
        <div className="max-w-md">
          <FunnelVisualization steps={funnelSteps} />
        </div>
      </section>

      <MetricsSection title="Activation" className="mt-10">
        <MetricsCard label="First expense" value={activationExpense} />
        <MetricsCard label="First income" value={activationIncome} />
        <MetricsCard label="First rule" value={activationRule} />
      </MetricsSection>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Conversões</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricsCard
            label="Visitor → Lead"
            value={visitors > 0 ? `${conversionVisitorToLead.toFixed(1)}%` : "—"}
          />
          <MetricsCard
            label="Lead → Signup"
            value={leads > 0 ? `${conversionLeadToSignup.toFixed(1)}%` : "—"}
          />
          <MetricsCard
            label="Activation (expense / households)"
            value={households > 0 ? `${activationRate.toFixed(1)}%` : "—"}
          />
        </div>
      </section>
    </main>
  );
}
