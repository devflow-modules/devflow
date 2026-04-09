"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@devflow/ui";
import { PageHeader } from "@/components/ui/page-header";
import { StateEmpty } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";
import type { OperationalAgentRow } from "@/modules/inbox/operationsAgentsService";

const STATUS_OPTIONS = ["available", "busy", "offline"] as const;

export function AgentsClient({ agents: initialAgents }: { agents: OperationalAgentRow[] }) {
  const router = useRouter();
  const [agents, setAgents] = useState(initialAgents);
  useEffect(() => {
    setAgents(initialAgents);
  }, [initialAgents]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>("offline");

  async function handleStatusSave(userId: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchProtected(`/api/agents/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(protectedApiUserMessage(res.status, data));
      }
      setAgents((prev) =>
        prev.map((a) => (a.userId === userId ? { ...a, status: editStatus } : a))
      );
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Operação"
        title="Agentes"
        description="Cada agente é um utilizador do tenant. O estado (disponível, ocupado, offline) sincroniza com a Inbox e `whatsapp_agent_status`. Para criar utilizadores, use Configurações."
        layout="split"
        showDivider
        actions={
          <Link href="/settings" className={`${buttonClassName("secondary")} text-sm`}>
            Configurações
          </Link>
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

      {agents.length === 0 ? (
        <StateEmpty
          title="Sem utilizadores no tenant"
          description="Adicione utilizadores em Configurações para aparecerem aqui como agentes operacionais."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/settings" className={`${buttonClassName("primary")} text-sm`}>
                Abrir configurações
              </Link>
              <Link href="/queues" className={`${buttonClassName("secondary")} text-sm`}>
                Ver filas operacionais
              </Link>
            </div>
          }
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.03]">
          {agents.map((a) => (
            <li
              key={a.userId}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              {editingId === a.userId ? (
                <div className="flex flex-1 flex-wrap items-end gap-2">
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" onClick={() => handleStatusSave(a.userId)} disabled={loading}>
                    Guardar estado
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(null);
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
                    <span className="mt-0.5 block text-sm text-slate-500">{a.email}</span>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium capitalize text-slate-700">
                        {a.status}
                      </span>
                      <span>{a.activeThreadCount} conversas abertas/pendentes</span>
                      {a.queueIds.length > 0 ? (
                        <span className="text-slate-500">
                          {a.queueIds.length} fila{a.queueIds.length > 1 ? "s" : ""}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(a.userId);
                        setEditStatus(a.status);
                      }}
                    >
                      Alterar estado
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
