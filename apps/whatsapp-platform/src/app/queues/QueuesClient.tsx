"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";
import { fetchInboxUsers } from "@/components/inbox/inboxFetch";
import type { OperationalQueueWithMetrics } from "@/modules/inbox/inboxOperationalQueueService";

export function QueuesClient({
  initialQueues,
}: {
  initialQueues: OperationalQueueWithMetrics[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [queues, setQueues] = useState(initialQueues);
  useEffect(() => {
    setQueues(initialQueues);
  }, [initialQueues]);

  useEffect(() => {
    const qid = searchParams.get("queue")?.trim();
    if (!qid || queues.length === 0) return;
    const hit = queues.some((x) => x.id === qid);
    if (hit) {
      setExpandMembersFor(qid);
      requestAnimationFrame(() => {
        document.getElementById(`queue-row-${qid}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [searchParams, queues]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [slaMinutes, setSlaMinutes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("#6366f1");
  const [editSlaMinutes, setEditSlaMinutes] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [memberUserId, setMemberUserId] = useState("");
  const [expandMembersFor, setExpandMembersFor] = useState<string | null>(null);

  const { data: tenantUsers = [] } = useQuery({
    queryKey: ["queues-tenant-users"],
    queryFn: fetchInboxUsers,
    staleTime: 60_000,
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetchProtected("/api/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ...(slug.trim() ? { slug: slug.trim().toLowerCase() } : {}),
          description: description.trim() || null,
          color: color.trim() || null,
          slaTargetMinutes:
            slaMinutes === ""
              ? null
              : (() => {
                  const n = parseInt(slaMinutes, 10);
                  return Number.isFinite(n) && n > 0 ? n : null;
                })(),
          isActive: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(protectedApiUserMessage(res.status, data));
      }
      setName("");
      setSlug("");
      setDescription("");
      setColor("#6366f1");
      setSlaMinutes("");
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
      const res = await fetchProtected(`/api/queues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          slug: editSlug.trim() || undefined,
          description: editDescription.trim() || null,
          color: editColor.trim() || null,
          slaTargetMinutes:
            editSlaMinutes === ""
              ? null
              : (() => {
                  const n = parseInt(editSlaMinutes, 10);
                  return Number.isFinite(n) && n > 0 ? n : null;
                })(),
          isActive: editActive,
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
    if (!confirm("Remover esta fila? As conversas ficam sem fila.")) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetchProtected(`/api/queues/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(protectedApiUserMessage(res.status, data));
      }
      setQueues((prev) => prev.filter((q) => q.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMember(queueId: string) {
    if (!memberUserId.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetchProtected(`/api/queues/${queueId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberUserId.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(protectedApiUserMessage(res.status, data));
      }
      setMemberUserId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao vincular");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMember(queueId: string, userId: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchProtected(
        `/api/queues/${queueId}/members?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(protectedApiUserMessage(res.status, data));
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover vínculo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Operação"
        title="Filas"
        description="Filas da Inbox: backlog, SLA crítico, conversas sem dono e agentes vinculados. Integradas com a lista de conversas e o dashboard."
        layout="split"
        showDivider
        actions={
          !showForm ? (
            <Button variant="secondary" type="button" onClick={() => setShowForm(true)}>
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
            description="O slug é gerado a partir do nome se não preencher. Cor e SLA alimentam a operação visual."
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
            <FormField id="queue-slug" label="Slug" htmlFor="queue-slug" optional>
              <input
                id="queue-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className={fieldInputClassName}
                placeholder="Opcional — ex.: suporte"
              />
            </FormField>
            <FormField id="queue-desc" label="Descrição" htmlFor="queue-desc" optional>
              <textarea
                id="queue-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={fieldInputClassName}
                rows={2}
              />
            </FormField>
            <FormField id="queue-color" label="Cor" htmlFor="queue-color">
              <input
                id="queue-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-20 cursor-pointer rounded border border-border"
              />
            </FormField>
            <FormField
              id="queue-sla"
              label="Meta SLA (minutos)"
              htmlFor="queue-sla"
              optional
              help="Referência operacional; vazio = sem meta."
            >
              <input
                id="queue-sla"
                type="number"
                min={1}
                value={slaMinutes}
                onChange={(e) => setSlaMinutes(e.target.value)}
                className={fieldInputClassName}
                placeholder="Opcional"
              />
            </FormField>
            <FormActions>
              <Button variant="primary" type="submit" disabled={loading}>
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
          description="Crie filas para organizar conversas e filtrar na Inbox e no dashboard gerencial."
          nextStep="Depois de criar, atribua agentes em Equipe e use a Inbox para distribuir conversas."
          action={
            <Button variant="secondary" type="button" onClick={() => setShowForm(true)}>
              Criar primeira fila
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-border/90 bg-card shadow-sm ring-1 ring-slate-900/[0.03]">
          {queues.map((q) => (
            <li key={q.id} id={`queue-row-${q.id}`} className="flex flex-col gap-3 px-4 py-4 scroll-mt-24">
              {editingId === q.id ? (
                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`w-full sm:w-48 ${fieldControlCompact}`}
                    placeholder="Nome"
                  />
                  <input
                    type="text"
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    className={`w-full sm:w-40 ${fieldControlCompact}`}
                    placeholder="slug"
                  />
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="h-9 w-16 cursor-pointer rounded border border-border"
                  />
                  <input
                    type="number"
                    min={1}
                    value={editSlaMinutes}
                    onChange={(e) => setEditSlaMinutes(e.target.value)}
                    placeholder="SLA min"
                    className={`w-28 ${fieldControlCompact}`}
                  />
                  <label className="flex items-center gap-2 text-sm df-text-secondary">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                    />
                    Ativa
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="min-h-[3rem] w-full rounded-lg border border-border px-2 py-1.5 text-sm sm:max-w-md"
                    placeholder="Descrição"
                  />
                  <Button variant="secondary" size="sm" onClick={() => handleUpdate(q.id)} disabled={loading}>
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(null);
                      setEditName(q.name);
                      setEditSlug(q.slug);
                      setEditDescription(q.description ?? "");
                      setEditColor(q.color ?? "#6366f1");
                      setEditSlaMinutes(q.slaTargetMinutes?.toString() ?? "");
                      setEditActive(q.isActive);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={
                            "inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border " +
                            (q.color ? "" : "bg-muted-foreground")
                          }
                          style={q.color ? { backgroundColor: q.color } : undefined}
                          aria-hidden
                        />
                        <span className="font-semibold df-text-primary">{q.name}</span>
                        {!q.isActive ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                            Inativa
                          </span>
                        ) : null}
                        <span className="text-sm df-text-muted">{q.slug}</span>
                      </div>
                      {q.description ? (
                        <p className="mt-1 text-sm df-text-secondary">{q.description}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm df-text-secondary">
                        <span>
                          Backlog (abertas/pendentes): <strong>{q.backlogCount}</strong>
                        </span>
                        <span>
                          Sem responsável: <strong>{q.unassignedCount}</strong>
                        </span>
                        <span>
                          SLA crítico: <strong className="text-red-700">{q.criticalSlaCount}</strong>
                        </span>
                        {q.slaTargetMinutes != null ? (
                          <span className="df-text-muted">Meta: {q.slaTargetMinutes} min</span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {q.members.map((m) => (
                          <span
                            key={m.userId}
                            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs df-text-secondary"
                          >
                            {m.name}
                          </span>
                        ))}
                        {q.members.length === 0 ? (
                          <span className="text-xs df-text-muted">Nenhum agente vinculado</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpandMembersFor((prev) => (prev === q.id ? null : q.id))
                        }
                      >
                        {expandMembersFor === q.id ? "Fechar vínculos" : "Gerir agentes"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(q.id);
                          setEditName(q.name);
                          setEditSlug(q.slug);
                          setEditDescription(q.description ?? "");
                          setEditColor(q.color ?? "#6366f1");
                          setEditSlaMinutes(q.slaTargetMinutes?.toString() ?? "");
                          setEditActive(q.isActive);
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
                  </div>
                  {expandMembersFor === q.id ? (
                    <div className="rounded-lg border border-border bg-muted/60/80 px-3 py-3">
                      <p className="text-xs font-medium df-text-muted">Vincular utilizador à fila</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <select
                          value={memberUserId}
                          onChange={(e) => setMemberUserId(e.target.value)}
                          className={`min-w-[12rem] ${fieldControlCompact}`}
                        >
                          <option value="">Escolher…</option>
                          {tenantUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </option>
                          ))}
                        </select>
                        <Button variant="secondary" size="sm" type="button" onClick={() => handleAddMember(q.id)} disabled={loading}>
                          Adicionar
                        </Button>
                      </div>
                      <ul className="mt-3 space-y-1 text-sm">
                        {q.members.map((m) => (
                          <li key={m.userId} className="flex items-center justify-between gap-2">
                            <span>
                              {m.name} <span className="df-text-muted">{m.email}</span>
                            </span>
                            <Button variant="secondary"
                              type="button"
                              className="text-xs text-red-600 hover:underline"
                              onClick={() => handleRemoveMember(q.id, m.userId)}
                            >
                              Remover
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
