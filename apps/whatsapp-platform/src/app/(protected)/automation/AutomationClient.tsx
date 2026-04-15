"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@devflow/ui";
import { AppBadge } from "@/components/ui/app-badge";
import {
  fetchInboxConversations,
  fetchInboxTags,
  fetchInboxUsers,
  fetchTenantWhatsappLines,
} from "@/components/inbox/inboxFetch";
import { INBOX_QK } from "@/components/inbox/inboxTypes";
import { PageHeader } from "@/components/ui/page-header";
import { StateEmpty, StateError, StateLoading } from "@/components/ui/app-states";
import { buttonClassName } from "@/components/ui/button";
import {
  FormActions,
  FormField,
  FormSection,
  fieldControlCompact,
  fieldInputClassName,
  fieldSelectClassName,
} from "@/components/ui/form-field";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";

type RuleItem = {
  id: string;
  name: string;
  isActive: boolean;
  isSystem?: boolean;
  triggerType: string;
  conditions: { field: string; operator: string; value?: unknown }[];
  actions: { type: string; params?: Record<string, unknown> }[];
  createdAt: string;
};

const TRIGGER_LABELS: Record<string, string> = {
  MESSAGE_INBOUND: "Mensagem recebida",
  MESSAGE_OUTBOUND: "Mensagem enviada",
  CONVERSATION_CREATED: "Conversa criada",
  STATUS_CHANGED: "Status alterado",
  TAG_ADDED: "Tag adicionada",
  TAG_REMOVED: "Tag removida",
  TIME_ELAPSED: "Tempo decorrido",
};

async function fetchRules(): Promise<RuleItem[]> {
  const res = await fetchProtected("/api/automation/rules");
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { rules: RuleItem[] };
    error?: string;
  };
  if (!res.ok) {
    throw new Error(protectedApiUserMessage(res.status, json));
  }
  return json.data?.rules ?? [];
}

