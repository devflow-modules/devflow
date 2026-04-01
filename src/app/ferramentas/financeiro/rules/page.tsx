"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { ruleCreateSchema, ruleUpdateSchema } from "@/modules/financeiro/schemas";
import { useHousehold } from "@/modules/financeiro/lib/household/HouseholdProvider";
import { Skeleton } from "@/modules/financeiro/components/Skeleton";
import { Breadcrumbs } from "@/modules/financeiro/components/Breadcrumbs";

type Source = { id: string; name: string };
type Rule = {
  id: string;
  name: string;
  description?: string | null;
  ruleType: string;
  percentage?: number | null;
  fixedAmount?: number | null;
  referenceCategory?: string | null;
  ruleSources: { id: string; sourceId: string; source: Source }[];
};

type Allocation = {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  allocations: { sourceId: string; amount: number; share: number }[];
};

const defaultForm = {
  name: "",
  description: "",
  ruleType: "CATEGORY_PERCENTAGE",
  percentage: "",
  fixedAmount: "",
  referenceCategory: "",
  sourceIds: [] as string[],
};

export default function RulesPage() {
  const { household, isLoading: householdLoading } = useHousehold();
  const [isLoading, setIsLoading] = useState(true);
  const [rules, setRules] = useState<Rule[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  const loadSourcesAndRules = async () => {
    if (!household?.id) return;
    setIsLoading(true);
    try {
      const [sourceRes, ruleRes, allocationRes] = await Promise.all([
        fetch("/api/sources"),
        fetch("/api/rules"),
        fetch("/api/rules/allocations"),
      ]);

      const [sourcePayload, rulePayload, allocationPayload] = await Promise.all([
        sourceRes.json(),
        ruleRes.json(),
        allocationRes.json(),
      ]);

      setSources(sourcePayload.data ?? []);
      setRules(rulePayload.data ?? []);
      setAllocations(allocationPayload.data?.allocations ?? []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (household?.id) loadSourcesAndRules();
  }, [household?.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        ruleType: form.ruleType,
        percentage: form.percentage ? Number(form.percentage) : undefined,
        fixedAmount: form.fixedAmount ? Number(form.fixedAmount) : undefined,
        referenceCategory: form.referenceCategory || undefined,
        sourceIds: form.sourceIds,
      };

      const parsed = editingId
        ? ruleUpdateSchema.parse(payload)
        : ruleCreateSchema.parse(payload);

      const url = editingId ? `/api/rules/${editingId}` : "/api/rules";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        body: JSON.stringify(parsed),
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error.message);
      }

      toast.success(editingId ? "Regra atualizada" : "Regra criada");
      setForm(defaultForm);
      setEditingId(null);
      loadSourcesAndRules();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta regra?")) return;
    const res = await fetch(`/api/rules/${ruleId}`, { method: "DELETE" });
    const payload = await res.json();
    if (payload.success) {
      toast.success("Regra excluída");
      loadSourcesAndRules();
    } else {
      toast.error(payload.error?.message ?? "Erro ao excluir");
    }
  };

  const toggleSource = (sourceId: string) => {
    setForm((prev) => {
      const alreadySelected = prev.sourceIds.includes(sourceId);
      return {
        ...prev,
        sourceIds: alreadySelected
          ? prev.sourceIds.filter((id) => id !== sourceId)
          : [...prev.sourceIds, sourceId],
      };
    });
  };

  if (householdLoading || !household) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10 text-foreground md:py-14">
      <div className="mx-auto max-w-5xl space-y-8">
        <Breadcrumbs />
        <header>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Regras da casa</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            Rateio e responsabilidades
          </h1>
          <p className="text-sm text-muted-foreground">Crie regras por categoria ou valor fixo e veja o histórico.</p>
        </header>

        <Section title={editingId ? "Editar regra" : "Nova regra"}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
              placeholder="Nome da regra"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <textarea
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
              placeholder="Descrição"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <select
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
              value={form.ruleType}
              onChange={(event) => setForm((prev) => ({ ...prev, ruleType: event.target.value }))}
            >
              <option value="CATEGORY_PERCENTAGE">Percentual por categoria</option>
              <option value="FIXED_PER_MEMBER">Valor fixo por membro</option>
            </select>
            {form.ruleType === "CATEGORY_PERCENTAGE" ? (
              <input
                type="number"
                min={0}
                max={100}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                placeholder="Percentual"
                value={form.percentage}
                onChange={(event) => setForm((prev) => ({ ...prev, percentage: event.target.value }))}
              />
            ) : (
              <input
                type="number"
                min={0}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                placeholder="Valor fixo"
                value={form.fixedAmount}
                onChange={(event) => setForm((prev) => ({ ...prev, fixedAmount: event.target.value }))}
              />
            )}
            <input
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
              placeholder="Categoria (apenas percentuais)"
              value={form.referenceCategory}
              onChange={(event) => setForm((prev) => ({ ...prev, referenceCategory: event.target.value }))}
            />
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Fontes envolvidas</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {isLoading ? (
                  <>
                    <Skeleton className="h-10 w-full rounded-2xl" />
                    <Skeleton className="h-10 w-full rounded-2xl" />
                  </>
                ) : (
                  sources.map((source) => (
                    <label
                      key={source.id}
                      className="flex items-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm text-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={form.sourceIds.includes(source.id)}
                        onChange={() => toggleSource(source.id)}
                      />
                      {source.name}
                    </label>
                  ))
                )}
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            >
              {editingId ? "Atualizar regra" : "Criar regra"}
            </button>
          </form>
        </Section>

        <Section title="Regras cadastradas">
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
            ) : rules.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Automatize decisões recorrentes</p>
                <p className="mt-1">
                  Regras mostram como um custo se distribui entre PJ e PF, ou um valor fixo entre fontes — ideal para
                  fechar a demo com previsibilidade.
                </p>
              </div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-foreground">{rule.name}</p>
                      <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{rule.ruleType}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded-2xl border border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-foreground"
                        onClick={() => {
                          setEditingId(rule.id);
                          setForm({
                            name: rule.name,
                            description: rule.description ?? "",
                            ruleType: rule.ruleType,
                            percentage: rule.percentage?.toString() ?? "",
                            fixedAmount: rule.fixedAmount?.toString() ?? "",
                            referenceCategory: rule.referenceCategory ?? "",
                            sourceIds: rule.ruleSources.map((entry) => entry.sourceId),
                          });
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="rounded-2xl border border-destructive/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-destructive"
                        onClick={() => handleDelete(rule.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{rule.description}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Fontes: {rule.ruleSources.map((entry) => entry.source.name).join(" | ")}
                  </p>
                </div>
              ))
            )}
          </div>
        </Section>

        <Section title="Histórico de rateios">
          <div className="space-y-3">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
            ) : allocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Quando houver despesas nas categorias referenciadas e fontes vinculadas, o rateio aparece aqui com
                valores em reais.
              </p>
            ) : (
              allocations.map((allocation) => (
                <div key={allocation.ruleId} className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-px hover:shadow-md">
                  <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">{allocation.ruleName}</p>
                  <div className="mt-3 space-y-2 text-sm text-foreground">
                    {allocation.allocations.map((entry) => (
                      <div key={entry.sourceId} className="flex items-center justify-between">
                        <span>Fonte {entry.sourceId}</span>
                        <span>{entry.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}
