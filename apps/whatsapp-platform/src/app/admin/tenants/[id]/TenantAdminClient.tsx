"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getImplantationCommissionBlockState } from "@/modules/affiliates/commissionUiState";

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
    amber: "bg-amber-100 text-amber-950 ring-1 ring-amber-200/80",
    emerald: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80",
    slate: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80",
    violet: "bg-violet-100 text-violet-900 ring-1 ring-violet-200/80",
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
    return <p className="text-sm text-slate-500">A carregar…</p>;
  }
  if (!panel) {
    return <p className="text-sm text-red-600">{error ?? "Tenant não encontrado."}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link href="/admin/tenants" className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline">
          ← Tenants
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{panel.tenant.name ?? "Tenant"}</h1>
        <p className="font-mono text-xs text-slate-400">{panel.tenant.id}</p>
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
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Afiliado</h2>
        {panel.affiliate ? (
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            <p>
              <span className="text-slate-500">Indicado por:</span>{" "}
              <span className="font-medium text-slate-900">{panel.affiliate.name}</span>
            </p>
            {panel.affiliate.email ? <p>E-mail: {panel.affiliate.email}</p> : null}
            {panel.affiliate.phone ? <p>Telefone: {panel.affiliate.phone}</p> : null}
            <p>Taxa acordada: {formatPct(panel.affiliate.commissionRate)}</p>
            <p className="flex flex-wrap items-center gap-2 text-slate-600">
              <span>Origem da atribuição:</span>
              <span className="font-medium text-slate-900">
                {affiliateSourceLabel(panel.tenant.affiliateSource, true)}
              </span>
              {panel.tenant.affiliateSource === "ref" ? <StateBadge tone="emerald">Ref</StateBadge> : null}
              {panel.tenant.affiliateSource === "manual" ? <StateBadge tone="amber">Manual</StateBadge> : null}
            </p>
            <Link href="/admin/affiliates" className="inline-block pt-2 text-sm font-medium text-blue-700 underline-offset-4 hover:underline">
              Abrir afiliados
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Sem afiliado vinculado.</p>
        )}

        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Correção manual</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="block min-w-[200px] flex-1 text-xs text-slate-600">
              Afiliado
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
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
            <button
              type="button"
              disabled={linkBusy || !selectedAffiliateId}
              onClick={() => void linkAffiliate()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Vincular afiliado
            </button>
            <button
              type="button"
              disabled={linkBusy || !panel.tenant.affiliateId}
              onClick={() => void removeAffiliate()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
            >
              Remover afiliado
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Comissão de implantação</h2>
        {commissionBlock ? (
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            {commissionBlock.kind === "pendente" ? (
              <div className="space-y-2">
                <StateBadge tone="amber">Comissão gerada</StateBadge>
                <p className="text-sm font-medium text-slate-900">Estado: pendente de pagamento</p>
                <p className="text-lg font-semibold tabular-nums text-slate-950">{formatBrl(commissionBlock.amount)}</p>
                {panel.commission ? (
                  <p className="text-xs text-slate-500">
                    Registada em {new Date(panel.commission.createdAt).toLocaleString("pt-BR")}
                  </p>
                ) : null}
              </div>
            ) : commissionBlock.kind === "pago" ? (
              <div className="space-y-2">
                <StateBadge tone="emerald">Comissão paga</StateBadge>
                <p className="text-sm font-medium text-slate-900">Liquidada</p>
                <p className="text-lg font-semibold tabular-nums text-emerald-900">{formatBrl(commissionBlock.amount)}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <StateBadge tone="slate">Sem comissão gerada</StateBadge>
                <p className="text-sm text-slate-700">
                  <span className="font-medium text-slate-900">Motivo:</span> {commissionBlock.reasonLabel}
                </p>
              </div>
            )}
          </div>
        ) : null}

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Valor comercial</h3>
        <dl className="mt-2 space-y-2 text-sm">
          <div>
            <dt className="text-slate-500">Valor de implantação</dt>
            <dd className="font-medium text-slate-900">
              {panel.tenant.implantationPriceBrl != null && panel.tenant.implantationPriceBrl > 0
                ? formatBrl(panel.tenant.implantationPriceBrl)
                : "Valor de implantação não definido"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Comissão prevista (regra actual)</dt>
            <dd className="font-medium text-slate-900">
              {panel.expectedCommissionBrl != null ? formatBrl(panel.expectedCommissionBrl) : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-xs font-medium text-slate-500">Definir / corrigir valor (BRL)</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <input
              type="text"
              inputMode="decimal"
              className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={implantInput}
              onChange={(e) => setImplantInput(e.target.value)}
              placeholder="ex: 12000"
              disabled={implantBusy}
            />
            <button
              type="button"
              disabled={implantBusy}
              onClick={() => void saveImplantation()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Guardar valor
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Ciclo GTM: {panel.tenant.gtmLifecycle}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Últimos eventos</h2>
        <p className="mt-1 text-xs text-slate-500">Histórico mínimo de afiliado e comissão (sem abrir logs técnicos).</p>
        {panel.auditTail.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Sem eventos registados para este tenant.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {panel.auditTail.map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                <p className="text-slate-800">
                  <span className="text-xs text-slate-500">
                    {new Date(a.createdAt).toLocaleString("pt-BR")}
                  </span>
                  <span className="ml-2 font-medium">{formatAuditActionPt(a.action)}</span>
                </p>
                {a.metadata != null ? (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[11px] text-slate-500">Metadados técnicos</summary>
                    <pre className="mt-1 max-h-28 overflow-auto text-[11px] text-slate-600">
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
