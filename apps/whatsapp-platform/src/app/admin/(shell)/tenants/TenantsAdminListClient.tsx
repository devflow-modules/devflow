"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { filterTenantAdminRows, type TenantListFilters, type TenantListRow } from "@/modules/affiliates/tenantAdminListFilters";

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}

export function TenantsAdminListClient({ initialRows }: { initialRows: TenantListRow[] }) {
  const [filters, setFilters] = useState<TenantListFilters>({
    affiliate: "all",
    source: "all",
    gtm: "all",
  });

  const filtered = useMemo(() => filterTenantAdminRows(initialRows, filters), [initialRows, filters]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <label className="text-xs df-text-secondary">
          Afiliado
          <select
            data-testid="filter-affiliate"
            className="mt-1 block rounded-lg border border-border px-2 py-1.5 text-sm"
            value={filters.affiliate}
            onChange={(e) =>
              setFilters((f) => ({ ...f, affiliate: e.target.value as TenantListFilters["affiliate"] }))
            }
          >
            <option value="all">Todos</option>
            <option value="with">Com afiliado</option>
            <option value="without">Sem afiliado</option>
          </select>
        </label>
        <label className="text-xs df-text-secondary">
          Origem
          <select
            className="mt-1 block rounded-lg border border-border px-2 py-1.5 text-sm"
            value={filters.source}
            onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value as TenantListFilters["source"] }))}
          >
            <option value="all">Todos</option>
            <option value="ref">Ref</option>
            <option value="manual">Manual</option>
          </select>
        </label>
        <label className="text-xs df-text-secondary">
          Ciclo GTM
          <select
            className="mt-1 block rounded-lg border border-border px-2 py-1.5 text-sm"
            value={filters.gtm}
            onChange={(e) => setFilters((f) => ({ ...f, gtm: e.target.value as TenantListFilters["gtm"] }))}
          >
            <option value="all">Todos</option>
            <option value="IMPLANTADO">Implantado</option>
            <option value="AVALIACAO">Em avaliação</option>
          </select>
        </label>
        <p className="self-end text-xs df-text-muted" data-testid="tenant-filter-count">
          {filtered.length} de {initialRows.length}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-xs font-medium uppercase df-text-muted">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-muted/60/80" data-testid={`tenant-row-${t.id}`}>
                <td className="px-4 py-3">
                  <div className="font-medium df-text-primary">{t.name ?? "—"}</div>
                  <div className="font-mono text-[11px] df-text-muted">{t.id}</div>
                </td>
                <td className="px-4 py-3 df-text-secondary">{t.plan ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {t.gtmLifecycle === "IMPLANTADO" ? (
                      <Badge className="bg-emerald-100 text-emerald-900">Implantado</Badge>
                    ) : (
                      <Badge className="bg-muted df-text-primary">Avaliação</Badge>
                    )}
                    {t.isInternal ? (
                      <Badge className="bg-amber-100 text-amber-950">Interno</Badge>
                    ) : null}
                    {t.affiliateId ? (
                      <Badge className="bg-violet-100 text-violet-900">Afiliado</Badge>
                    ) : (
                      <Badge className="bg-muted df-text-secondary">Sem afiliado</Badge>
                    )}
                    {t.affiliateSource === "ref" ? (
                      <Badge className="bg-sky-100 text-sky-900">Ref</Badge>
                    ) : null}
                    {t.affiliateSource === "manual" ? (
                      <Badge className="bg-amber-100 text-amber-950">Manual</Badge>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/tenants/${t.id}`}
                    className="text-sm font-medium text-blue-700 underline-offset-4 hover:underline"
                  >
                    Detalhe
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm df-text-muted">Nenhum tenant com estes filtros.</p>
        ) : null}
      </div>
    </div>
  );
}
