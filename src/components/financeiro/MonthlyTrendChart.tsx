"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  label: string;
  incomes: number;
  expenses: number;
  balance: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function MonthlyTrendChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
          <Tooltip formatter={(v: unknown) => formatCurrency(Number(v ?? 0))} />
          <Legend />
          <Line type="monotone" dataKey="incomes" name="Receitas" stroke="#38bdf8" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="expenses" name="Despesas" stroke="#fb7185" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="balance" name="Saldo" stroke="#34d399" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
