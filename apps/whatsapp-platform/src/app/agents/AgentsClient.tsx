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
  fieldSelectClassName,
  fieldControlCompact,
} from "@/components/ui/form-field";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";

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
      const res = await fetchProtected("/api/agents", {
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
      const res = await fetchProtected(`/api/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim() || null,
          status: editStatus,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(protectedApiUserMessage(res.status, data));
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
      const res = await fetchProtected(`/api/agents/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(protectedApiUserMessage(res.status, data));
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
    <div className="mx-auto min-w-0 max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Equipa"
        title="Agentes"
        description="Pessoas que atendem na Inbox — nome, contacto e estado de disponibilidade. Os agentes aparecem nas atribuições e relatórios."
        layout="split"
        showDivider
        actions={
          !showForm ? (
            <Button type="button" onClick={() => setShowForm(true)}>
              Novo agente
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
            title="Novo agente"
            description="Crie um registo por pessoa que usa a plataforma para responder clientes."
          />
          <form onSubmit={handleCreate} className="mt-2 max-w-md space-y-4">
            <FormField id="agent-name" label="Nome" htmlFor="agent-name">
              <input
                id="agent-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={fieldInputClassName}
                placeholder="Ex.: Maria"
              />
            </FormField>
            <FormField id="agent-email" label="E-mail" htmlFor="agent-email" optional>
              <input
                id="agent-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldInputClassName}
                placeholder="agente@empresa.com"
              />
            </FormField>
            <FormField id="agent-status" label="Estado" htmlFor="agent-status">
              <select
                id="agent-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={fieldSelectClassName}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
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

      {agents.length === 0 ? (
        <StateEmpty
          title="Ainda não há agentes"
          description="Adicione colegas que respondem no WhatsApp para poder atribuir conversas e medir desempenho por pessoa."
          action={
            <Button type="button" onClick={() => setShowForm(true)}>
              Adicionar primeiro agente
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.03]">
          {agents.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              {editingId === a.id ? (
                <div className="flex flex-1 flex-wrap items-end gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`w-40 sm:w-44 ${fieldControlCompact}`}
                    placeholder="Nome"
                  />
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className={`min-w-[12rem] flex-1 sm:max-w-xs ${fieldControlCompact}`}
                    placeholder="E-mail"
                  />
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className={fieldControlCompact}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" onClick={() => handleUpdate(a.id)} disabled={loading}>
                    Guardar
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
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900">{a.name}</span>
                    {a.email ? (
                      <span className="mt-0.5 block text-sm text-slate-500">{a.email}</span>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium capitalize text-slate-700">
                        {a.status}
                      </span>
                      <span>{a.activeCount} conversas ativas</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
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
  );
}
