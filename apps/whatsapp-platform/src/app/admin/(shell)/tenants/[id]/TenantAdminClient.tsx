"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getImplantationCommissionBlockState } from "@/modules/affiliates/commissionUiState";
import { Button } from "@/components/ui/button";

type Panel = {
  tenant: {
    id: string;
    name: string | null;
    affiliateId: string | null;
    affiliateSource: string | null;
    implantationPriceBrl: number | null;
    gtmLifecycle: string;
  };
  affiliate: null | {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    commissionRate: number;
  };
  commission: null | {
    id: string;
    amount: number;
    status: string;
    type: string;
    createdAt: string;
  };
  expectedCommissionBrl: number | null;
  auditTail: { id: string; action: string; createdAt: string; metadata: unknown }[];
};

type AffiliateOption = { id: string; name: string };

type ApiOk<T> = { success: true; data: T; error: null; trace_id: string };
type ApiErr = { success: false; data: null; error: { code: string; message: string }; trace_id: string };

function formatBrl(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function formatPct(rate: number) {
  return `${Math.round(rate * 1000) / 10}%`;
}

function affiliateSourceLabel(source: string | null, hasAffiliate: boolean): string {
  if (!hasAffiliate) return "—";
  if (source === "ref") return "Link de indicação";
  if (source === "manual") return "Manual (admin)";
  return "Atribuição anterior (sem registo detalhado)";
}

function formatAuditActionPt(action: string): string {
  switch (action) {
    case "affiliate.assigned":
      return "Afiliado atribuído (cadastro / indicação)";
    case "affiliate.linked_manual":
      return "Afiliado vinculado ou removido pela equipa";
    case "affiliate.commission.created":
      return "Comissão de implantação criada";
    case "affiliate.commission.paid":
      return "Comissão marcada como paga";
    default:
      return action;
  }
}

function StateBadge({ children, tone }: { children: ReactNode; tone: "amber" | "emerald" | "slate" | "violet" }) {
  const map = {
    amber: "df-badge-warning",
    emerald: "df-badge-success",
    slate: "bg-muted df-text-secondary ring-1 ring-[color:var(--df-ring-soft)]",
    violet: "df-badge-info",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function TenantAdminClient({ tenantId }: { tenantId: string }) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [affiliates, setAffiliates] = useState<AffiliateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [implantInput, setImplantInput] = useState("");
  const [implantBusy, setImplantBusy] = useState(false);

  const loadPanel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, { credentials: "include" });
      const body = (await res.json()) as ApiOk<{ panel: Panel }> | ApiErr;
      if (!res.ok || !body.success) {
        setError(!body.success ? body.error.message : "Erro ao carregar");
        setPanel(null);
        return;
      }
      const p = body.data.panel;
      setPanel({
        ...p,
        commission: p.commission
          ? {
              ...p.commission,
              createdAt:
                typeof p.commission.createdAt === "string"
                  ? p.commission.createdAt
                  : new Date(p.commission.createdAt as unknown as Date).toISOString(),
            }
          : null,
        auditTail: p.auditTail.map((a) => ({
          ...a,
          createdAt:
            typeof a.createdAt === "string" ? a.createdAt : new Date(a.createdAt as unknown as Date).toISOString(),
        })),
      });
      setImplantInput(
        p.tenant.implantationPriceBrl != null && p.tenant.implantationPriceBrl > 0
          ? String(p.tenant.implantationPriceBrl)
          : ""
      );
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const loadAffiliates = useCallback(async () => {
    const res = await fetch("/api/admin/affiliates", { credentials: "include" });
    const body = (await res.json()) as ApiOk<{ affiliates: AffiliateOption[] }> | ApiErr;
    if (res.ok && body.success) {
      setAffiliates(body.data.affiliates.map((a) => ({ id: a.id, name: a.name })));
    }
  }, []);

  useEffect(() => {
    void loadPanel();
    void loadAffiliates();
  }, [loadPanel, loadAffiliates]);

  const commissionBlock = useMemo(() => {
    if (!panel) return null;
    return getImplantationCommissionBlockState(panel.tenant, panel.affiliate, panel.commission);
  }, [panel]);

  const linkAffiliate = async () => {
    if (!selectedAffiliateId) return;
    setLinkBusy(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/affiliate`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateId: selectedAffiliateId }),
      });
      if (res.ok) {
        setSelectedAffiliateId("");
        await loadPanel();
      }
    } finally {
      setLinkBusy(false);
    }
  };

  const removeAffiliate = async () => {
    setLinkBusy(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/affiliate`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateId: null }),
      });
      if (res.ok) {
        await loadPanel();
      }
    } finally {
      setLinkBusy(false);
    }
  };

  const saveImplantation = async () => {
    const n = Number.parseFloat(implantInput.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      setError("Indique um valor de implantação positivo (BRL).");
      return;
    }
    setImplantBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ implantationPriceBrl: n }),
      });
      if (res.ok) {
        await loadPanel();
      } else {
        const body = (await res.json()) as ApiErr;
        setError(body.success === false ? body.error.message : "Erro ao guardar");
      }
    } finally {
      setImplantBusy(false);
    }
  };

  if (loading && !panel) {
    return <p className="text-sm df-text-muted">A carregar…</p>;
  }
  if (!panel) {
    return <p className="df-text-error text-sm">{error ?? "Tenant não encontrado."}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link href="/admin/tenants" className="text-sm font-medium df-text-secondary underline-offset-4 hover:underline">
          ← Tenants
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight df-text-primary">{panel.tenant.name ?? "Tenant"}</h1>
        <p className="font-mono text-xs df-text-muted">{panel.tenant.id}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {panel.tenant.gtmLifecycle === "IMPLANTADO" ? (
            <StateBadge tone="emerald">Implantado</StateBadge>
          ) : (
            <StateBadge tone="slate">Em avaliação</StateBadge>
          )}
          {panel.tenant.affiliateId ? <StateBadge tone="violet">Afiliado</StateBadge> : (
            <StateBadge tone="slate">Sem afiliado</StateBadge>
          )}
          {panel.tenant.affiliateSource === "ref" ? <StateBadge tone="emerald">Origem: ref</StateBadge> : null}
          {panel.tenant.affiliateSource === "manual" ? <StateBadge tone="amber">Origem: manual</StateBadge> : null}
          {panel.tenant.implantationPriceBrl != null && panel.tenant.implantationPriceBrl > 0 ? (
            <StateBadge tone="emerald">Implantação definida</StateBadge>
          ) : (
            <StateBadge tone="slate">Implantação por definir</StateBadge>
          )}
        </div>
      </div>

      {error ? (
        <div className="df-feedback-error !rounded-md" role="alert">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold df-text-primary">Afiliado</h2>
        {panel.affiliate ? (
          <div className="mt-3 space-y-1 text-sm df-text-secondary">
            <p>
              <span className="df-text-muted">Indicado por:</span>{" "}
              <span className="font-medium df-text-primary">{panel.affiliate.name}</span>
            </p>
            {panel.affiliate.email ? <p>E-mail: {panel.affiliate.email}</p> : null}
            {panel.affiliate.phone ? <p>Telefone: {panel.affiliate.phone}</p> : null}
            <p>Taxa acordada: {formatPct(panel.affiliate.commissionRate)}</p>
            <p className="flex flex-wrap items-center gap-2 df-text-secondary">
              <span>Origem da atribuição:</span>
              <span className="font-medium df-text-primary">
                {affiliateSourceLabel(panel.tenant.affiliateSource, true)}
              </span>
              {panel.tenant.affiliateSource === "ref" ? <StateBadge tone="emerald">Ref</StateBadge> : null}
              {panel.tenant.affiliateSource === "manual" ? <StateBadge tone="amber">Manual</StateBadge> : null}
            </p>
            <Link href="/admin/affiliates" className="df-text-info inline-block pt-2 text-sm font-medium underline-offset-4 hover:underline">
              Abrir afiliados
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm df-text-secondary">Sem afiliado vinculado.</p>
        )}

        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide df-text-muted">Correção manual</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="block min-w-[200px] flex-1 text-xs df-text-secondary">
              Afiliado
              <select
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm df-text-primary"
                value={selectedAffiliateId}
                onChange={(e) => setSelectedAffiliateId(e.target.value)}
                disabled={linkBusy}
              >
                <option value="">— escolher —</option>
                {affiliates.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="disabled"
              type="button"
              disabled={linkBusy || !selectedAffiliateId}
              onClick={() => void linkAffiliate()}
              className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Vincular afiliado
            </Button>
            <Button variant="disabled"
              type="button"
              disabled={linkBusy || !panel.tenant.affiliateId}
              onClick={() => void removeAffiliate()}
              className="rounded-lg border df-border-dark bg-card px-4 py-2 text-sm font-medium df-text-primary disabled:opacity-50"
            >
              Remover afiliado
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold df-text-primary">Comissão de implantação</h2>
        {commissionBlock ? (
          <div className="mt-4 rounded-lg border border-border bg-muted/60/60 p-4">
            {commissionBlock.kind === "pendente" ? (
              <div className="space-y-2">
                <StateBadge tone="amber">Comissão gerada</StateBadge>
                <p className="text-sm font-medium df-text-primary">Estado: pendente de pagamento</p>
                <p className="text-lg font-semibold tabular-nums df-text-primary">{formatBrl(commissionBlock.amount)}</p>
                {panel.commission ? (
                  <p className="text-xs df-text-muted">
                    Registada em {new Date(panel.commission.createdAt).toLocaleString("pt-BR")}
                  </p>
                ) : null}
              </div>
            ) : commissionBlock.kind === "pago" ? (
              <div className="space-y-2">
                <StateBadge tone="emerald">Comissão paga</StateBadge>
                <p className="text-sm font-medium df-text-primary">Liquidada</p>
                <p className="text-lg font-semibold tabular-nums df-text-success">{formatBrl(commissionBlock.amount)}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <StateBadge tone="slate">Sem comissão gerada</StateBadge>
                <p className="text-sm df-text-secondary">
                  <span className="font-medium df-text-primary">Motivo:</span> {commissionBlock.reasonLabel}
                </p>
              </div>
            )}
          </div>
        ) : null}

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide df-text-muted">Valor comercial</h3>
        <dl className="mt-2 space-y-2 text-sm">
          <div>
            <dt className="df-text-muted">Valor de implantação</dt>
            <dd className="font-medium df-text-primary">
              {panel.tenant.implantationPriceBrl != null && panel.tenant.implantationPriceBrl > 0
                ? formatBrl(panel.tenant.implantationPriceBrl)
                : "Valor de implantação não definido"}
            </dd>
          </div>
          <div>
            <dt className="df-text-muted">Comissão prevista (regra actual)</dt>
            <dd className="font-medium df-text-primary">
              {panel.expectedCommissionBrl != null ? formatBrl(panel.expectedCommissionBrl) : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-medium df-text-muted">Definir / corrigir valor (BRL)</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <input
              type="text"
              inputMode="decimal"
              className="w-40 rounded-lg border border-border px-3 py-2 text-sm"
              value={implantInput}
              onChange={(e) => setImplantInput(e.target.value)}
              placeholder="ex: 12000"
              disabled={implantBusy}
            />
            <Button variant="disabled"
              type="button"
              disabled={implantBusy}
              onClick={() => void saveImplantation()}
              className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Guardar valor
            </Button>
          </div>
          <p className="mt-2 text-xs df-text-muted">Ciclo GTM: {panel.tenant.gtmLifecycle}</p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold df-text-primary">Últimos eventos</h2>
        <p className="mt-1 text-xs df-text-muted">Histórico mínimo de afiliado e comissão (sem abrir logs técnicos).</p>
        {panel.auditTail.length === 0 ? (
          <p className="mt-2 text-sm df-text-muted">Sem eventos registados para este tenant.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {panel.auditTail.map((a) => (
              <li key={a.id} className="rounded-lg border border-border bg-muted/60/50 px-3 py-2">
                <p className="df-text-primary">
                  <span className="text-xs df-text-muted">
                    {new Date(a.createdAt).toLocaleString("pt-BR")}
                  </span>
                  <span className="ml-2 font-medium">{formatAuditActionPt(a.action)}</span>
                </p>
                {a.metadata != null ? (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[11px] df-text-muted">Metadados técnicos</summary>
                    <pre className="mt-1 max-h-28 overflow-auto text-[11px] df-text-secondary">
                      {JSON.stringify(a.metadata, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
