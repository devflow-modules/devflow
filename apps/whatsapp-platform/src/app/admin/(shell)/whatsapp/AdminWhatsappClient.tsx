"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ActivationMetricsHeader } from "@/components/admin/whatsapp/ActivationMetricsHeader";
import { ActivationQueueTable } from "@/components/admin/whatsapp/ActivationQueueTable";
import { AdminWhatsappChannelsTable } from "@/components/admin/whatsapp/AdminWhatsappChannelsTable";
import { ActivateChannelModal } from "@/components/admin/whatsapp/ActivateChannelModal";
import { ChannelActivationDrawer } from "@/components/admin/whatsapp/ChannelActivationDrawer";
import { PendingActivationToolbar } from "@/components/admin/whatsapp/PendingActivationToolbar";
import { PendingAlertBanner } from "@/components/admin/whatsapp/PendingAlertBanner";
import { ProvisionChannelForm } from "@/components/admin/whatsapp/ProvisionChannelForm";
import { ChannelLineConfigDrawer } from "@/components/admin/whatsapp/ChannelLineConfigDrawer";
import type { AdminTenantOption, AdminWhatsappChannelRow, WhatsappChannelStatus } from "@/components/admin/whatsapp/types";
import type {
  ActivationMetrics,
  PendingChannelRow,
  PendingQueueFilter,
  SlaBuckets,
} from "@/modules/whatsapp/channelActivationService";
import { Card, CardHeader } from "@/components/ui/card";
import { useSimpleToast } from "@/components/ui/simple-toast";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";

const POLL_MS = 20_000;

function parseChannelsPayload(data: unknown): AdminWhatsappChannelRow[] {
  if (!data || typeof data !== "object") return [];
  const o = data as { channels?: unknown };
  if (!Array.isArray(o.channels)) return [];
  return o.channels.map((c) => {
    const r = c as Record<string, unknown>;
    const status = r.status as WhatsappChannelStatus;
    return {
      id: String(r.id ?? ""),
      tenantId: String(r.tenantId ?? ""),
      tenantName: String(r.tenantName ?? ""),
      phone: String(r.phone ?? "—"),
      wabaId: typeof r.wabaId === "string" ? r.wabaId : null,
      phoneNumberId: String(r.phoneNumberId ?? ""),
      status,
      hasToken: Boolean(r.hasToken),
      readyForOutbound: Boolean(r.readyForOutbound),
      updatedAt: String(r.updatedAt ?? ""),
      label: typeof r.label === "string" || r.label === null ? (r.label as string | null) : null,
      purpose: typeof r.purpose === "string" ? r.purpose : "GENERAL",
      autoReplyEnabled:
        typeof r.autoReplyEnabled === "boolean" || r.autoReplyEnabled === null
          ? (r.autoReplyEnabled as boolean | null)
          : null,
      aiProfileOverride:
        typeof r.aiProfileOverride === "string" || r.aiProfileOverride === null
          ? (r.aiProfileOverride as string | null)
          : null,
    };
  });
}

function parseTenantsPayload(data: unknown): AdminTenantOption[] {
  if (!data || typeof data !== "object") return [];
  const o = data as { tenants?: unknown };
  if (!Array.isArray(o.tenants)) return [];
  return o.tenants.map((t) => {
    const r = t as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      name: typeof r.name === "string" ? r.name : null,
    };
  });
}

function parseSlaBuckets(d: Record<string, unknown>): SlaBuckets {
  const b = d.slaBuckets;
  if (!b || typeof b !== "object") return { ok: 0, delay: 0, critical: 0 };
  const o = b as Record<string, unknown>;
  if (
    typeof o.ok === "number" &&
    typeof o.delay === "number" &&
    typeof o.critical === "number"
  ) {
    return { ok: o.ok, delay: o.delay, critical: o.critical };
  }
  return { ok: 0, delay: 0, critical: 0 };
}

function parseMetricsPayload(data: unknown): ActivationMetrics | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.total !== "number" || typeof d.active !== "number" || typeof d.pending !== "number") {
    return null;
  }
  return {
    total: d.total,
    active: d.active,
    pending: d.pending,
    activationRate: typeof d.activationRate === "number" ? d.activationRate : 0,
    avgActivationTimeMinutes:
      d.avgActivationTimeMinutes === null || typeof d.avgActivationTimeMinutes === "number"
        ? (d.avgActivationTimeMinutes as number | null)
        : null,
    slaBuckets: parseSlaBuckets(d),
  };
}

function parsePendingQueueFilter(param: string | null): PendingQueueFilter {
  if (
    param === "ok" ||
    param === "delay" ||
    param === "critical" ||
    param === "possibly_stuck" ||
    param === "all"
  ) {
    return param;
  }
  return "all";
}

function parsePendingPayload(data: unknown): PendingChannelRow[] {
  if (!data || typeof data !== "object") return [];
  const o = data as { items?: unknown };
  if (!Array.isArray(o.items)) return [];
  return o.items as PendingChannelRow[];
}

