"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  OUTBOUND_LEAD_STATUS_DISPLAY_ORDER,
  OUTBOUND_LEAD_STATUS_PRIORITY,
} from "@/lib/admin-outbound-leads";

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
  createdAt: string;
  updatedAt: string;
};

type SummaryPayload = {
  byStatus: Record<string, number>;
  total: number;
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

function waMeUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "#";
  return `https://wa.me/${digits}`;
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Atrasado: follow-up antes de hoje 00:00. Hoje: mesmo dia civil (inclui horário futuro hoje). */
function followUpUrgency(iso: string | null | undefined): "overdue" | "today" | null {
  if (!iso) return null;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  const now = new Date();
  const startToday = startOfLocalDay(now);
  if (t < startToday) return "overdue";
  if (t.toDateString() === now.toDateString()) return "today";
  return null;
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

export function AdminLeadsClient() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [originFilter, setOriginFilter] = useState<string>("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", phone: "", origin: "", notes: "", nextFollowUpAt: "" });
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [originDrafts, setOriginDrafts] = useState<Record<string, string>>({});

  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (statusFilter) q.set("status", statusFilter);
    if (originFilter.trim()) q.set("origin", originFilter.trim());
    if (overdueOnly) q.set("overdueFollowUp", "1");
    const s = q.toString();
    return s ? `?${s}` : "";
  }, [statusFilter, originFilter, overdueOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/leads${query}`, { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as {
        leads?: LeadRow[];
        summary?: SummaryPayload;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `Erro ${res.status}`);
        setLeads([]);
        setSummary(null);
        return;
      }
      setLeads(data.leads ?? []);
      setSummary(data.summary ?? null);
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
    } catch {
      setError("Falha ao carregar leads");
      setLeads([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [query]);

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
          origin: form.origin.trim() || null,
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads outbound</h1>
          <p className="mt-1 text-sm text-muted-foreground">Painel diário de prospecção e follow-up.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
            <input
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
              placeholder="filtrar"
              className="w-32 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-muted-foreground">Follow-up atrasado</span>
          </label>
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

      {summary && (
        <section className="mb-8" aria-label="Resumo por status">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Resumo{originFilter || overdueOnly ? " (com filtros de origem / atraso)" : ""} · {summary.total}{" "}
            lead(s)
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {summaryEntries.map((key) => {
              const n = summary.byStatus[key] ?? 0;
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
            <input
              value={form.origin}
              onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2"
              placeholder="ex.: indicação, site, evento"
            />
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
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? "Salvando…" : "Adicionar lead"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-2 py-2 font-medium">Urg.</th>
              <th className="px-2 py-2 font-medium">Telefone</th>
              <th className="px-2 py-2 font-medium">Nome</th>
              <th className="px-2 py-2 font-medium">Empresa</th>
              <th className="px-2 py-2 font-medium w-[100px]">Origem</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Último contato</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Próx. FU</th>
              <th className="px-2 py-2 font-medium min-w-[180px]">Notas</th>
              <th className="px-2 py-2 font-medium">Ações</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Atual.</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                  Nenhum lead encontrado.
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const urg = followUpUrgency(lead.nextFollowUpAt);
                return (
                  <tr key={lead.id} className="border-b border-border last:border-0">
                    <td className="px-2 py-2 align-top">
                      {urg === "overdue" && (
                        <span className="inline-block rounded bg-destructive/15 px-1.5 py-0.5 text-xs font-medium text-destructive">
                          Atrasado
                        </span>
                      )}
                      {urg === "today" && (
                        <span className="inline-block rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                          Hoje
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 font-mono text-xs sm:text-sm align-top">{lead.phone}</td>
                    <td className="px-2 py-2 align-top">{lead.name ?? "—"}</td>
                    <td className="px-2 py-2 align-top">{lead.company ?? "—"}</td>
                    <td className="px-2 py-2 align-top">
                      <input
                        value={originDrafts[lead.id] ?? ""}
                        onChange={(e) =>
                          setOriginDrafts((d) => ({ ...d, [lead.id]: e.target.value }))
                        }
                        className="w-full min-w-[80px] max-w-[120px] rounded border border-input bg-background px-1.5 py-0.5 text-xs"
                        placeholder="—"
                      />
                      <button
                        type="button"
                        className="mt-0.5 block text-[10px] font-medium text-primary hover:underline"
                        onClick={() =>
                          void patchLead(lead.id, { origin: originDrafts[lead.id]?.trim() || null })
                        }
                      >
                        Salvar
                      </button>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <select
                        value={lead.status}
                        onChange={(e) => void patchLead(lead.id, { status: e.target.value })}
                        className="max-w-[9.5rem] rounded-md border border-input bg-background px-1.5 py-1 text-xs sm:text-sm"
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
                    <td className="px-2 py-2 text-xs text-muted-foreground align-top whitespace-nowrap">
                      {formatDt(lead.lastContactAt)}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        type="datetime-local"
                        defaultValue={toDatetimeLocalValue(lead.nextFollowUpAt)}
                        key={lead.nextFollowUpAt ?? "empty"}
                        onBlur={(e) => {
                          const v = e.target.value;
                          void patchLead(lead.id, {
                            nextFollowUpAt: v ? new Date(v).toISOString() : null,
                          });
                        }}
                        className="w-full min-w-[150px] rounded border border-input bg-background px-1.5 py-0.5 text-xs"
                      />
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
                        className="w-full min-w-[160px] rounded-md border border-input bg-background px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        className="mt-1 text-xs font-medium text-primary hover:underline"
                        onClick={() => void patchLead(lead.id, { notes: noteDrafts[lead.id] ?? "" })}
                      >
                        Salvar notas
                      </button>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="flex max-w-[200px] flex-col gap-1">
                        {QUICK_ACTIONS.map((qa) => (
                          <button
                            key={qa.status}
                            type="button"
                            onClick={() => void patchLead(lead.id, { status: qa.status })}
                            className="rounded border border-border bg-background px-2 py-0.5 text-left text-[11px] font-medium hover:bg-muted"
                          >
                            {qa.label}
                          </button>
                        ))}
                        <a
                          href={waMeUrl(lead.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex w-fit items-center rounded-md border border-input bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                        >
                          WhatsApp
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
    </main>
  );
}
