"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useHousehold } from "@/modules/financeiro/lib/household/HouseholdProvider";
import { Skeleton } from "@/modules/financeiro/components/Skeleton";
import { Breadcrumbs } from "@/modules/financeiro/components/Breadcrumbs";

const MONTH_NAMES = [
  "", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

type Snapshot = {
  id: string;
  year: number;
  month: number;
  totalIncomes: number;
  totalExpenses: number;
  balance: number;
  pendingExpenses: number;
  notes?: string | null;
  closedAt: string;
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function HistoricoPage() {
  const { household, isLoading: householdLoading, activeMembershipRole } = useHousehold();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);

  const now = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const loadSnapshots = async () => {
    if (!household?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/month-snapshots");
      const payload = await res.json();
      if (payload.success) setSnapshots(payload.data ?? []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- household id only
  }, [household?.id]);

  const handleClose = async () => {
    setClosing(true);
    try {
      const res = await fetch("/api/month-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: currentYear, month: currentMonth, notes: notes || undefined }),
      });
      const payload = await res.json();
      if (payload.success) {
        toast.success(`Mês ${MONTH_NAMES[currentMonth]}/${currentYear} fechado!`);
        setNotes("");
        loadSnapshots();
      } else {
        toast.error(payload.error?.message ?? "Erro ao fechar mês");
      }
    } finally {
      setClosing(false);
    }
  };

  const handleGenerateRecurrence = async () => {
    setGenerating(true);
    try {
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear  = currentMonth === 12 ? currentYear + 1 : currentYear;
      const res = await fetch("/api/recurrence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: nextYear, month: nextMonth }),
      });
      const payload = await res.json();
      if (payload.success) {
        const { expenses, incomes } = payload.data;
        toast.success(
          `Recorrências geradas para ${MONTH_NAMES[nextMonth]}/${nextYear}: ` +
          `${expenses.created} despesas · ${incomes.created} receitas ` +
          `(${expenses.skipped + incomes.skipped} já existentes)`
        );
      } else {
        toast.error(payload.error?.message ?? "Erro ao gerar recorrências");
      }
    } finally {
      setGenerating(false);
    }
  };

  const isOwner = activeMembershipRole === "OWNER";

  if (householdLoading || !household) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const currentSnapshot = snapshots.find((s) => s.year === currentYear && s.month === currentMonth);

  return (
    <div className="min-h-screen px-4 py-8 text-foreground md:px-6 md:py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <Breadcrumbs />

        <header>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Gestão mensal</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Histórico de Meses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Feche o mês para registrar um snapshot do seu saldo e acompanhar a evolução.
          </p>
        </header>

        {/* Ações do mês atual */}
        {isOwner && (
          <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-indigo-700">
              📅 {MONTH_NAMES[currentMonth]}/{currentYear} — Mês atual
            </h2>

            {currentSnapshot ? (
              <div className="rounded-xl border border-indigo-200 bg-white p-4">
                <p className="text-sm font-medium text-indigo-700 mb-2">✅ Mês já fechado</p>
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div>
                    <p className="text-muted-foreground">Receitas</p>
                    <p className="font-bold text-emerald-600">{fmt(Number(currentSnapshot.totalIncomes))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Despesas</p>
                    <p className="font-bold text-red-500">{fmt(Number(currentSnapshot.totalExpenses))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Saldo</p>
                    <p className={`font-bold ${Number(currentSnapshot.balance) >= 0 ? "text-indigo-600" : "text-red-600"}`}>
                      {fmt(Number(currentSnapshot.balance))}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={closing}
                  className="mt-3 text-xs text-indigo-500 underline hover:text-indigo-700"
                >
                  Atualizar snapshot
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  rows={2}
                  placeholder="Observações do mês (opcional)"
                  className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={closing}
                  className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {closing ? "Fechando..." : `Fechar mês de ${MONTH_NAMES[currentMonth]}`}
                </button>
              </div>
            )}

            {/* Gerar recorrências */}
            <div className="rounded-xl border border-indigo-200 bg-white p-4">
              <p className="mb-1 text-sm font-medium text-foreground">
                🔁 Gerar recorrências do próximo mês
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                Cria instâncias das despesas e receitas marcadas como recorrentes para{" "}
                {MONTH_NAMES[currentMonth === 12 ? 1 : currentMonth + 1]}/
                {currentMonth === 12 ? currentYear + 1 : currentYear}.
                A operação é segura — não duplica se já existir.
              </p>
              <button
                type="button"
                onClick={handleGenerateRecurrence}
                disabled={generating}
                className="rounded-xl bg-slate-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {generating ? "Gerando..." : "Gerar recorrências"}
              </button>
            </div>
          </section>
        )}

        {/* Histórico */}
        <section>
          <h2 className="mb-4 text-sm font-semibold text-foreground">Fechamentos anteriores</h2>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : snapshots.length === 0 ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-6 text-center">
              <p className="text-sm text-muted-foreground">Nenhum mês fechado ainda.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Feche o mês corrente para começar o histórico.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {snapshots.map((snap) => {
                const bal = Number(snap.balance);
                const isPositive = bal >= 0;
                return (
                  <div
                    key={snap.id}
                    className={`rounded-xl border p-4 ${
                      isPositive ? "border-emerald-100 bg-emerald-50/50" : "border-red-100 bg-red-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {MONTH_NAMES[snap.month]} {snap.year}
                        </p>
                        {snap.notes && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{snap.notes}</p>
                        )}
                      </div>
                      <div className={`text-right text-sm font-bold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                        {fmt(bal)}
                        <p className="text-xs font-normal text-muted-foreground">saldo final</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-current/10 pt-2 text-center text-xs">
                      <div>
                        <p className="text-muted-foreground">Receitas</p>
                        <p className="font-medium text-emerald-600">{fmt(Number(snap.totalIncomes))}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Despesas</p>
                        <p className="font-medium text-red-500">{fmt(Number(snap.totalExpenses))}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">A pagar</p>
                        <p className={`font-medium ${Number(snap.pendingExpenses) > 0 ? "text-amber-600" : "text-slate-400"}`}>
                          {fmt(Number(snap.pendingExpenses))}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
