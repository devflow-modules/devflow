"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useHousehold } from "@/modules/financeiro/lib/household/HouseholdProvider";
import { Breadcrumbs } from "@/modules/financeiro/components/Breadcrumbs";
import { Skeleton } from "@/modules/financeiro/components/Skeleton";
import { CONTEXT_LABELS } from "@/modules/financeiro/schemas";
import { accountCreateSchema } from "@/modules/financeiro/schemas";
import type { FinancialContext } from "@/modules/financeiro/schemas";
import { FINANCEIRO_BASE_PATH } from "@devflow/financeiro-routes";
import { Button } from "@/components/ui/button";

type Account = {
  id: string;
  name: string;
  type: FinancialContext;
  participants: { id: string; name: string; defaultShare: number }[];
  _count: { expenses: number };
};

export default function ContasPage() {
  const { household, isLoading: householdLoading } = useHousehold();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<FinancialContext>("SHARED");
  const [submitting, setSubmitting] = useState(false);

  const loadAccounts = async () => {
    if (!household?.id) return;
    const res = await fetch("/api/accounts");
    const payload = await res.json();
    if (payload.success && Array.isArray(payload.data)) {
      setAccounts(
        payload.data.map((a: Account) => ({
          ...a,
          participants: a.participants?.map((p: { defaultShare: unknown }) => ({
            ...p,
            defaultShare: Number(p.defaultShare),
          })) ?? [],
        }))
      );
    }
  };

  useEffect(() => {
    if (!household?.id) return;
    setLoading(true);
    loadAccounts().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- household id only
  }, [household?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = accountCreateSchema.safeParse({ name: createName.trim(), type: createType });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Dados inválidos");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = await res.json();
      if (payload.success) {
        toast.success("Conta criada. Agora adicione as pessoas que dividem gastos.");
        setShowCreate(false);
        setCreateName("");
        setCreateType("SHARED");
        loadAccounts();
      } else {
        toast.error(payload.error?.message ?? "Erro ao criar conta");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (householdLoading || !household) {
    return (
      <div className="min-h-screen bg-muted/60 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/60 p-4 sm:p-6">
      <Breadcrumbs />
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold df-text-primary">Suas contas</h1>
          <p className="mt-1 text-sm df-text-secondary">
            Cada conta é um grupo (casa, empresa, estúdio). Dentro você coloca pessoas e despesas.
          </p>
        </div>
        <Button variant="secondary"
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Criar conta
        </Button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold df-text-primary">Criar conta</h2>
            <p className="mt-1 text-sm df-text-muted">Ex.: “Casa”, “Minha empresa”, “Estúdio”.</p>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium df-text-secondary">Nome</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Ex: Casa, PJ, Studio"
                  className="mt-1 w-full rounded-xl border df-border-dark px-3 py-2 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium df-text-secondary">Tipo</label>
                <select
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value as FinancialContext)}
                  className="mt-1 w-full rounded-xl border df-border-dark px-3 py-2 text-sm"
                >
                  <option value="PERSONAL">{CONTEXT_LABELS.PERSONAL}</option>
                  <option value="SHARED">{CONTEXT_LABELS.SHARED}</option>
                  <option value="BUSINESS">{CONTEXT_LABELS.BUSINESS}</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary"
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-xl border df-border-dark px-4 py-2 text-sm font-medium df-text-secondary hover:bg-muted/60"
                >
                  Cancelar
                </Button>
                <Button variant="primary"
                  type="submit"
                  disabled={submitting || !createName.trim()}
                  className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "Criando…" : "Criar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center df-text-secondary">
          <p className="font-medium df-text-primary">Nenhuma conta ainda</p>
          <p className="mt-2 text-sm">
            Crie uma conta para juntar despesas e ver quem precisa pagar quem. É rápido e você pode mudar depois.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <li key={acc.id}>
              <Link
                href={`${FINANCEIRO_BASE_PATH}/contas/${acc.id}`}
                className="block rounded-2xl border-2 border-border bg-card p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold df-text-primary">{acc.name}</h2>
                    <p className="mt-1 text-xs df-text-muted">
                      {CONTEXT_LABELS[acc.type]}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium df-text-secondary">
                    {acc._count?.expenses ?? 0} despesas
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {acc.participants?.slice(0, 4).map((p) => (
                    <span
                      key={p.id}
                      className="rounded-lg bg-muted px-2 py-0.5 text-xs df-text-secondary"
                    >
                      {p.name} {Math.round(Number(p.defaultShare) * 100)}%
                    </span>
                  ))}
                  {(acc.participants?.length ?? 0) > 4 && (
                    <span className="text-xs df-text-muted">
                      +{acc.participants!.length - 4}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
