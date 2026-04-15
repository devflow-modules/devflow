"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import type { UsageByPlan, RevenueByType } from "@/modules/billing/admin/billingDashboardTypes";

type UsageChartsProps = {
  usageByPlan: UsageByPlan[];
};

export function BillingUsageByPlanCharts({ usageByPlan }: UsageChartsProps) {
  const msgData = usageByPlan.map((u) => ({
    name: u.plan,
    value: u.messages,
    fill: u.plan === "FREE" ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))",
  }));
  const aiData = usageByPlan.map((u) => ({
    name: u.plan,
    value: u.ai,
    fill: u.plan === "FREE" ? "hsl(142 76% 36%)" : "hsl(217 91% 60%)",
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          Uso de mensagens (FREE vs operação contratada)
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={msgData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR")} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {msgData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          Uso de IA (FREE vs operação contratada)
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aiData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR")} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {aiData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

type RevenueChartProps = {
  revenueByType: RevenueByType[];
};

const REVENUE_COLORS = ["hsl(var(--primary))", "hsl(142 76% 36%)", "hsl(217 91% 60%)"];

export function BillingRevenueByTypeChart({ revenueByType }: RevenueChartProps) {
  const data = revenueByType.map((r, i) => ({
    name: r.type === "recorrente" ? "Recorrente" : r.type === "overage_mensagens" ? "Overage msgs" : "Overage IA",
    value: r.value,
    fill: REVENUE_COLORS[i % REVENUE_COLORS.length],
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Receita por tipo
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, value }) =>
                value > 0 ? `${name}: R$ ${value.toFixed(0)}` : ""
              }
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) =>
                new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(v)
              }
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
