"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button, Badge } from "@devflow/ui";
import {
  fetchInboxConversations,
  fetchInboxTags,
  fetchInboxUsers,
} from "@/components/inbox/inboxFetch";

type RuleItem = {
  id: string;
  name: string;
  isActive: boolean;
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
  const res = await fetch("/api/automation/rules", { credentials: "include" });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Faça login para acessar");
    throw new Error("Falha ao carregar regras");
  }
  const json = (await res.json()) as { success: boolean; data: { rules: RuleItem[] } };
  return json.data.rules ?? [];
}

export function AutomationClient() {
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
    queryFn: () => fetchInboxConversations("all"),
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);
    setLoading(true);
    try {
      const conditions =
        condValue.trim() || condOp === "isNull"
          ? [{ field: condField, operator: condOp, value: condValue.trim() || null }]
          : [];
      const res = await fetch("/api/automation/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          triggerType,
          conditions,
          actions,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Falha ao criar regra");
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
      const res = await fetch(`/api/automation/rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Falha ao atualizar");
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
      const res = await fetch(`/api/automation/rules/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Falha ao remover");
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
      const res = await fetch(`/api/automation/rules/${ruleId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          threadId: testThreadId,
          messageText: testMessageText.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Falha ao testar");
      }
      const json = (await res.json()) as {
        success: boolean;
        data: { conditionsMatch: boolean; wouldExecute: boolean; matchingRulesCount: number };
      };
      setTestResult(json.data);
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
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-semibold mb-4">Automação</h1>
        <Link href="/dashboard" className="text-blue-600 underline">
          Voltar ao Dashboard
        </Link>
        <p className="mt-4 text-red-600">
          {error instanceof Error ? error.message : "Erro ao carregar"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Automação</h1>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ← Dashboard
        </Link>
      </div>

      {(apiError || testResult) && (
        <div className="mb-4 p-3 rounded-lg border bg-slate-50">
          {apiError && <p className="text-red-600 text-sm">{apiError}</p>}
          {testResult && !apiError && (
            <div className="text-sm space-y-1">
              <p>
                <strong>Condições batem:</strong>{" "}
                {testResult.conditionsMatch ? "Sim" : "Não"}
              </p>
              <p>
                <strong>Regra seria executada:</strong>{" "}
                {testResult.wouldExecute ? "Sim" : "Não"}
              </p>
              <p>
                <strong>Regras que batem:</strong> {testResult.matchingRulesCount}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        {!showForm ? (
          <Button type="button" onClick={() => setShowForm(true)}>
            Nova regra
          </Button>
        ) : (
          <form
            onSubmit={handleCreate}
            className="p-4 rounded-lg border bg-slate-50 space-y-4 max-w-2xl"
          >
            <h2 className="font-medium">Nova regra de automação</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ex: Priorizar cancelamento"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Gatilho</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">Condição (opcional)</label>
              <div className="flex flex-wrap gap-2 items-end">
                <select
                  value={condField}
                  onChange={(e) => setCondField(e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="messageText">Texto da mensagem</option>
                  <option value="status">Status</option>
                  <option value="assignedToUserId">Atribuído a</option>
                  <option value="tags">Tags</option>
                </select>
                <select
                  value={condOp}
                  onChange={(e) => setCondOp(e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="contains">contém</option>
                  <option value="equals">igual a</option>
                  <option value="notEquals">diferente de</option>
                  <option value="exists">existe</option>
                  <option value="isNull">é nulo</option>
                </select>
                {condOp !== "isNull" && condOp !== "exists" && (
                  <input
                    type="text"
                    value={condValue}
                    onChange={(e) => setCondValue(e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1.5 text-sm w-40"
                    placeholder="Valor"
                  />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-slate-600">Ações</label>
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

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Criando…" : "Criar"}
              </Button>
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </div>

      {isLoading ? (
        <p className="text-slate-500">Carregando regras…</p>
      ) : rules.length === 0 ? (
        <p className="text-slate-600">Nenhuma regra cadastrada. Crie uma acima.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rules.map((r) => (
            <li key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.name}</span>
                  <Badge variant={r.isActive ? "primary" : "default"}>
                    {r.isActive ? "Ativa" : "Inativa"}
                  </Badge>
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
                  disabled={loading}
                >
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {testRuleId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-md w-full">
            <h3 className="font-medium mb-3">Testar regra</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Conversa</label>
                <select
                  value={testThreadId}
                  onChange={(e) => setTestThreadId(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Selecione…</option>
                  {threads.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.contactName ?? t.phoneNumber ?? t.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Texto da mensagem (opcional)
                </label>
                <input
                  type="text"
                  value={testMessageText}
                  onChange={(e) => setTestMessageText(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ex: quero cancelar"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                onClick={() => handleTest(testRuleId)}
                disabled={testLoading || !testThreadId.trim()}
              >
                {testLoading ? "Testando…" : "Executar teste"}
              </Button>
              <Button
                size="sm"
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
      )}
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
    <div className="flex flex-wrap gap-2 items-end rounded border border-slate-200 p-2 bg-white">
      <select
        value={action.type}
        onChange={(e) => onChange({ type: e.target.value })}
        className="rounded border border-slate-300 px-2 py-1 text-sm"
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
          className="rounded border border-slate-300 px-2 py-1 text-sm"
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
          className="rounded border border-slate-300 px-2 py-1 text-sm"
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
          className="rounded border border-slate-300 px-2 py-1 text-sm"
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
          className="rounded border border-slate-300 px-2 py-1 text-sm"
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
          className="rounded border border-slate-300 px-2 py-1 text-sm w-48"
          placeholder="Texto"
        />
      )}
      {action.type === "logAction" && (
        <input
          type="text"
          value={(params.message as string) ?? ""}
          onChange={(e) => onChange({ params: { ...params, message: e.target.value } })}
          className="rounded border border-slate-300 px-2 py-1 text-sm w-40"
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
