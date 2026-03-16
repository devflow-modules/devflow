"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { paymentDaySchema, sourceCreateSchema, sourceUpdateSchema } from "@/modules/financeiro/schemas";
import { useHousehold } from "@/modules/financeiro/lib/household/HouseholdProvider";
import { Skeleton } from "@/modules/financeiro/components/Skeleton";
import { Breadcrumbs } from "@/modules/financeiro/components/Breadcrumbs";

type Cycle = {
  id: string;
  name: string;
  cycleType: "MONTHLY" | "WEEKLY";
  anchorDay?: number | null;
  anchorWeekDay?: number | null;
};

type Source = {
  id: string;
  name: string;
  sourceType: "PJ" | "PF";
  description?: string | null;
  isActive: boolean;
  paymentDays?: { id: string; dayOfMonth: number; cycleId?: string | null; cycle?: Cycle | null }[];
};

type PaymentDayForm = {
  sourceId: string;
  dayOfMonth: number;
  description?: string;
  cycleId?: string;
};

const sourceDefaults = { name: "", sourceType: "PF", description: "", isActive: true };

export default function SourcesPage() {
  const { household, isLoading: householdLoading } = useHousehold();
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(sourceDefaults);
  const [editSourceId, setEditSourceId] = useState<string | null>(null);
  const [paymentDayForm, setPaymentDayForm] = useState<PaymentDayForm>({
    sourceId: "",
    dayOfMonth: 1,
  });
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [cycleForm, setCycleForm] = useState({
    name: "",
    cycleType: "MONTHLY" as "MONTHLY" | "WEEKLY",
    anchorDay: 15,
    anchorWeekDay: 1,
  });
  const [editCycleId, setEditCycleId] = useState<string | null>(null);

  const loadCycles = async () => {
    if (!household?.id) return;
    try {
      const res = await fetch("/api/cycles");
      const payload = await res.json();
      if (payload.success) setCycles(payload.data ?? []);
    } catch {
      setCycles([]);
    }
  };

  const loadSources = async () => {
    if (!household?.id) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/sources");
      const payload = await response.json();
      setSources(payload.data ?? []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (household?.id) {
      loadSources();
      loadCycles();
    }
  }, [household?.id]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editSourceId) {
      await handleUpdate();
      return;
    }
    try {
      const parsed = sourceCreateSchema.parse({
        ...form,
        sourceType: form.sourceType as "PJ" | "PF",
      });

      const response = await fetch("/api/sources", {
        method: "POST",
        body: JSON.stringify(parsed),
        headers: { "Content-Type": "application/json" },
      });

      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error.message);
      }

      toast.success("Fonte criada com sucesso");
      setForm(sourceDefaults);
      setEditSourceId(null);
      loadSources();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleUpdate = async () => {
    if (!editSourceId) return;
    const parsed = sourceUpdateSchema.parse(form);
    const response = await fetch(`/api/sources/${editSourceId}`, {
      method: "PATCH",
      body: JSON.stringify(parsed),
      headers: { "Content-Type": "application/json" },
    });
    const payload = await response.json();
    if (payload.success) {
      toast.success("Fonte atualizada");
      setEditSourceId(null);
      setForm(sourceDefaults);
      loadSources();
    } else {
      toast.error(payload.error?.message ?? "Erro ao atualizar");
    }
  };

  const handleDelete = async (sourceId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta fonte?")) return;
    const response = await fetch(`/api/sources/${sourceId}`, { method: "DELETE" });
    const payload = await response.json();
    if (payload.success) {
      toast.success("Fonte excluída");
      loadSources();
    } else {
      toast.error(payload.error?.message ?? "Erro ao excluir");
    }
  };

  const handleCycleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const body =
        cycleForm.cycleType === "MONTHLY"
          ? { name: cycleForm.name, cycleType: "MONTHLY" as const, anchorDay: cycleForm.anchorDay }
          : { name: cycleForm.name, cycleType: "WEEKLY" as const, anchorWeekDay: cycleForm.anchorWeekDay };
      if (editCycleId) {
        const response = await fetch(`/api/cycles/${editCycleId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        });
        const resPayload = await response.json();
        if (!resPayload.success) throw new Error(resPayload.error?.message);
        toast.success("Ciclo atualizado");
        setEditCycleId(null);
      } else {
        const response = await fetch("/api/cycles", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        });
        const resPayload = await response.json();
        if (!resPayload.success) throw new Error(resPayload.error?.message);
        toast.success("Ciclo criado");
      }
      setCycleForm({ name: "", cycleType: "MONTHLY", anchorDay: 15, anchorWeekDay: 1 });
      loadCycles();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleCycleDelete = async (cycleId: string) => {
    if (!confirm("Excluir este ciclo? Dias de recebimento vinculados ficarão sem ciclo.")) return;
    try {
      const response = await fetch(`/api/cycles/${cycleId}`, { method: "DELETE" });
      const resPayload = await response.json();
      if (!resPayload.success) throw new Error(resPayload.error?.message);
      toast.success("Ciclo excluído");
      loadCycles();
      loadSources();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDaySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const payload = {
        ...paymentDayForm,
        ...(paymentDayForm.cycleId ? { cycleId: paymentDayForm.cycleId } : {}),
      };
      const parsed = paymentDaySchema.parse(payload);
      const response = await fetch("/api/payment-days", {
        method: "POST",
        body: JSON.stringify(parsed),
        headers: { "Content-Type": "application/json" },
      });
      const resPayload = await response.json();
      if (!resPayload.success) throw new Error(resPayload.error?.message);
      toast.success("Dia de recebimento adicionado");
      setPaymentDayForm({ sourceId: "", dayOfMonth: 1 });
      loadSources();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const weekDayLabel = (n: number) =>
    ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][n] ?? String(n);
  const cycleLabel = (c: Cycle) =>
    c.cycleType === "MONTHLY"
      ? `${c.name} (dia ${c.anchorDay ?? "?"} ao dia anterior do próximo mês)`
      : `${c.name} (semanal, ${weekDayLabel(c.anchorWeekDay ?? 0)})`;

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
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fontes</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            Fontes PJ / PF
          </h1>
          <p className="text-sm text-muted-foreground">Liste, edite e exclua as origens de receita da sua casa.</p>
        </header>

        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">{editSourceId ? "Editar fonte" : "Nova fonte"}</h2>
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-semibold text-foreground">
                Nome
                <input
                  className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:border-primary"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-foreground">
                Tipo
                <select
                  className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  value={form.sourceType}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, sourceType: event.target.value as "PJ" | "PF" }))
                  }
                >
                  <option value="PF">Pessoa física</option>
                  <option value="PJ">Pessoa jurídica</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-foreground">
                Descrição
                <textarea
                  className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                />
                <span className="text-sm text-muted-foreground">Fonte ativa</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                  type="submit"
                >
                  {editSourceId ? "Salvar" : "Criar"}
                </button>
                {editSourceId ? (
                  <button
                    type="button"
                    className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground"
                    onClick={() => {
                      setEditSourceId(null);
                      setForm(sourceDefaults);
                    }}
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">Dias de recebimento</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Opcional: vincule a um ciclo (ex.: recebe dia 15 → ciclo 15 a 14).
            </p>
            <form className="mt-4 space-y-4" onSubmit={handleDaySubmit}>
              <select
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                value={paymentDayForm.sourceId}
                onChange={(event) =>
                  setPaymentDayForm((prev) => ({ ...prev, sourceId: event.target.value }))
                }
                required
              >
                <option value="">Selecione a fonte</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name} ({source.sourceType})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={31}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                value={paymentDayForm.dayOfMonth}
                onChange={(event) =>
                  setPaymentDayForm((prev) => ({ ...prev, dayOfMonth: Number(event.target.value) }))
                }
                required
              />
              <label className="block text-sm font-semibold text-foreground">
                Ciclo (opcional)
                <select
                  className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  value={paymentDayForm.cycleId ?? ""}
                  onChange={(event) =>
                    setPaymentDayForm((prev) => ({
                      ...prev,
                      cycleId: event.target.value || undefined,
                    }))
                  }
                >
                  <option value="">Nenhum (dia fixo no mês)</option>
                  {cycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycleLabel(cycle)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-primary-foreground"
                type="submit"
              >
                Adicionar dia
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Ciclos de recebimento</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina ciclos para quem recebe em dia fixo (ex.: dia 15 → ciclo 15 a 14) ou por semana.
          </p>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <form className="space-y-4" onSubmit={handleCycleSubmit}>
              <label className="block text-sm font-semibold text-foreground">
                Nome do ciclo
                <input
                  className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  value={cycleForm.name}
                  onChange={(e) => setCycleForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex.: Salário dia 15"
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-foreground">
                Tipo
                <select
                  className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  value={cycleForm.cycleType}
                  onChange={(e) =>
                    setCycleForm((prev) => ({
                      ...prev,
                      cycleType: e.target.value as "MONTHLY" | "WEEKLY",
                    }))
                  }
                >
                  <option value="MONTHLY">Mensal (dia X ao dia anterior do próximo mês)</option>
                  <option value="WEEKLY">Semanal (dia da semana fixo)</option>
                </select>
              </label>
              {cycleForm.cycleType === "MONTHLY" && (
                <label className="block text-sm font-semibold text-foreground">
                  Dia âncora (1–31)
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                    value={cycleForm.anchorDay}
                    onChange={(e) =>
                      setCycleForm((prev) => ({ ...prev, anchorDay: Number(e.target.value) }))
                    }
                  />
                </label>
              )}
              {cycleForm.cycleType === "WEEKLY" && (
                <label className="block text-sm font-semibold text-foreground">
                  Dia da semana (0=Dom, 6=Sáb)
                  <select
                    className="mt-2 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                    value={cycleForm.anchorWeekDay}
                    onChange={(e) =>
                      setCycleForm((prev) => ({ ...prev, anchorWeekDay: Number(e.target.value) }))
                    }
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                      <option key={d} value={d}>
                        {weekDayLabel(d)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="flex gap-2">
                <button
                  className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
                  type="submit"
                >
                  {editCycleId ? "Salvar ciclo" : "Criar ciclo"}
                </button>
                {editCycleId && (
                  <button
                    type="button"
                    className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground"
                    onClick={() => {
                      setEditCycleId(null);
                      setCycleForm({ name: "", cycleType: "MONTHLY", anchorDay: 15, anchorWeekDay: 1 });
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">Ciclos cadastrados</p>
              {cycles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum ciclo. Crie um acima.</p>
              ) : (
                <ul className="space-y-2">
                  {cycles.map((cycle) => (
                    <li
                      key={cycle.id}
                      className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
                    >
                      <span className="text-sm text-foreground">{cycleLabel(cycle)}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs font-semibold uppercase tracking-[0.3em] text-primary"
                          onClick={() => {
                            setEditCycleId(cycle.id);
                            setCycleForm({
                              name: cycle.name,
                              cycleType: cycle.cycleType,
                              anchorDay: cycle.anchorDay ?? 15,
                              anchorWeekDay: cycle.anchorWeekDay ?? 1,
                            });
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="text-xs font-semibold uppercase tracking-[0.3em] text-destructive"
                          onClick={() => handleCycleDelete(cycle.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
          <h2 className="text-lg font-semibold text-foreground">Fontes cadastradas</h2>
          <div className="mt-4 space-y-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
            ) : sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma fonte cadastrada ainda. Crie a primeira fonte no formulário acima.
              </p>
            ) : (
              sources.map((source) => (
                <div
                  key={source.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-px hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-base font-semibold text-foreground">{source.name}</p>
                    <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{source.sourceType}</p>
                    <p className="text-sm text-muted-foreground">{source.description}</p>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {source.paymentDays?.length
                        ? source.paymentDays.map((pd) => (
                            <span key={pd.id} className="mr-2 inline-block">
                              Dia {pd.dayOfMonth}
                              {pd.cycle?.name ? ` (${pd.cycle.name})` : ""}
                            </span>
                          ))
                        : "Nenhum dia de recebimento"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-2xl border border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-foreground"
                      onClick={() => {
                        setEditSourceId(source.id);
                        setForm({
                          name: source.name,
                          sourceType: source.sourceType,
                          description: source.description ?? "",
                          isActive: source.isActive,
                        });
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="rounded-2xl border border-destructive/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-destructive"
                      onClick={() => handleDelete(source.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
