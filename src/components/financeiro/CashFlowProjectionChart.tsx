"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  date: string;
  projectedBalance: number;
  expectedIncomes: number;
  expectedExpenses: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function CashFlowProjectionChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#64748b" fontSize={12} hide />
          <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
          <Tooltip
            formatter={(v: unknown, _name: unknown) => formatCurrency(Number(v ?? 0))}
            labelFormatter={(label) => `Data: ${label}`}
          />
          <Line type="monotone" dataKey="projectedBalance" name="Saldo projetado" stroke="#a78bfa" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