export function AutomationClient() {
  const { data: waLines = [] } = useQuery({
    queryKey: INBOX_QK.phoneLines,
    queryFn: fetchTenantWhatsappLines,
    staleTime: 60_000,
  });
  const automationOutboundLocked = waLines.some((l) => l.status === "PENDING_ACTIVATION");

  const { data: rules = [], refetch, isLoading, error } = useQuery({
    queryKey: ["automation", "rules"],
    queryFn: fetchRules,
  });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [testRuleId, setTestRuleId] = useState<string | null>(null);
  const [testThreadId, setTestThreadId] = useState("");
  const [testMessageText, setTestMessageText] = useState("");
  const [testResult, setTestResult] = useState<{
    conditionsMatch: boolean;
    wouldExecute: boolean;
    matchingRulesCount: number;
  } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const { data: convData } = useQuery({
    queryKey: ["automation", "conversations"],
    queryFn: () => fetchInboxConversations(undefined),
    enabled: Boolean(testRuleId),
  });
  const { data: tags = [] } = useQuery({
    queryKey: ["automation", "tags"],
    queryFn: fetchInboxTags,
    enabled: showForm,
  });
  const { data: users = [] } = useQuery({
    queryKey: ["automation", "users"],
    queryFn: fetchInboxUsers,
    enabled: showForm,
  });

  const threads = convData?.threads ?? [];

  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<string>("MESSAGE_INBOUND");
  const [condField, setCondField] = useState("messageText");
  const [condOp, setCondOp] = useState("contains");
  const [condValue, setCondValue] = useState("");
  const [actions, setActions] = useState<
    { type: string; params?: Record<string, unknown> }[]
  >([{ type: "logAction", params: { message: "Regra executada" } }]);

  const resetForm = useCallback(() => {
    setName("");
    setTriggerType("MESSAGE_INBOUND");
    setCondField("messageText");
    setCondOp("contains");
    setCondValue("");
    setActions([{ type: "logAction", params: { message: "Regra executada" } }]);
    setShowForm(false);
    setApiError(null);
  }, []);

  const applyTemplate = useCallback((tpl: "urgent" | "log" | "reply") => {
    setApiError(null);
    setShowForm(true);
    if (tpl === "urgent") {
      setName("Urgência: palavra \"urgente\"");
      setTriggerType("MESSAGE_INBOUND");
      setCondField("messageText");
      setCondOp("contains");
      setCondValue("urgente");
      setActions([{ type: "setPriority", params: { priority: "HIGH" } }]);
    } else if (tpl === "log") {
      setName("Registo: mensagem recebida");
      setTriggerType("MESSAGE_INBOUND");
      setCondField("messageText");
      setCondOp("exists");
      setCondValue("");
      setActions([{ type: "logAction", params: { message: "Chegou mensagem à inbox" } }]);
    } else {
      setName("Horário: resposta automática");
      setTriggerType("MESSAGE_INBOUND");
      setCondField("messageText");
      setCondOp("contains");
      setCondValue("horário");
      setActions([
        {
          type: "sendMessage",
          params: {
            text: "O nosso horário habitual é 9h–18h. Um colega irá responder em breve.",
          },
        },
      ]);
    }
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);
    setLoading(true);
    try {
      const conditions =
        condValue.trim() || condOp === "isNull"
          ? [{ field: condField, operator: condOp, value: condValue.trim() || null }]
          : [];
      const res = await fetchProtected("/api/automation/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          triggerType,
          conditions,
          actions,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(protectedApiUserMessage(res.status, data));
      }
      resetForm();
      refetch();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erro ao criar");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    setApiError(null);
    setLoading(true);
    try {
      const res = await fetchProtected(`/api/automation/rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(protectedApiUserMessage(res.status, data));
      }
      refetch();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erro ao atualizar");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta regra?")) return;
    setApiError(null);
    setLoading(true);
    try {
      const res = await fetchProtected(`/api/automation/rules/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(protectedApiUserMessage(res.status, data));
      }
      refetch();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erro ao remover");
    } finally {
      setLoading(false);
    }
  }

  async function handleTest(ruleId: string) {
    if (!testThreadId.trim()) {
      setApiError("Selecione uma conversa para testar");
      return;
    }
    setApiError(null);
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetchProtected(`/api/automation/rules/${ruleId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: testThreadId,
          messageText: testMessageText.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { conditionsMatch: boolean; wouldExecute: boolean; matchingRulesCount: number };
        error?: string;
      };
      if (!res.ok) {
        throw new Error(protectedApiUserMessage(res.status, json));
      }
      setTestResult(json.data ?? null);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erro ao testar");
    } finally {
      setTestLoading(false);
    }
  }

  function addAction() {
    setActions((prev) => [...prev, { type: "logAction", params: { message: "" } }]);
  }

  function updateAction(i: number, updates: Partial<(typeof actions)[0]>) {
    setActions((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...updates };
      return next;
    });
  }

  function removeAction(i: number) {
    setActions((prev) => prev.filter((_, idx) => idx !== i));
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Automações"
          title="Automação"
          description="Regras que reagem a mensagens e eventos da Inbox."
          layout="split"
          showDivider
        />
        <StateError
          title="Não foi possível carregar as regras"
          message={error instanceof Error ? error.message : "Erro ao carregar."}
          onRetry={() => void refetch()}
        />
        <Link href="/dashboard" className={buttonClassName("secondary")}>
          Voltar ao painel
        </Link>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        eyebrow="Automações"
        title="O que acontece quando chega uma mensagem"
        description={
          <>
            Cada regra tem um <strong className="font-semibold text-slate-800">quando</strong> (gatilho), opcionalmente
            um <strong className="font-semibold text-slate-800">se</strong> (condição) e uma ou mais{" "}
            <strong className="font-semibold text-slate-800">ações</strong> (ex.: enviar texto, mudar prioridade). As
            regras ativas correm na ordem definida pelo sistema quando o evento ocorre.
          </>
        }
        layout="split"
        showDivider
        actions={
          !showForm ? (
            <Button
              type="button"
              disabled={automationOutboundLocked}
              title={automationOutboundLocked ? "Disponível após ativação do número" : undefined}
              onClick={() => setShowForm(true)}
            >
              Nova regra
            </Button>
          ) : null
        }
      />

      {automationOutboundLocked ? (
        <div
          className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          Automações que enviam mensagens ficam disponíveis após a Meta aprovar o número e o canal ser ativado com
          token.
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">Modelos para começar</h2>
        <p className="mt-1 text-sm text-slate-600">
          Preenchem o formulário por si; pode editar antes de guardar.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            disabled={automationOutboundLocked}
            title={automationOutboundLocked ? "Disponível após ativação do número" : undefined}
            onClick={() => applyTemplate("urgent")}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm shadow-sm transition hover:border-[var(--df-brand-300)] hover:bg-[var(--df-brand-50)] disabled:opacity-50"
          >
            <span className="font-semibold text-slate-900">Palavra &quot;urgente&quot;</span>
            <span className="mt-1 block text-xs text-slate-600">
              Se a mensagem contiver &quot;urgente&quot;, marca a conversa como prioridade alta.
            </span>
          </button>
          <button
            type="button"
            disabled={automationOutboundLocked}
            title={automationOutboundLocked ? "Disponível após ativação do número" : undefined}
            onClick={() => applyTemplate("log")}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm shadow-sm transition hover:border-[var(--df-brand-300)] hover:bg-[var(--df-brand-50)] disabled:opacity-50"
          >
            <span className="font-semibold text-slate-900">Registar receção</span>
            <span className="mt-1 block text-xs text-slate-600">
              Em cada mensagem recebida, deixa um registo no histórico (útil para auditoria).
            </span>
          </button>
          <button
            type="button"
            disabled={automationOutboundLocked}
            title={automationOutboundLocked ? "Disponível após ativação do número" : undefined}
            onClick={() => applyTemplate("reply")}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm shadow-sm transition hover:border-[var(--df-brand-300)] hover:bg-[var(--df-brand-50)] disabled:opacity-50"
          >
            <span className="font-semibold text-slate-900">Perguntas sobre horário</span>
            <span className="mt-1 block text-xs text-slate-600">
              Se escreverem &quot;horário&quot;, responde automaticamente com texto de horário de atendimento.
            </span>
          </button>
        </div>
      </section>

      {(apiError || testResult) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${
            apiError
              ? "border-red-200/90 bg-red-50/90 text-red-800"
              : "border-slate-200/90 bg-slate-50/90 text-slate-800"
          }`}
          role={apiError ? "alert" : "status"}
        >
          {apiError ? <p className="font-medium">{apiError}</p> : null}
          {testResult && !apiError ? (
            <ul className="space-y-1.5">
              <li>
                <span className="font-semibold text-slate-700">Condições:</span>{" "}
                {testResult.conditionsMatch ? "Sim" : "Não"}
              </li>
              <li>
                <span className="font-semibold text-slate-700">Executaria a regra:</span>{" "}
                {testResult.wouldExecute ? "Sim" : "Não"}
              </li>
              <li>
                <span className="font-semibold text-slate-700">Regras coincidentes:</span>{" "}
                {testResult.matchingRulesCount}
              </li>
            </ul>
          ) : null}
        </div>
      )}

      <div className="mb-4">
        {showForm ? (
          <form onSubmit={handleCreate} className="max-w-2xl">
            <FormSection
              title="Nova regra"
              description='Dê um nome claro (ex.: «Pedidos de fatura») para encontrar depois na lista. O gatilho define quando a regra é avaliada; condições e ações são opcionais conforme o caso.'
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="rule-name" label="Nome" htmlFor="rule-name">
                  <input
                    id="rule-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className={fieldInputClassName}
                    placeholder="Ex.: Priorizar cancelamento"
                  />
                </FormField>
                <FormField id="rule-trigger" label="Gatilho" htmlFor="rule-trigger">
                  <select
                    id="rule-trigger"
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value)}
                    className={fieldSelectClassName}
                  >
                    {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField
                label="Condição"
                help="Opcional. Sem valor, alguns operadores aplicam-se ao próprio campo (ex.: existe)."
              >
                <div className="flex flex-wrap items-end gap-2">
                  <select
                    value={condField}
                    onChange={(e) => setCondField(e.target.value)}
                    className={`min-w-[10rem] flex-1 sm:flex-none ${fieldControlCompact}`}
                  >
                    <option value="messageText">Texto da mensagem</option>
                    <option value="status">Status</option>
                    <option value="assignedToUserId">Atribuído a</option>
                    <option value="tags">Tags</option>
                  </select>
                  <select
                    value={condOp}
                    onChange={(e) => setCondOp(e.target.value)}
                    className={`min-w-[7rem] ${fieldControlCompact}`}
                  >
                    <option value="contains">contém</option>
                    <option value="equals">igual a</option>
                    <option value="notEquals">diferente de</option>
                    <option value="exists">existe</option>
                    <option value="isNull">é nulo</option>
                  </select>
                  {condOp !== "isNull" && condOp !== "exists" ? (
                    <input
                      type="text"
                      value={condValue}
                      onChange={(e) => setCondValue(e.target.value)}
                      className={`min-w-[8rem] flex-1 sm:w-44 ${fieldControlCompact}`}
                      placeholder="Valor"
                    />
                  ) : null}
                </div>
              </FormField>

              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700">Ações</span>
                  <Button type="button" size="sm" variant="ghost" onClick={addAction}>
                    + Ação
                  </Button>
                </div>
                <div className="space-y-2">
                  {actions.map((a, i) => (
                    <ActionRow
                      key={i}
                      action={a}
                      tags={tags}
                      users={users}
                      onChange={(up) => updateAction(i, up)}
                      onRemove={() => removeAction(i)}
                      canRemove={actions.length > 1}
                    />
                  ))}
                </div>
              </div>

              <FormActions>
                <Button type="submit" disabled={loading}>
                  {loading ? "A criar…" : "Criar regra"}
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancelar
                </Button>
              </FormActions>
            </FormSection>
          </form>
        ) : null}
      </div>

      {isLoading ? (
        <StateLoading message="A carregar regras…" />
      ) : rules.length === 0 ? (
        <StateEmpty
          title="Ainda não há regras"
          description="Use um modelo abaixo para preencher o formulário ou crie uma regra à medida com «Nova regra» no topo. As regras ativas executam-se quando chegam mensagens ou mudam estados."
          action={
            <Button type="button" onClick={() => setShowForm(true)}>
              Criar primeira regra
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
          {rules.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.name}</span>
                  <AppBadge variant={r.isActive ? "brand" : "neutral"}>
                    {r.isActive ? "Ativa" : "Inativa"}
                  </AppBadge>
                  {r.isSystem ? <AppBadge variant="muted">Sistema</AppBadge> : null}
                  <span className="text-xs text-slate-500">
                    {TRIGGER_LABELS[r.triggerType] ?? r.triggerType}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {r.conditions.length} condição(ões) · {r.actions.length} ação(ões)
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggle(r.id, r.isActive)}
                  disabled={loading}
                >
                  {r.isActive ? "Desativar" : "Ativar"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTestRuleId(r.id);
                    setTestThreadId("");
                    setTestMessageText("");
                    setTestResult(null);
                    setApiError(null);
                  }}
                >
                  Testar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(r.id)}
                  disabled={loading || r.isSystem}
                  title={r.isSystem ? "Regras de sistema não podem ser removidas" : undefined}
                >
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {testRuleId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]">
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl ring-1 ring-black/[0.06]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="automation-test-title"
          >
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
              <h3 id="automation-test-title" className="text-base font-bold tracking-tight text-slate-900">
                Testar regra
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Simula o contexto de uma conversa real. O resultado aparece no painel acima da lista.
              </p>
            </div>
            <div className="space-y-4 px-5 py-5">
              <FormField
                id="test-thread"
                label="Conversa"
                htmlFor="test-thread"
                help="Threads existentes na Inbox."
              >
                <select
                  id="test-thread"
                  value={testThreadId}
                  onChange={(e) => setTestThreadId(e.target.value)}
                  className={fieldSelectClassName}
                >
                  <option value="">Selecione…</option>
                  {threads.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.contactName ?? t.phoneNumber ?? t.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                id="test-msg"
                label="Texto da mensagem"
                htmlFor="test-msg"
                help="Opcional. Útil para testar condições sobre o conteúdo."
                optional
              >
                <input
                  id="test-msg"
                  type="text"
                  value={testMessageText}
                  onChange={(e) => setTestMessageText(e.target.value)}
                  className={fieldInputClassName}
                  placeholder="Ex.: quero cancelar"
                />
              </FormField>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4">
              <Button
                type="button"
                onClick={() => handleTest(testRuleId)}
                disabled={testLoading || !testThreadId.trim()}
              >
                {testLoading ? "A testar…" : "Executar teste"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setTestRuleId(null);
                  setTestResult(null);
                  setApiError(null);
                }}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActionRow({
  action,
  tags,
  users,
  onChange,
  onRemove,
  canRemove,
}: {
  action: { type: string; params?: Record<string, unknown> };
  tags: { id: string; name: string }[];
  users: { id: string; name: string }[];
  onChange: (up: Partial<{ type: string; params?: Record<string, unknown> }>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const actionTypes = [
    { value: "assignConversation", label: "Atribuir" },
    { value: "updateStatus", label: "Status" },
    { value: "addTag", label: "Adicionar tag" },
    { value: "removeTag", label: "Remover tag" },
    { value: "setPriority", label: "Prioridade" },
    { value: "sendMessage", label: "Enviar mensagem" },
    { value: "triggerAIResponse", label: "Disparar IA" },
    { value: "logAction", label: "Registrar log" },
  ];
  const params = action.params ?? {};

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200/90 bg-slate-50/60 p-3 ring-1 ring-slate-900/[0.02]">
      <select
        value={action.type}
        onChange={(e) => onChange({ type: e.target.value })}
        className={`min-w-[9rem] ${fieldControlCompact}`}
      >
        {actionTypes.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>
      {action.type === "assignConversation" && (
        <select
          value={(params.userId as string) ?? "auto"}
          onChange={(e) =>
            onChange({
              params: { ...params, userId: e.target.value === "auto" ? "auto" : e.target.value },
            })
          }
          className={fieldControlCompact}
        >
          <option value="auto">Automático</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      )}
      {action.type === "updateStatus" && (
        <select
          value={(params.status as string) ?? "OPEN"}
          onChange={(e) => onChange({ params: { ...params, status: e.target.value } })}
          className={fieldControlCompact}
        >
          <option value="OPEN">Aberto</option>
          <option value="PENDING">Pendente</option>
          <option value="CLOSED">Fechado</option>
        </select>
      )}
      {(action.type === "addTag" || action.type === "removeTag") && (
        <select
          value={(params.tagId as string) ?? ""}
          onChange={(e) => onChange({ params: { ...params, tagId: e.target.value } })}
          className={fieldControlCompact}
        >
          <option value="">Selecione…</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}
      {action.type === "setPriority" && (
        <select
          value={(params.priority as string) ?? "NORMAL"}
          onChange={(e) => onChange({ params: { ...params, priority: e.target.value } })}
          className={fieldControlCompact}
        >
          <option value="LOW">Baixa</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">Alta</option>
        </select>
      )}
      {action.type === "sendMessage" && (
        <input
          type="text"
          value={(params.text as string) ?? ""}
          onChange={(e) => onChange({ params: { ...params, text: e.target.value } })}
          className={`min-w-[12rem] flex-1 sm:max-w-xs ${fieldControlCompact}`}
          placeholder="Texto"
        />
      )}
      {action.type === "logAction" && (
        <input
          type="text"
          value={(params.message as string) ?? ""}
          onChange={(e) => onChange({ params: { ...params, message: e.target.value } })}
          className={`min-w-[10rem] flex-1 sm:w-44 ${fieldControlCompact}`}
          placeholder="Mensagem"
        />
      )}
      {canRemove && (
        <Button size="sm" variant="ghost" className="text-red-600" onClick={onRemove}>
          ×
        </Button>
      )}
    </div>
  );
}
