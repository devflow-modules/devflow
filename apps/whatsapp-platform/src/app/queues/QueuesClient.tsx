"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@devflow/ui";
import { PageHeader } from "@/components/ui/page-header";
import { StateEmpty } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  FormActions,
  FormField,
  fieldInputClassName,
  fieldControlCompact,
} from "@/components/ui/form-field";

type QueueItem = {
  id: string;
  name: string;
  slug: string;
  max_size: number | null;
  pendingCount: number;
};

export function QueuesClient({
  tenantId,
  queues: initialQueues,
}: {
  tenantId: string;
  queues: QueueItem[];
}) {
  const router = useRouter();
  const [queues, setQueues] = useState(initialQueues);
  useEffect(() => {
    setQueues(initialQueues);
  }, [initialQueues]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [maxSize, setMaxSize] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editMaxSize, setEditMaxSize] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          name: name.trim(),
          slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
          max_size: maxSize === "" ? null : parseInt(maxSize, 10),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Falha ao criar fila");
      }
      setName("");
      setSlug("");
      setMaxSize("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar fila");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/queues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          max_size: editMaxSize === "" ? null : parseInt(editMaxSize, 10),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Falha ao atualizar");
      }
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta fila?")) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/queues/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Falha ao remover");
      }
      setQueues((prev) => prev.filter((q) => q.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Operação"
        title="Filas"
        description="Organize o atendimento por filas (ex.: suporte, vendas). Cada fila tem um identificador único e limite opcional de tamanho."
        layout="split"
        showDivider
        actions={
          !showForm ? (
            <Button type="button" onClick={() => setShowForm(true)}>
              Nova fila
            </Button>
          ) : null
        }
      />

      <Link href="/dashboard" className={`${buttonClassName("ghost")} -mt-2 inline-flex text-sm`}>
        ← Voltar ao painel
      </Link>

      {error ? (
        <div className="rounded-xl border border-red-200/90 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      {showForm ? (
        <Card padding="lg">
          <CardHeader
            title="Nova fila"
            description="O slug é usado em integrações e regras — use letras minúsculas e hífens."
          />
          <form onSubmit={handleCreate} className="mt-2 max-w-md space-y-4">
            <FormField id="queue-name" label="Nome" htmlFor="queue-name">
              <input
                id="queue-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={fieldInputClassName}
                placeholder="Ex.: Suporte"
              />
            </FormField>
            <FormField id="queue-slug" label="Slug" htmlFor="queue-slug" help="Identificador único, sem espaços.">
              <input
                id="queue-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                className={fieldInputClassName}
                placeholder="Ex.: suporte"
              />
            </FormField>
            <FormField
              id="queue-max"
              label="Tamanho máximo"
              htmlFor="queue-max"
              optional
              help="Número máximo de conversas pendentes. Vazio = sem limite."
            >
              <input
                id="queue-max"
                type="number"
                min={1}
                value={maxSize}
                onChange={(e) => setMaxSize(e.target.value)}
                className={fieldInputClassName}
                placeholder="Ilimitado"
              />
            </FormField>
            <FormActions>
              <Button type="submit" disabled={loading}>
                {loading ? "A criar…" : "Criar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
              >
                Cancelar
              </Button>
            </FormActions>
          </form>
        </Card>
      ) : null}

      {queues.length === 0 ? (
        <StateEmpty
          title="Nenhuma fila configurada"
          description="As filas ajudam a separar conversas por equipa ou prioridade. Crie a primeira para começar a encaminhar trabalho."
          action={
            <Button type="button" onClick={() => setShowForm(true)}>
              Criar primeira fila
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.03]">
          {queues.map((q) => (
            <li key={q.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              {editingId === q.id ? (
                <div className="flex flex-1 flex-wrap items-end gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`w-44 ${fieldControlCompact}`}
                  />
                  <input
                    type="number"
                    min={1}
                    value={editMaxSize}
                    onChange={(e) => setEditMaxSize(e.target.value)}
                    placeholder="Máx."
                    className={`w-24 ${fieldControlCompact}`}
                  />
                  <Button size="sm" onClick={() => handleUpdate(q.id)} disabled={loading}>
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(null);
                      setEditName(q.name);
                      setEditMaxSize(q.max_size?.toString() ?? "");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <>
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900">{q.name}</span>
                    <span className="ml-2 text-sm font-medium text-slate-500">{q.slug}</span>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                      <span>{q.pendingCount} pendentes</span>
                      {q.max_size != null ? (
                        <span className="text-slate-500">Máx.: {q.max_size}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(q.id);
                        setEditName(q.name);
                        setEditMaxSize(q.max_size?.toString() ?? "");
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(q.id)}
                      disabled={loading}
                    >
                      Excluir
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
