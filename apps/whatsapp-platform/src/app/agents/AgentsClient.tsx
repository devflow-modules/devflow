"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@devflow/ui";

type AgentItem = {
  id: string;
  name: string;
  email: string | null;
  status: string;
  activeCount: number;
};

const STATUS_OPTIONS = ["available", "busy", "offline"] as const;

export function AgentsClient({
  tenantId,
  agents: initialAgents,
}: {
  tenantId: string;
  agents: AgentItem[];
}) {
  const router = useRouter();
  const [agents, setAgents] = useState(initialAgents);
  useEffect(() => {
    setAgents(initialAgents);
  }, [initialAgents]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>("offline");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState<string>("offline");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          name: name.trim(),
          email: email.trim() || null,
          status: status || "offline",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Falha ao criar agente");
      }
      setName("");
      setEmail("");
      setStatus("offline");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar agente");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(id: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim() || null,
          status: editStatus,
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
    if (!confirm("Remover este agente?")) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Falha ao remover");
      }
      setAgents((prev) => prev.filter((a) => a.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-4">Agentes</h1>
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
            Novo agente
          </Button>
        ) : (
          <form
            onSubmit={handleCreate}
            className="mb-4 p-4 rounded-lg border bg-slate-50 space-y-3 max-w-md"
          >
            <h2 className="font-medium">Novo agente</h2>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Ex: Maria"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                E-mail (opcional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="agente@empresa.com"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
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

        {agents.length === 0 ? (
          <p className="text-gray-600">
            Nenhum agente cadastrado. Crie um acima.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {agents.map((a) => (
              <li
                key={a.id}
                className="flex justify-between items-center px-4 py-3 flex-wrap gap-2"
              >
                {editingId === a.id ? (
                  <div className="flex-1 flex gap-2 items-center flex-wrap">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="rounded border border-slate-300 px-2 py-1 text-sm w-40"
                      placeholder="Nome"
                    />
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="rounded border border-slate-300 px-2 py-1 text-sm w-48"
                      placeholder="E-mail"
                    />
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="rounded border border-slate-300 px-2 py-1 text-sm"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(a.id)}
                      disabled={loading}
                    >
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null);
                        setEditName(a.name);
                        setEditEmail(a.email ?? "");
                        setEditStatus(a.status);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="font-medium">{a.name}</span>
                      {a.email && (
                        <span className="text-sm text-gray-500 ml-2">
                          ({a.email})
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 items-center">
                      <span className="text-sm text-gray-600">
                        Status: {a.status}
                      </span>
                      <span className="text-sm">
                        Conversas ativas: {a.activeCount}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(a.id);
                          setEditName(a.name);
                          setEditEmail(a.email ?? "");
                          setEditStatus(a.status);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(a.id)}
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
