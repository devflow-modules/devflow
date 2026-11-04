"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StateEmpty } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";
import type { OperationalAgentRow } from "@/modules/inbox/operationsAgentsService";
import { AgentRoleBadge } from "@/components/agents/AgentRoleBadge";
import { AgentStatusBadge } from "@/components/inbox/AgentStatusBadge";
import { OPERATIONAL_STATUS_LABEL } from "@/components/inbox/agentOperationalStatus";
import { formatRelativeAgoPt } from "@/lib/formatRelativeAgoPt";
import { roleScopeLine, teamRoleSegment, type TeamRoleSegment } from "@/lib/role-presentation";

const STATUS_OPTIONS = ["available", "busy", "offline"] as const;

const QUEUE_PREVIEW_MAX = 3;

const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  active: "Activo",
  pending: "Pendente",
  disabled: "Desactivado",
};

type TeamFilter = "all" | TeamRoleSegment;

type Viewer = {
  userId: string;
  name: string;
  email: string;
  role: string;
};

function filterClass(active: boolean): string {
  return active
    ? `${buttonClassName("primary")} text-xs`
    : `${buttonClassName("secondary")} border-border/90 text-xs`;
}

function QueueBadges({ queues }: { queues: OperationalAgentRow["queues"] }) {
  if (queues.length === 0) {
    return (
      <span className="text-xs leading-snug df-text-muted">Nenhuma fila atribuída neste momento.</span>
    );
  }
  const visible = queues.slice(0, QUEUE_PREVIEW_MAX);
  const extra = queues.length - visible.length;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      {visible.map((q) => (
        <span
          key={q.id}
          className="max-w-[10rem] truncate rounded-md border border-border/80 bg-muted/60/90 px-2 py-0.5 text-[11px] font-medium df-text-secondary"
          title={q.name}
        >
          {q.name}
        </span>
      ))}
      {extra > 0 ? (
        <span
          className="rounded-md border border-dashed df-border-dark/90 bg-card px-2 py-0.5 text-[11px] font-medium df-text-secondary"
          title={`${extra} fila${extra > 1 ? "s" : ""} adicional${extra > 1 ? "is" : ""}`}
        >
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

export function AgentsClient({
  agents: initialAgents,
  viewer,
}: {
  agents: OperationalAgentRow[];
  viewer: Viewer | null;
}) {
  const router = useRouter();
  const [agents, setAgents] = useState(initialAgents);
  useEffect(() => {
    setAgents(initialAgents);
  }, [initialAgents]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>("offline");
  const [segment, setSegment] = useState<TeamFilter>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"operator" | "manager">("operator");
  const [addResultUrl, setAddResultUrl] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (segment === "all") return agents;
    return agents.filter((a) => teamRoleSegment(a.role) === segment);
  }, [agents, segment]);

  const counts = useMemo(() => {
    let gestao = 0;
    let operacao = 0;
    for (const a of agents) {
      if (teamRoleSegment(a.role) === "gestao") gestao += 1;
      else operacao += 1;
    }
    return { gestao, operacao, total: agents.length };
  }, [agents]);

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

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAddSuccess(null);
    setAddResultUrl(null);
    setLoading(true);
    try {
      const res = await fetchProtected("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName, email: addEmail, role: addRole }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        data?: {
          user: {
            id: string;
            name: string;
            email: string;
            role: string;
            status: string;
          };
          emailSent?: boolean;
          activationUrl?: string | null;
        };
      };
      if (!res.ok) {
        throw new Error(protectedApiUserMessage(res.status, data));
      }
      const created = data.data?.user;
      if (created) {
        setAgents((prev) => [
          ...prev,
          {
            userId: created.id,
            name: created.name,
            email: created.email,
            role: created.role,
            accountStatus: created.status,
            status: "offline",
            activeThreadCount: 0,
            queues: [],
            lastActivityAt: null,
          },
        ]);
      }
      if (data.data?.activationUrl) {
        setAddResultUrl(data.data.activationUrl);
        setAddSuccess(
          "Membro criado. O e-mail não foi enviado — partilhe o link de activação com o operador (uso único)."
        );
      } else {
        setAddSuccess("Membro criado. Foi enviado um e-mail com o link de activação.");
      }
      setAddName("");
      setAddEmail("");
      setAddRole("operator");
      setShowAddForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar membro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Operação"
        title="Equipe e agentes"
        description="Quem está no tenant, papel, estado da conta, disponibilidade na Inbox e filas."
        layout="split"
        showDivider
        actions={
          <Button
            type="button"
            variant="primary"
            className="text-sm"
            onClick={() => {
              setShowAddForm((v) => !v);
              setError(null);
            }}
          >
            {showAddForm ? "Cancelar" : "Adicionar membro"}
          </Button>
        }
      />

      <Link href="/dashboard" className={`${buttonClassName("ghost")} -mt-1 inline-flex text-sm`}>
        ← Voltar ao painel
      </Link>

      {viewer ? (
        <section
          className="rounded-lg border df-border-brand bg-[color-mix(in_srgb,var(--df-bg-app)_45%,var(--df-bg-elevated))] px-3 py-2.5 text-sm"
          aria-label="A sua sessão"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide df-text-muted">A sua sessão</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold df-text-primary">{viewer.name}</span>
            <AgentRoleBadge role={viewer.role} size="compact" />
            <span className="rounded-md bg-card/90 px-1.5 py-0.5 text-[10px] font-medium df-text-muted ring-1 ring-[color:var(--df-ring-soft)]">
              Você
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs df-text-muted">{viewer.email}</p>
          <p className="mt-1.5 text-xs leading-snug df-text-secondary">{roleScopeLine(viewer.role)}</p>
        </section>
      ) : null}

      {showAddForm ? (
        <form
          onSubmit={handleAddMember}
          className="space-y-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm"
          aria-label="Adicionar membro à equipe"
        >
          <p className="text-sm font-medium df-text-primary">Novo membro</p>
          <p className="text-xs df-text-muted">
            O operador define a própria senha no link de activação. O tenant é o da sua sessão.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="add-member-name" className="mb-1 block text-xs font-medium df-text-secondary">
                Nome
              </label>
              <input
                id="add-member-name"
                required
                minLength={2}
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="df-field-compact w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="add-member-email" className="mb-1 block text-xs font-medium df-text-secondary">
                E-mail
              </label>
              <input
                id="add-member-email"
                type="email"
                required
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="df-field-compact w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                disabled={loading}
              />
            </div>
          </div>
          <div>
            <label htmlFor="add-member-role" className="mb-1 block text-xs font-medium df-text-secondary">
              Papel
            </label>
            <select
              id="add-member-role"
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as "operator" | "manager")}
              className="df-field-compact max-w-xs rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
              disabled={loading}
            >
              <option value="operator">Operador</option>
              <option value="manager">Gestor</option>
            </select>
          </div>
          <Button type="submit" variant="primary" size="sm" disabled={loading}>
            {loading ? "A criar…" : "Criar e gerar activação"}
          </Button>
        </form>
      ) : null}

      {addSuccess ? (
        <div className="df-feedback-success rounded-xl text-sm" role="status">
          <p>{addSuccess}</p>
          {addResultUrl ? (
            <p className="mt-2 break-all font-mono text-xs opacity-90">{addResultUrl}</p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="df-feedback-error rounded-xl text-sm" role="alert">
          {error}
        </div>
      ) : null}

      {agents.length === 0 ? (
        <StateEmpty
          title="Ainda não há membros na equipe"
          description="Adicione operadores para partilhar a Inbox sem editar a base de dados."
          nextStep="Use «Adicionar membro» para convidar um operador."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button type="button" variant="primary" className="text-sm" onClick={() => setShowAddForm(true)}>
                Adicionar membro
              </Button>
              <Link href="/queues" className={`${buttonClassName("secondary")} text-sm`}>
                Ver filas operacionais
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm df-text-secondary">
              {counts.total} membro{counts.total !== 1 ? "s" : ""}
              {counts.gestao > 0 || counts.operacao > 0 ? (
                <span className="df-text-muted">
                  {" "}
                  · {counts.gestao} gestão · {counts.operacao} operação
                </span>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo de papel">
              <Button variant="secondary" type="button" className={filterClass(segment === "all")} onClick={() => setSegment("all")}>
                Todos
              </Button>
              <Button
                variant="secondary"
                type="button"
                className={filterClass(segment === "gestao")}
                onClick={() => setSegment("gestao")}
              >
                Gestão
              </Button>
              <Button
                variant="secondary"
                type="button"
                className={filterClass(segment === "operacao")}
                onClick={() => setSegment("operacao")}
              >
                Operação
              </Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/90 bg-muted/60/40 px-4 py-8 text-center">
              <p className="text-sm font-medium df-text-secondary">Nenhum resultado neste filtro</p>
              <p className="mt-1 text-xs leading-relaxed df-text-muted">
                Experimente «Todos» ou outro segmento para ver a equipe completa.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {filtered.map((a) => {
                const isSelf = viewer?.userId === a.userId;
                const editing = editingId === a.userId;
                const lastLabel = formatRelativeAgoPt(a.lastActivityAt);
                const activityTitle = a.lastActivityAt
                  ? new Date(a.lastActivityAt).toLocaleString("pt-BR")
                  : undefined;

                return (
                  <li
                    key={a.userId}
                    className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card p-3 shadow-sm df-ring-elevated"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="min-w-0 truncate text-base font-semibold tracking-tight df-text-primary">
                        {a.name}
                      </span>
                      {isSelf ? (
                        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium df-text-secondary">
                          Você
                        </span>
                      ) : null}
                      <AgentRoleBadge role={a.role} size="compact" className="shrink-0" />
                      <span className="shrink-0 rounded-md border border-border/80 px-1.5 py-0.5 text-[10px] font-medium df-text-muted">
                        {ACCOUNT_STATUS_LABEL[a.accountStatus] ?? a.accountStatus}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {editing ? (
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="df-field-compact max-w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                          aria-label="Novo estado operacional"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {OPERATIONAL_STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <AgentStatusBadge status={a.status} density="comfortable" />
                      )}
                    </div>

                    <p className="df-text-muted truncate text-sm">{a.email}</p>
                    <p className="text-xs leading-relaxed df-text-secondary">{roleScopeLine(a.role)}</p>

                    <div className="space-y-2 border-t border-border/90 pt-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs df-text-muted">Conversas abertas ou pendentes</span>
                        <span className="text-sm font-semibold tabular-nums df-text-primary">{a.activeThreadCount}</span>
                      </div>
                      <div>
                        <p className="text-xs df-text-muted">Filas</p>
                        <div className="mt-1 min-w-0">
                          <QueueBadges queues={a.queues} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                        <span className="shrink-0 text-xs df-text-muted">Última atividade</span>
                        <span className="text-xs df-text-muted sm:min-w-0 sm:flex-1" title={activityTitle}>
                          {a.lastActivityAt ? lastLabel : "Sem registo recente de presença ou conversa."}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-border/90 pt-2">
                      <span className="sr-only">Ações</span>
                      {editing ? (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => handleStatusSave(a.userId)} disabled={loading}>
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
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingId(a.userId);
                              setEditStatus(a.status);
                            }}
                          >
                            Alterar estado
                          </Button>
                          <Link href="/inbox" className={`${buttonClassName("ghost")} inline-flex items-center text-sm`}>
                            Abrir inbox
                          </Link>
                          <Link href="/queues" className={`${buttonClassName("ghost")} inline-flex items-center text-sm`}>
                            Ver filas
                          </Link>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
