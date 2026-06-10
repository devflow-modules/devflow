"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  OUTBOUND_LEAD_STATUS_DISPLAY_ORDER,
  OUTBOUND_LEAD_STATUS_PRIORITY,
} from "@/lib/admin-outbound-leads";
import {
  addLocalDaysWithHour,
  deriveFollowupUrgency,
} from "@/lib/admin-lead-followup";
import type { ConversionMetricsPayload } from "@/lib/admin-lead-conversion-metrics";
import { getContactStalePresentation, daysSinceLastContactAt } from "@/lib/admin-lead-stale";
import { getNextAction } from "@/lib/lead-next-action";
import {
  firstContactTemplate,
  followUpTemplate,
  sendDemoTemplate,
  getTemplateByAction,
  buildWhatsAppUrlWithMessage,
} from "@/lib/lead-message-templates";
import { whatsappAppUrl } from "@/lib/whatsapp-app-url";
import {
  OUTBOUND_LEAD_ORIGINS,
  OUTBOUND_LEAD_ORIGIN_LABELS,
  isCanonicalLeadOrigin,
} from "@/lib/outbound-lead-origins";
import { Button } from "@/components/ui/button";

export type LeadRow = {
  id: string;
  name: string | null;
  company: string | null;
  phone: string;
  status: string;
  notes: string | null;
  origin: string | null;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  convertedAt: string | null;
  convertedToType: string | null;
  convertedToRef: string | null;
  conversationRef: string | null;
  assignedOperatorId?: string | null;
  assignedOperator?: { id: string; name: string; email: string } | null;
  daysSinceLastContact?: number | null;
  leadActionState?: {
    needsFollowUp: boolean;
    urgency: "low" | "medium" | "high";
    reason: string;
  };
  suggestedAction?: {
    label: string;
    type: "contact" | "followup" | "demo" | "close" | "none";
  };
  createdAt: string;
  updatedAt: string;
};

type SummaryPayload = {
  byStatus: Record<string, number>;
  total: number;
  countsByStatus: Record<string, number>;
  funnelStageCounts?: Record<string, number>;
  conversionMetrics: ConversionMetricsPayload;
};

type WhatsappOperatorOption = { id: string; name: string; email: string };

type WhatsappPilotTenantOption = {
  id: string;
  name: string | null;
  gtmLifecycle: string;
  whatsappPhone: string | null;
};

const STATUS_OPTIONS = [
  "novo",
  "contato_iniciado",
  "respondeu",
  "qualificado",
  "demo_enviada",
  "negociacao",
  "reuniao",
  "ganho",
  "fechado",
  "perdido",
  "pausado",
] as const;

const QUICK_ACTIONS = [
  { label: "Contato iniciado", status: "contato_iniciado" },
  { label: "Demo enviada", status: "demo_enviada" },
  { label: "Negociação", status: "negociacao" },
  { label: "Fechado", status: "fechado" },
  { label: "Perdido", status: "perdido" },
] as const;

const FOLLOWUP_FILTERS = [
  { value: "", label: "Todos os FU" },
  { value: "overdue", label: "Atrasado" },
  { value: "today", label: "Hoje" },
  { value: "none", label: "Sem follow-up" },
] as const;

const STALE_FILTERS = [
  { value: "", label: "Todos" },
  { value: "true", label: "Parados (+3d)" },
] as const;

function waMeUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "#";
  return `https://wa.me/${digits}`;
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatRatePct2(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(2)}%`;
}

function conversationChatUrl(ref: string): string {
  const id = ref.trim();
  if (!id) return whatsappAppUrl("/admin/conversations");
  return whatsappAppUrl(`/admin/conversations/${encodeURIComponent(id)}`);
}

function urgencyListBorder(u: "low" | "medium" | "high" | undefined): string {
  if (u === "high") return "border-l-4 border-l-destructive";
  if (u === "medium") return "border-l-4 border-l-orange-500";
  if (u === "low") return "border-l-4 border-l-amber-400";
  return "border-l-4 border-l-border";
}

/** Borda esquerda por prioridade do NBA (próxima ação comercial). */
function nbaPriorityBorder(p: "low" | "medium" | "high"): string {
  if (p === "high") return "border-l-4 border-l-destructive";
  if (p === "medium") return "border-l-4 border-l-orange-500";
  return "border-l-4 border-l-border";
}

export function AdminLeadsClient() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [originFilter, setOriginFilter] = useState<string>("");
  const [followupFilter, setFollowupFilter] = useState<string>("");
  const [staleFilter, setStaleFilter] = useState<string>("");
  const [assignmentScope, setAssignmentScope] = useState<"all" | "mine" | "unassigned">("all");
  const [operatorFilterId, setOperatorFilterId] = useState<string>("");
  const [operators, setOperators] = useState<WhatsappOperatorOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [actionList, setActionList] = useState<LeadRow[]>([]);
  const [highlightConvertLeadId, setHighlightConvertLeadId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [convertModalLead, setConvertModalLead] = useState<LeadRow | null>(null);
  const [pilotTenants, setPilotTenants] = useState<WhatsappPilotTenantOption[]>([]);
  const [pilotTenantsLoading, setPilotTenantsLoading] = useState(false);
  const [pilotTenantsWarning, setPilotTenantsWarning] = useState<string | null>(null);
  const [selectedPilotTenantId, setSelectedPilotTenantId] = useState("");
  const [manualPilotTenantId, setManualPilotTenantId] = useState("");
  const [pilotInternalOwner, setPilotInternalOwner] = useState("");
  const [pilotConfirmChecked, setPilotConfirmChecked] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", phone: "", origin: "", notes: "", nextFollowUpAt: "" });
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [originDrafts, setOriginDrafts] = useState<Record<string, string>>({});
  const [conversationDrafts, setConversationDrafts] = useState<Record<string, string>>({});

  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (statusFilter) q.set("status", statusFilter);
    if (originFilter.trim()) q.set("origin", originFilter.trim());
    if (followupFilter) q.set("followup", followupFilter);
    if (staleFilter) q.set("stale", staleFilter);
    if (assignmentScope === "mine") q.set("scope", "mine");
    if (assignmentScope === "unassigned") q.set("scope", "unassigned");
    if (assignmentScope === "all" && operatorFilterId.trim()) {
      q.set("operatorId", operatorFilterId.trim());
    }
    const s = q.toString();
    return s ? `?${s}` : "";
  }, [statusFilter, originFilter, followupFilter, staleFilter, assignmentScope, operatorFilterId]);

  const load = useCallback(
    async (opts?: { syncFromConversation?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams(query.replace(/^\?/, ""));
      if (opts?.syncFromConversation) p.set("syncFromConversation", "1");
      const qs = p.toString() ? `?${p.toString()}` : "";

      const res = await fetch(`/api/admin/leads${qs}`, { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as {
        leads?: LeadRow[];
        actionList?: LeadRow[];
        summary?: SummaryPayload;
        currentUserId?: string | null;
        operators?: WhatsappOperatorOption[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `Erro ${res.status}`);
        setLeads([]);
        setActionList([]);
        setSummary(null);
        setCurrentUserId(null);
        setOperators([]);
        return;
      }
      setLeads(data.leads ?? []);
      setActionList(data.actionList ?? []);
      setSummary(data.summary ?? null);
      setCurrentUserId(data.currentUserId ?? null);
      setOperators(data.operators ?? []);
      setNoteDrafts((prev) => {
        const next = { ...prev };
        for (const l of data.leads ?? []) {
          if (next[l.id] === undefined) next[l.id] = l.notes ?? "";
        }
        return next;
      });
      setOriginDrafts((prev) => {
        const next = { ...prev };
        for (const l of data.leads ?? []) {
          if (next[l.id] === undefined) next[l.id] = l.origin ?? "";
        }
        return next;
      });
      setConversationDrafts((prev) => {
        const next = { ...prev };
        for (const l of data.leads ?? []) {
          if (next[l.id] === undefined) next[l.id] = l.conversationRef ?? "";
        }
        return next;
      });
    } catch {
      setError("Falha ao carregar leads");
      setLeads([]);
      setActionList([]);
      setSummary(null);
      setCurrentUserId(null);
      setOperators([]);
    } finally {
      setLoading(false);
    }
  },
    [query]
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function createLead(e: React.FormEvent) {
    e.preventDefault();
    if (!form.phone.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: form.phone.trim(),
          name: form.name.trim() || null,
          company: form.company.trim() || null,
          ...(form.origin.trim() ? { origin: form.origin.trim() } : {}),
          notes: form.notes.trim() || null,
          nextFollowUpAt: form.nextFollowUpAt || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Erro ${res.status}`);
        return;
      }
      setForm({ name: "", company: "", phone: "", origin: "", notes: "", nextFollowUpAt: "" });
      await load();
    } catch {
      setError("Falha ao criar lead");
    } finally {
      setCreating(false);
    }
  }

  async function patchLead(id: string, payload: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/admin/leads/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? `Erro ${res.status}`);
      return;
    }
    await load();
  }

  async function loadPilotTenants() {
    setPilotTenantsLoading(true);
    setPilotTenantsWarning(null);
    try {
      const res = await fetch("/api/admin/leads/whatsapp-tenants", { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as {
        tenants?: WhatsappPilotTenantOption[];
        warning?: string;
        error?: string;
      };
      if (!res.ok) {
        setPilotTenants([]);
        setPilotTenantsWarning(data.error ?? "Não foi possível carregar tenants.");
        return;
      }
      setPilotTenants(data.tenants ?? []);
      setPilotTenantsWarning(data.warning ?? null);
    } catch {
      setPilotTenants([]);
      setPilotTenantsWarning("Não foi possível carregar tenants.");
    } finally {
      setPilotTenantsLoading(false);
    }
  }

  function openConvertModal(lead: LeadRow) {
    setConvertModalLead(lead);
    setSelectedPilotTenantId("");
    setManualPilotTenantId("");
    setPilotInternalOwner("");
    setPilotConfirmChecked(false);
    setError(null);
    void loadPilotTenants();
  }

  function closeConvertModal() {
    setConvertModalLead(null);
    setSelectedPilotTenantId("");
    setManualPilotTenantId("");
    setPilotInternalOwner("");
    setPilotConfirmChecked(false);
  }

  async function convertLead(id: string, tenantId: string) {
    setConverting(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/leads/${id}/convert`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          confirm: true,
          internalOwner: pilotInternalOwner.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Erro ${res.status}`);
        return;
      }
      closeConvertModal();
      toast.success("Lead associado ao tenant piloto.");
      await load();
    } catch {
      setError("Falha ao converter lead");
    } finally {
      setConverting(null);
    }
  }

  async function submitPilotConversion() {
    if (!convertModalLead) return;
    const tenantId = selectedPilotTenantId || manualPilotTenantId.trim();
    if (!tenantId) {
      setError("Selecione ou informe o tenant piloto da WhatsApp Platform.");
      return;
    }
    if (!pilotConfirmChecked) {
      setError("Confirme a associação lead → tenant piloto.");
      return;
    }
    await convertLead(convertModalLead.id, tenantId);
  }

  const logNba = useCallback((leadId: string, actionType: string) => {
    void fetch(`/api/admin/leads/${leadId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastSuggestedActionType: actionType }),
    });
  }, []);

  const runNba = useCallback(
    (lead: LeadRow) => {
      const nba = getNextAction(lead);
      if (nba.type === "none") return;
      logNba(lead.id, nba.type);
      if (nba.type === "close") {
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        setHighlightConvertLeadId(lead.id);
        highlightTimerRef.current = setTimeout(() => {
          setHighlightConvertLeadId(null);
          highlightTimerRef.current = null;
        }, 4000);
        document.getElementById(`lead-convert-${lead.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        toast.info("Ajuste o status manualmente. Use «Converter em cliente» quando fizer sentido.");
        return;
      }
      const text = getTemplateByAction(nba.type, lead);
      if (!text.trim()) return;
      const url = buildWhatsAppUrlWithMessage(lead.phone, text);
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [logNba]
  );

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  function setFollowupDays(id: string, days: number) {
    const iso = addLocalDaysWithHour(new Date(), days, 10, 0).toISOString();
    return patchLead(id, { nextFollowUpAt: iso });
  }

  const summaryEntries = useMemo(() => {
    if (!summary) return [];
    const keys = new Set([
      ...OUTBOUND_LEAD_STATUS_DISPLAY_ORDER,
      ...Object.keys(summary.byStatus),
    ]);
    return [...keys].sort((a, b) => {
      const pa = OUTBOUND_LEAD_STATUS_PRIORITY[a] ?? 50;
      const pb = OUTBOUND_LEAD_STATUS_PRIORITY[b] ?? 50;
      if (pa !== pb) return pa - pb;
      return a.localeCompare(b);
    });
  }, [summary]);

  const m = summary?.conversionMetrics;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="rounded-lg border border-amber-500/40 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 dark:border-amber-600/50 dark:bg-amber-950/40 dark:text-amber-50">
            <span className="font-semibold">Prospecção interna DevFlow</span>
            <span className="text-amber-900/90 dark:text-amber-100/90">
              {" "}
              — ferramenta comercial interna; o estado operacional do cliente vive no Inbox (WhatsApp Platform).
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-foreground">Prospecção DevFlow</h1>
          <p className="mt-1 text-sm text-muted-foreground">Painel comercial: prospecção, follow-up e conversão.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/lead-finder"
            className="inline-flex items-center rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
          >
            Buscar leads (Maps)
          </Link>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">Todos</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Origem</span>
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
              className="min-w-[10.5rem] max-w-[14rem] rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">Todas</option>
              {OUTBOUND_LEAD_ORIGINS.map((o) => (
                <option key={o} value={o}>
                  {OUTBOUND_LEAD_ORIGIN_LABELS[o]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Follow-up</span>
            <select
              value={followupFilter}
              onChange={(e) => setFollowupFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              {FOLLOWUP_FILTERS.map((f) => (
                <option key={f.value || "all"} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Contato</span>
            <select
              value={staleFilter}
              onChange={(e) => setStaleFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              {STALE_FILTERS.map((f) => (
                <option key={f.value || "all-stale"} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Responsáveis</span>
            <select
              value={assignmentScope}
              onChange={(e) => {
                const v = e.target.value as "all" | "mine" | "unassigned";
                if (v === "mine" || v === "unassigned") setOperatorFilterId("");
                setAssignmentScope(v);
              }}
              className="min-w-[7.5rem] rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="all">Todos</option>
              <option value="mine">Meus leads</option>
              <option value="unassigned">Não atribuídos</option>
            </select>
          </label>
          {assignmentScope === "all" && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Operador</span>
              <select
                value={operatorFilterId}
                onChange={(e) => setOperatorFilterId(e.target.value)}
                className="min-w-[9.5rem] max-w-[14rem] rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                disabled={operators.length === 0}
              >
                <option value="">Qualquer</option>
                {operators.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name?.trim() || o.email}
                  </option>
                ))}
              </select>
            </label>
          )}
          {currentUserId && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOperatorFilterId("");
                setAssignmentScope("mine");
              }}
              className="h-auto min-h-0 whitespace-nowrap px-0 py-0 text-xs font-medium text-primary underline-offset-4 shadow-none hover:underline"
            >
              Só meus
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => void load({ syncFromConversation: true })}
            className="h-auto min-h-0 whitespace-nowrap px-0 py-0 text-xs font-medium text-muted-foreground underline-offset-4 shadow-none hover:underline"
            title="Unidirecional: copia assignee da conversa se o lead ainda não tiver responsável (até 50 por pedido)"
          >
            Sincronizar c/ conversa
          </Button>
          <Link
            href="/admin/metrics"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            ← Métricas
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!loading && actionList.length > 0 && (
        <section className="mb-6" aria-label="Ações de hoje">
          <h2 className="mb-3 text-base font-semibold text-foreground">🔥 Ações de hoje</h2>
          <ul className="space-y-2">
            {actionList.map((lead) => {
              const u = lead.leadActionState?.urgency;
              const nba = getNextAction(lead);
              return (
                <li
                  key={lead.id}
                  className={`flex flex-col gap-2 rounded-md border border-border bg-card p-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between ${urgencyListBorder(
                    u
                  )} pl-3`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {lead.name ?? "—"} {lead.company ? <span className="text-muted-foreground">· {lead.company}</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/90">NBA: {nba.label}</span>
                      {nba.priority === "high" ? (
                        <span className="ml-1 text-destructive">· alta</span>
                      ) : nba.priority === "medium" ? (
                        <span className="ml-1 text-orange-600">· média</span>
                      ) : null}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{lead.leadActionState?.reason}</p>
                  </div>
                  <Button variant="secondary"
                    type="button"
                    onClick={() => runNba(lead)}
                    disabled={nba.type === "none"}
                    className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {nba.type === "close" ? "Ir para conversão" : nba.type === "none" ? "—" : "Executar"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {m && (
        <section className="mb-6" aria-label="Métricas de conversão">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Métricas (origem e follow-up dos filtros; resumo de status abaixo ignora o filtro de status)</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {[
              { k: "Total", v: m.total },
              { k: "Novos", v: m.novos },
              { k: "Contato inic.", v: m.contatoIniciado },
              { k: "Respondeu", v: m.respondeu },
              { k: "Demo enviada", v: m.demoEnviada },
              { k: "Negociação", v: m.negociacao },
              { k: "Fechados", v: m.fechados },
              { k: "Perdidos", v: m.perdidos },
            ].map((c) => (
              <div key={c.k} className="rounded-lg border border-border bg-card px-2 py-2 text-center text-sm">
                <p className="text-xs text-muted-foreground">{c.k}</p>
                <p className="text-lg font-bold tabular-nums">{c.v}</p>
              </div>
            ))}
            <div className="col-span-2 text-xs text-muted-foreground sm:col-span-3 lg:col-span-4">
              Denominador das taxas: total de leads do resumo (filtros de origem e follow-up; status não aplica a este
              resumo agregado).
            </div>
          </div>
        </section>
      )}

      {summary && (
        <section className="mb-8" aria-label="Resumo por status">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Resumo por estágio{originFilter || followupFilter ? " (origem / follow-up aplicados ao funil resumido)" : ""} · {summary.total}{" "}
            lead(s)
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {summaryEntries.map((key) => {
              const n = summary.countsByStatus[key] ?? summary.byStatus[key] ?? 0;
              return (
                <div
                  key={key}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm"
                >
                  <p className="text-xs text-muted-foreground">{key || "—"}</p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">{n}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mb-10 rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Novo lead</h2>
        <form onSubmit={createLead} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Telefone (WhatsApp) *</span>
            <input
              required
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2"
              placeholder="+55 11 99999-0000"
              autoComplete="tel"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Nome</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Empresa</span>
            <input
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Origem</span>
            <select
              value={form.origin}
              onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="">Selecione… (opcional)</option>
              {OUTBOUND_LEAD_ORIGINS.map((o) => (
                <option key={o} value={o}>
                  {OUTBOUND_LEAD_ORIGIN_LABELS[o]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Próximo follow-up</span>
            <input
              type="datetime-local"
              value={form.nextFollowUpAt}
              onChange={(e) => setForm((f) => ({ ...f, nextFollowUpAt: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Notas</span>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2"
            />
          </label>
          <div className="flex items-end sm:col-span-2 lg:col-span-3">
            <Button variant="primary"
              type="submit"
              disabled={creating}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? "Salvando…" : "Adicionar lead"}
            </Button>
          </div>
        </form>
      </section>

      {m && m.total > 0 && (
        <section className="mb-4" aria-label="Taxas do funil">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Conversão (taxas)</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { k: "Resposta", v: m.responseRate },
              { k: "Demo", v: m.demoRate },
              { k: "Negociação", v: m.negotiationRate },
              { k: "Fechamento", v: m.closeRate },
            ].map((c) => (
              <div key={c.k} className="rounded-lg border border-border bg-card px-3 py-2.5 text-center text-sm shadow-sm">
                <p className="text-xs text-muted-foreground">{c.k}</p>
                <p className="text-lg font-bold tabular-nums text-foreground">{formatRatePct2(c.v)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full min-w-[1380px] text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-2 py-2 font-medium">Urg. / conv.</th>
              <th className="px-2 py-2 font-medium">Telefone</th>
              <th className="px-2 py-2 font-medium">Nome</th>
              <th className="px-2 py-2 font-medium">Empresa</th>
              <th className="px-2 py-2 font-medium min-w-[7.5rem]">Responsável</th>
              <th className="px-2 py-2 font-medium w-[90px]">Origem</th>
              <th className="px-2 py-2 font-medium">Conversa</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="px-2 py-2 font-medium min-w-[100px]">Próxima ação</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Últ. cont.</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Próx. FU</th>
              <th className="px-2 py-2 font-medium min-w-[140px]">Notas</th>
              <th className="px-2 py-2 font-medium w-[200px]">Ações comerciais</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Atual.</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={14} className="px-3 py-8 text-center text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-3 py-8 text-center text-muted-foreground">
                  Nenhum lead encontrado.
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const urg = deriveFollowupUrgency(lead.nextFollowUpAt);
                const hrefPrimeiro = buildWhatsAppUrlWithMessage(lead.phone, firstContactTemplate(lead));
                const hrefFu = buildWhatsAppUrlWithMessage(lead.phone, followUpTemplate(lead));
                const hrefDemo = buildWhatsAppUrlWithMessage(lead.phone, sendDemoTemplate(lead));
                const daysStale =
                  lead.daysSinceLastContact !== undefined
                    ? lead.daysSinceLastContact
                    : lead.lastContactAt != null
                      ? daysSinceLastContactAt(lead.lastContactAt)
                      : null;
                const staleP = getContactStalePresentation(lead.lastContactAt, daysStale);
                const isMine = Boolean(
                  currentUserId && (lead.assignedOperatorId === currentUserId || lead.assignedOperator?.id === currentUserId)
                );
                const nba = getNextAction(lead);
                return (
                  <tr
                    key={lead.id}
                    className={`border-b border-border last:border-0 ${
                      isMine ? "bg-primary/[0.06] dark:bg-primary/10" : ""
                    }`}
                  >
                    <td className="px-2 py-2 align-top">
                      <div className="flex flex-col gap-1">
                        {lead.convertedAt && (
                          <span className="inline-block w-fit rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                            Convertido
                          </span>
                        )}
                        {lead.convertedAt && lead.convertedToRef && (
                          <a
                            href={whatsappAppUrl(`/admin/tenants/${lead.convertedToRef}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block w-fit rounded border border-primary/30 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:underline"
                          >
                            Tenant piloto
                          </a>
                        )}
                        {urg === "overdue" && (
                          <span className="inline-block w-fit rounded bg-destructive/15 px-1.5 py-0.5 text-xs font-medium text-destructive">
                            Atrasado
                          </span>
                        )}
                        {urg === "due_today" && (
                          <span className="inline-block w-fit rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                            Hoje
                          </span>
                        )}
                        {urg === "upcoming" && (
                          <span className="inline-block w-fit rounded bg-muted-foreground/40/10 px-1.5 py-0.5 text-xs df-text-secondary">
                            Agendado
                          </span>
                        )}
                        {staleP.kind !== "ok" && (
                          <span
                            className={
                              staleP.kind === "nunca"
                                ? "inline-block w-fit max-w-full rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                : staleP.kind === "sem_resposta"
                                  ? "inline-block w-fit max-w-full rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:text-amber-200"
                                  : staleP.kind === "esfriando"
                                    ? "inline-block w-fit max-w-full rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-medium text-orange-900 dark:text-orange-200"
                                    : "inline-block w-fit max-w-full rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium text-destructive"
                            }
                          >
                            {staleP.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 font-mono text-xs sm:text-sm align-top">{lead.phone}</td>
                    <td className="px-2 py-2 align-top">{lead.name ?? "—"}</td>
                    <td className="px-2 py-2 align-top">{lead.company ?? "—"}</td>
                    <td className="px-2 py-2 align-top min-w-[7.5rem] text-xs">
                      {isMine && (
                        <span className="mb-0.5 inline-block rounded bg-primary/15 px-1 py-0.5 text-[9px] font-medium text-primary">
                          Você
                        </span>
                      )}
                      <p className="text-foreground" title={lead.assignedOperator?.email ?? ""}>
                        {lead.assignedOperator?.name?.trim() ||
                          (lead.assignedOperatorId ? "—" : "Não atribuído")}
                      </p>
                      <select
                        className="mt-1 w-full min-w-0 max-w-[11rem] rounded border border-input bg-background py-0.5 pl-1 text-[10px] sm:text-xs"
                        value={lead.assignedOperatorId ?? lead.assignedOperator?.id ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          void patchLead(lead.id, { assignedOperatorId: v ? v : null });
                        }}
                        aria-label="Reatribuir lead"
                        disabled={operators.length === 0}
                      >
                        <option value="">Não atribuído</option>
                        {operators.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name?.trim() || o.email}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <select
                        value={originDrafts[lead.id] ?? lead.origin ?? ""}
                        onChange={(e) =>
                          setOriginDrafts((d) => ({ ...d, [lead.id]: e.target.value }))
                        }
                        className="w-full min-w-[80px] max-w-[9.5rem] rounded border border-input bg-background px-1 py-0.5 text-[10px] sm:text-xs"
                        aria-label="Origem do lead"
                      >
                        <option value="">—</option>
                        {OUTBOUND_LEAD_ORIGINS.map((o) => (
                          <option key={o} value={o}>
                            {OUTBOUND_LEAD_ORIGIN_LABELS[o]}
                          </option>
                        ))}
                        {lead.origin && !isCanonicalLeadOrigin(lead.origin) ? (
                          <option value={lead.origin}>
                            Legado: {lead.origin}
                          </option>
                        ) : null}
                      </select>
                      <Button variant="secondary"
                        type="button"
                        className="mt-0.5 block text-[10px] font-medium text-primary hover:underline"
                        onClick={() =>
                          void patchLead(lead.id, {
                            origin: (originDrafts[lead.id] ?? lead.origin)?.trim() || null,
                          })
                        }
                      >
                        Salvar
                      </Button>
                    </td>
                    <td className="px-2 py-2 align-top text-xs">
                      {lead.conversationRef ? (
                        <span className="mb-1 inline-block w-fit rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          Conversa vinculada
                        </span>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">Sem conversa</p>
                      )}
                      <label className="mt-1 block text-[10px] text-muted-foreground">ID da conversa</label>
                      <input
                        value={conversationDrafts[lead.id] ?? ""}
                        onChange={(e) =>
                          setConversationDrafts((d) => ({ ...d, [lead.id]: e.target.value }))
                        }
                        className="mt-0.5 w-full min-w-[100px] max-w-[130px] rounded border border-input bg-background px-1.5 py-0.5 font-mono text-[10px]"
                        placeholder="cole o ID"
                        aria-label="ID da conversa"
                      />
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        <Button variant="secondary"
                          type="button"
                          className="text-[10px] font-medium text-primary hover:underline"
                          onClick={() =>
                            void patchLead(lead.id, {
                              conversationRef: conversationDrafts[lead.id]?.trim() || null,
                            })
                          }
                        >
                          Vincular conversa
                        </Button>
                        {lead.conversationRef ? (
                          <a
                            href={conversationChatUrl(lead.conversationRef)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-medium text-primary hover:underline"
                          >
                            Abrir conversa
                          </a>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <select
                        value={lead.status}
                        onChange={(e) => void patchLead(lead.id, { status: e.target.value })}
                        className="max-w-[8.5rem] rounded-md border border-input bg-background px-1.5 py-1 text-xs sm:text-sm"
                        disabled={!!lead.convertedAt}
                      >
                        {STATUS_OPTIONS.includes(lead.status as (typeof STATUS_OPTIONS)[number]) ? null : (
                          <option value={lead.status}>{lead.status}</option>
                        )}
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={`px-2 py-2 align-top text-xs pl-2 ${nbaPriorityBorder(nba.priority)}`}>
                      <p
                        className={
                          nba.priority === "high"
                            ? "font-medium text-destructive"
                            : nba.priority === "medium"
                              ? "font-medium text-orange-600"
                              : "text-foreground"
                        }
                      >
                        {nba.label}
                      </p>
                      {nba.type !== "none" ? (
                        <Button variant="secondary"
                          type="button"
                          onClick={() => runNba(lead)}
                          className="mt-1 text-[10px] font-medium text-primary hover:underline"
                        >
                          {nba.type === "close" ? "Ir p/ conversão" : "Executar"}
                        </Button>
                      ) : (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">—</p>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground align-top whitespace-nowrap">
                      {formatDt(lead.lastContactAt)}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        type="datetime-local"
                        defaultValue={toDatetimeLocalValue(lead.nextFollowUpAt)}
                        key={`${lead.id}-${lead.nextFollowUpAt ?? "e"}`}
                        onBlur={(e) => {
                          const v = e.target.value;
                          void patchLead(lead.id, {
                            nextFollowUpAt: v ? new Date(v).toISOString() : null,
                          });
                        }}
                        className="w-full min-w-[140px] rounded border border-input bg-background px-1.5 py-0.5 text-xs"
                      />
                      <div className="mt-0.5 flex flex-wrap gap-0.5">
                        <Button variant="secondary"
                          type="button"
                          className="rounded border border-border px-1 text-[9px] hover:bg-muted"
                          onClick={() => void setFollowupDays(lead.id, 1)}
                        >
                          +1d
                        </Button>
                        <Button variant="secondary"
                          type="button"
                          className="rounded border border-border px-1 text-[9px] hover:bg-muted"
                          onClick={() => void setFollowupDays(lead.id, 3)}
                        >
                          +3d
                        </Button>
                        <Button variant="secondary"
                          type="button"
                          className="rounded border border-border px-1 text-[9px] hover:bg-muted"
                          onClick={() => void setFollowupDays(lead.id, 7)}
                        >
                          +7d
                        </Button>
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <textarea
                        value={noteDrafts[lead.id] ?? ""}
                        onChange={(e) =>
                          setNoteDrafts((d) => ({
                            ...d,
                            [lead.id]: e.target.value,
                          }))
                        }
                        rows={2}
                        className="w-full min-w-[120px] rounded-md border border-input bg-background px-2 py-1 text-xs"
                      />
                      <Button variant="secondary"
                        type="button"
                        className="mt-1 text-xs font-medium text-primary hover:underline"
                        onClick={() => void patchLead(lead.id, { notes: noteDrafts[lead.id] ?? "" })}
                      >
                        Salvar
                      </Button>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="flex max-w-[200px] flex-col gap-1">
                        {QUICK_ACTIONS.map((qa) => (
                          <Button variant="disabled"
                            key={qa.status}
                            type="button"
                            disabled={!!lead.convertedAt}
                            onClick={() => void patchLead(lead.id, { status: qa.status })}
                            className="rounded border border-border bg-background px-2 py-0.5 text-left text-[10px] font-medium hover:bg-muted disabled:opacity-50"
                          >
                            {qa.label}
                          </Button>
                        ))}
                        <div className="mt-0.5 flex flex-col gap-0.5 border-t border-border pt-0.5">
                          <a
                            href={hrefPrimeiro}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-medium text-primary hover:underline"
                          >
                            Primeiro contato
                          </a>
                          <a
                            href={hrefFu}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-medium text-primary hover:underline"
                          >
                            Follow-up
                          </a>
                          <a
                            href={hrefDemo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-medium text-primary hover:underline"
                          >
                            Enviar demo
                          </a>
                        </div>
                        {!lead.convertedAt && (
                          <Button variant="disabled"
                            id={`lead-convert-${lead.id}`}
                            type="button"
                            className={`mt-0.5 rounded border border-primary/40 bg-primary/5 px-2 py-0.5 text-left text-[10px] font-medium text-primary hover:bg-primary/10 disabled:opacity-50 ${
                              highlightConvertLeadId === lead.id
                                ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                : ""
                            }`}
                            disabled={converting === lead.id}
                            onClick={() => openConvertModal(lead)}
                          >
                            {converting === lead.id ? "…" : "Converter em piloto WhatsApp"}
                          </Button>
                        )}
                        <a
                          href={waMeUrl(lead.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex w-fit items-center rounded-md border border-input bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                        >
                          WhatsApp vazio
                        </a>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground align-top whitespace-nowrap">
                      {new Date(lead.updatedAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {convertModalLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-pilot-convert-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 id="lead-pilot-convert-title" className="text-lg font-bold text-foreground">
              Associar lead ao tenant piloto
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Lead:{" "}
              <span className="font-medium text-foreground">
                {convertModalLead.name ?? convertModalLead.company ?? convertModalLead.phone}
              </span>
              . Esta ação marca o lead como convertido e regista o tenant na WhatsApp Platform. Não cria tenant
              automaticamente.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Tenant existente
                <select
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={selectedPilotTenantId}
                  onChange={(e) => {
                    setSelectedPilotTenantId(e.target.value);
                    if (e.target.value) setManualPilotTenantId("");
                  }}
                  disabled={pilotTenantsLoading}
                >
                  <option value="">Selecione um tenant…</option>
                  {pilotTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {(t.name ?? "Sem nome") + ` (${t.gtmLifecycle}) — ${t.id}`}
                    </option>
                  ))}
                </select>
              </label>

              {pilotTenantsWarning && (
                <p className="text-xs text-amber-700 dark:text-amber-300">{pilotTenantsWarning}</p>
              )}

              <label className="block text-sm font-medium text-foreground">
                Ou tenant ID manual
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
                  placeholder="cuid do tenant"
                  value={manualPilotTenantId}
                  onChange={(e) => {
                    setManualPilotTenantId(e.target.value);
                    if (e.target.value.trim()) setSelectedPilotTenantId("");
                  }}
                />
              </label>

              <label className="block text-sm font-medium text-foreground">
                Responsável interno (opcional)
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Nome do responsável DevFlow"
                  value={pilotInternalOwner}
                  onChange={(e) => setPilotInternalOwner(e.target.value)}
                />
              </label>

              <label className="flex items-start gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={pilotConfirmChecked}
                  onChange={(e) => setPilotConfirmChecked(e.target.checked)}
                />
                <span>
                  Confirmo associar este lead ao tenant piloto selecionado. O lead permanece no CRM com trilha em{" "}
                  <code className="text-xs">notes</code> e <code className="text-xs">convertedToRef</code>.
                </span>
              </label>

              <p className="text-xs text-muted-foreground">
                Criar tenant ou provisionar canal:{" "}
                <a
                  href={whatsappAppUrl("/admin/tenants")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Admin tenants
                </a>
                {" · "}
                <a
                  href={whatsappAppUrl("/admin/whatsapp")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Provisionamento WhatsApp
                </a>
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="disabled" className="rounded-lg border border-border px-4 py-2 text-sm" onClick={closeConvertModal}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                disabled={converting === convertModalLead.id}
                onClick={() => void submitPilotConversion()}
              >
                {converting === convertModalLead.id ? "Convertendo…" : "Confirmar conversão"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