function pendingToAdminRow(p: PendingChannelRow): AdminWhatsappChannelRow {
  return {
    id: p.id,
    tenantId: p.tenantId,
    tenantName: p.tenantName,
    phone: p.phoneNumber,
    wabaId: null,
    phoneNumberId: p.phoneNumberId,
    status: "PENDING_ACTIVATION",
    hasToken: false,
    readyForOutbound: false,
    updatedAt: p.updatedAt,
    label: null,
    purpose: "GENERAL",
    autoReplyEnabled: null,
    aiProfileOverride: null,
  };
}

export function AdminWhatsappClient() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "pending" ? "pending" : "all";
  const pendingFilter = parsePendingQueueFilter(searchParams.get("filter"));

  const { showToast, toastAnchor } = useSimpleToast(4500);
  const [channels, setChannels] = useState<AdminWhatsappChannelRow[]>([]);
  const [tenants, setTenants] = useState<AdminTenantOption[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingChannelRow[]>([]);
  const [metrics, setMetrics] = useState<ActivationMetrics | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tenantQuery, setTenantQuery] = useState("");
  const [activateRow, setActivateRow] = useState<AdminWhatsappChannelRow | null>(null);
  const [timelineChannelId, setTimelineChannelId] = useState<string | null>(null);
  const [configRow, setConfigRow] = useState<AdminWhatsappChannelRow | null>(null);

  const loadMetrics = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoadingMetrics(true);
    try {
      const res = await fetchProtected("/api/admin/whatsapp/metrics");
      const json = await res.json().catch(() => ({}));
      if (res.ok && json && typeof json === "object" && (json as { success?: boolean }).success) {
        setMetrics(parseMetricsPayload((json as { data?: unknown }).data));
      } else {
        setMetrics(null);
        if (!res.ok && !opts?.silent) {
          const msg = protectedApiUserMessage(res.status, json as { error?: { message?: string } });
          showToast(msg);
        }
      }
    } finally {
      if (!opts?.silent) setLoadingMetrics(false);
    }
  }, [showToast]);

  const loadChannels = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoadingChannels(true);
    try {
      const chRes = await fetchProtected("/api/admin/whatsapp/channels");
      const chJson = await chRes.json().catch(() => ({}));
      if (chRes.ok && chJson && typeof chJson === "object" && (chJson as { success?: boolean }).success) {
        setChannels(parseChannelsPayload((chJson as { data?: unknown }).data));
      } else {
        if (!opts?.silent) {
          const msg = protectedApiUserMessage(chRes.status, chJson as { error?: { message?: string } });
          showToast(msg);
        }
        setChannels([]);
      }
    } finally {
      if (!opts?.silent) setLoadingChannels(false);
    }
  }, [showToast]);

  const loadTenants = useCallback(async () => {
    const tRes = await fetchProtected("/api/admin/whatsapp/tenants");
    const tJson = await tRes.json().catch(() => ({}));
    if (tRes.ok && tJson && typeof tJson === "object" && (tJson as { success?: boolean }).success) {
      setTenants(parseTenantsPayload((tJson as { data?: unknown }).data));
    } else {
      setTenants([]);
    }
  }, []);

  const loadPending = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoadingPending(true);
      try {
        const q = new URLSearchParams({
          limit: "100",
          page: "1",
          filter: pendingFilter,
        });
        const res = await fetchProtected(`/api/admin/whatsapp/channels/pending?${q.toString()}`);
        const json = await res.json().catch(() => ({}));
        if (res.ok && json && typeof json === "object" && (json as { success?: boolean }).success) {
          setPendingItems(parsePendingPayload((json as { data?: unknown }).data));
        } else {
          setPendingItems([]);
          if (!opts?.silent) {
            const msg = protectedApiUserMessage(res.status, json as { error?: { message?: string } });
            showToast(msg);
          }
        }
      } finally {
        if (!opts?.silent) setLoadingPending(false);
      }
    },
    [showToast, pendingFilter]
  );

  const bootstrap = useCallback(async () => {
    await Promise.all([loadMetrics(), loadTenants()]);
    if (view === "all") {
      await loadChannels();
    }
  }, [loadChannels, loadMetrics, loadTenants, view]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (view !== "pending") return;
    void loadPending();
  }, [view, pendingFilter, loadPending]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadMetrics({ silent: true });
      if (view === "pending") void loadPending({ silent: true });
      else void loadChannels({ silent: true });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [view, loadChannels, loadMetrics, loadPending]);

  const filtered = useMemo(() => {
    const q = tenantQuery.trim().toLowerCase();
    return channels.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.tenantId.toLowerCase().includes(q) ||
        c.tenantName.toLowerCase().includes(q)
      );
    });
  }, [channels, statusFilter, tenantQuery]);

  async function copyLabel(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copiado.`);
    } catch {
      showToast("Não foi possível copiar.");
    }
  }

  const refreshAfterActivate = useCallback(async () => {
    await Promise.all([
      loadMetrics({ silent: true }),
      view === "pending" ? loadPending({ silent: true }) : loadChannels({ silent: true }),
    ]);
  }, [loadChannels, loadMetrics, loadPending, view]);

  async function submitActivate(accessToken: string) {
    if (!activateRow) return;
    const res = await fetchProtected("/api/admin/whatsapp/channel/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: activateRow.id, accessToken }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !(body as { success?: boolean }).success) {
      const msg = protectedApiUserMessage(res.status, body as { error?: { message?: string } });
      showToast(msg);
      return;
    }
    showToast("Canal ativado com sucesso 🚀");
    setActivateRow(null);
    await refreshAfterActivate();
  }

  const tabClass = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-[var(--df-brand-500)] text-[#032316]"
        : "border df-border-brand bg-[var(--df-bg-elevated)] text-[var(--df-text-secondary)] hover:bg-[var(--df-brand-100)]"
    }`;

  return (
    <div className="df-stack-relaxed max-w-6xl">
      {toastAnchor}

      <ActivationMetricsHeader metrics={metrics} loading={loadingMetrics} />
      <PendingAlertBanner pendingCount={metrics?.pending ?? 0} />

      <ProvisionChannelForm
        tenants={tenants}
        onProvisioned={() => {
          void loadMetrics({ silent: true });
          void loadChannels({ silent: true });
          void loadPending({ silent: true });
        }}
        onError={(m) => showToast(m)}
        onSuccess={(m) => showToast(m)}
        fetchProvision={(body) =>
          fetchProtected("/api/admin/whatsapp/channel/manual", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        }
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Vista de canais">
        <Link href="/admin/whatsapp" className={tabClass(view === "all")} role="tab" aria-selected={view === "all"}>
          Todos
        </Link>
        <Link
          href="/admin/whatsapp?view=pending"
          className={tabClass(view === "pending")}
          role="tab"
          aria-selected={view === "pending"}
          data-testid="tab-pending"
        >
          Pendentes
        </Link>
      </div>

      {view === "pending" ? (
        <Card>
          <CardHeader
            title="Fila de ativação"
            description="Prioridade composta (crítico → travado → delay → tempo na fila). Polling silencioso ~20s; filtro preservado na URL."
          />
          <div className="space-y-5 border-t df-border-brand px-6 py-4">
            <PendingActivationToolbar buckets={metrics?.slaBuckets ?? null} activeFilter={pendingFilter} />
            <ActivationQueueTable
              filter={pendingFilter}
              items={pendingItems}
              loading={loadingPending}
              onActivate={(row) => setActivateRow(pendingToAdminRow(row))}
              onRefresh={() => void loadPending({ silent: true })}
              onOpenTimeline={(row) => setTimelineChannelId(row.id)}
            />
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Canais WhatsApp"
            description="Lista de linhas provisionadas e estado de ativação."
          />
          <div className="border-t df-border-brand px-6 py-4">
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="df-label">Filtrar por estado</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1 rounded-lg border df-border-brand bg-[var(--df-bg-elevated)] px-3 py-2 text-sm text-[var(--df-text-primary)]"
                  data-testid="channel-status-filter"
                >
                  <option value="all">Todos</option>
                  <option value="PENDING_ACTIVATION">Pendente</option>
                  <option value="ACTIVE">Ativo</option>
                  <option value="ERROR">Erro</option>
                </select>
              </label>
              <label className="min-w-[12rem] flex-1">
                <span className="df-label">Buscar tenant</span>
                <input
                  value={tenantQuery}
                  onChange={(e) => setTenantQuery(e.target.value)}
                  placeholder="Nome ou ID…"
                  className="mt-1 w-full rounded-lg border df-border-brand bg-[var(--df-bg-elevated)] px-3 py-2 text-sm text-[var(--df-text-primary)]"
                  data-testid="channel-tenant-search"
                />
              </label>
            </div>

            <AdminWhatsappChannelsTable
              rows={filtered}
              loading={loadingChannels}
              onActivate={(row) => setActivateRow(row)}
              onCopy={copyLabel}
              onRefresh={() => void loadChannels()}
              onOpenTimeline={(row) => setTimelineChannelId(row.id)}
              onOpenConfig={(row) => setConfigRow(row)}
            />
          </div>
        </Card>
      )}

      <ActivateChannelModal
        open={activateRow !== null}
        channelLabel={
          activateRow
            ? `${activateRow.tenantName} · ${activateRow.phone} · ${activateRow.phoneNumberId}`
            : ""
        }
        onClose={() => setActivateRow(null)}
        onSubmit={submitActivate}
      />

      <ChannelActivationDrawer
        channelId={timelineChannelId}
        open={timelineChannelId !== null}
        onClose={() => setTimelineChannelId(null)}
        onRetryActivate={(id) => {
          const fromPending = pendingItems.find((p) => p.id === id);
          if (fromPending) {
            setActivateRow(pendingToAdminRow(fromPending));
            return;
          }
          const ch = channels.find((c) => c.id === id);
          if (ch) setActivateRow(ch);
        }}
      />

      <ChannelLineConfigDrawer
        open={configRow !== null}
        row={configRow}
        onClose={() => setConfigRow(null)}
        onSaved={() => void loadChannels({ silent: true })}
      />
    </div>
  );
}
