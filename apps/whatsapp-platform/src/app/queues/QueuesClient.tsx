"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@devflow/ui";

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
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-4">Filas</h1>
      <Link href="/dashboard" className="text-blue-600 underline">
        Voltar ao Dashboard
      </Link>

      {error && (
        <div className="mt-4 p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mt-4">
        {!showForm ? (
          <Button
            type="button"
            onClick={() => setShowForm(true)}
            className="mb-4"
          >
            Nova fila
          </Button>
        ) : (
          <form
            onSubmit={handleCreate}
            className="mb-4 p-4 rounded-lg border bg-slate-50 space-y-3 max-w-md"
          >
            <h2 className="font-medium">Nova fila</h2>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Ex: Suporte"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Ex: suporte"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Tamanho máximo (opcional)
              </label>
              <input
                type="number"
                min={1}
                value={maxSize}
                onChange={(e) => setMaxSize(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Vazio = ilimitado"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Criando…" : "Criar"}
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
            </div>
          </form>
        )}

        {queues.length === 0 ? (
          <p className="text-gray-600">Nenhuma fila cadastrada. Crie uma acima.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {queues.map((q) => (
              <li key={q.id} className="flex justify-between items-center px-4 py-3">
                {editingId === q.id ? (
                  <div className="flex-1 flex gap-2 items-center flex-wrap">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="rounded border border-slate-300 px-2 py-1 text-sm w-40"
                    />
                    <input
                      type="number"
                      min={1}
                      value={editMaxSize}
                      onChange={(e) => setEditMaxSize(e.target.value)}
                      placeholder="Máx"
                      className="rounded border border-slate-300 px-2 py-1 text-sm w-20"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(q.id)}
                      disabled={loading}
                    >
                      Salvar
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
                    <div>
                      <span className="font-medium">{q.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({q.slug})
                      </span>
                    </div>
                    <div className="flex gap-4 items-center">
                      <span className="text-sm">Pendentes: {q.pendingCount}</span>
                      {q.max_size != null && (
                        <span className="text-sm text-gray-500">
                          Máx: {q.max_size}
                        </span>
                      )}
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
    </div>
  );
}
