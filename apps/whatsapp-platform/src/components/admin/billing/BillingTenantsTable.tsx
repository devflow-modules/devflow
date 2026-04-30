"use client";

import { useState } from "react";
import type { BillingTenantRow } from "@/modules/billing/admin/billingDashboardTypes";

function formatBRL(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function formatUsage(used: number, limit: number | null): string {
  if (limit == null) return used.toLocaleString("pt-BR");
  return `${used.toLocaleString("pt-BR")} / ${limit.toLocaleString("pt-BR")}`;
}

type SortKey = keyof BillingTenantRow;

type SortHeaderProps = {
  label: string;
  keyName: SortKey;
  localSort: { by: SortKey; order: "asc" | "desc" };
  sortable: boolean;
  onHeaderClick: (key: SortKey) => void;
};

function SortHeader({
  label,
  keyName,
  localSort,
  sortable,
  onHeaderClick,
}: SortHeaderProps) {
  return (
    <th
      className={
        sortable
          ? "text-left p-3 font-medium cursor-pointer hover:bg-muted/50"
          : "text-left p-3 font-medium"
      }
      onClick={() => sortable && onHeaderClick(keyName)}
    >
      {label}
      {localSort.by === keyName && (
        <span className="ml-1">{localSort.order === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );
}

type Props = {
  tenants: BillingTenantRow[];
  onSort?: (sortBy: SortKey, order: "asc" | "desc") => void;
  sortBy?: SortKey;
  sortOrder?: "asc" | "desc";
};

export function BillingTenantsTable({
  tenants,
  onSort,
  sortBy = "updatedAt",
  sortOrder = "desc",
}: Props) {
  const [localSort, setLocalSort] = useState<{ by: SortKey; order: "asc" | "desc" }>({
    by: sortBy,
    order: sortOrder,
  });

  const handleSort = (key: SortKey) => {
    const order =
      localSort.by === key && localSort.order === "desc" ? "asc" : "desc";
    setLocalSort({ by: key, order });
    onSort?.(key, order);
  };

  const sortable = Boolean(onSort);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left p-3 font-medium">Tenant</th>
            <SortHeader
              label="Plano"
              keyName="plan"
              localSort={localSort}
              sortable={sortable}
              onHeaderClick={handleSort}
            />
            <SortHeader
              label="Status"
              keyName="subscriptionStatus"
              localSort={localSort}
              sortable={sortable}
              onHeaderClick={handleSort}
            />
            <SortHeader
              label="Msgs / limite"
              keyName="messagesUsed"
              localSort={localSort}
              sortable={sortable}
              onHeaderClick={handleSort}
            />
            <SortHeader
              label="IA / limite"
              keyName="aiUsed"
              localSort={localSort}
              sortable={sortable}
              onHeaderClick={handleSort}
            />
            <th className="text-right p-3 font-medium">Overage</th>
            <SortHeader
              label="Última fatura"
              keyName="lastInvoiceAmount"
              localSort={localSort}
              sortable={sortable}
              onHeaderClick={handleSort}
            />
            <th className="text-left p-3 font-medium">Status fatura</th>
            <SortHeader
              label="Atualizado"
              keyName="updatedAt"
              localSort={localSort}
              sortable={sortable}
              onHeaderClick={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {tenants.map((row) => (
            <tr
              key={row.tenantId}
              className="border-b border-border/50 hover:bg-muted/30"
            >
              <td className="p-3">
                {row.tenantName || row.tenantId.slice(0, 12)}
              </td>
              <td className="p-3">{row.plan}</td>
              <td className="p-3">
                <span
                  className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                    row.subscriptionStatus === "active"
                      ? "df-badge-success !normal-case"
                      : row.subscriptionStatus === "past_due"
                        ? "df-badge-warning !normal-case"
                        : row.subscriptionStatus === "canceled"
                          ? "bg-muted df-text-secondary"
                          : "bg-muted df-text-secondary"
                  }`}
                >
                  {row.subscriptionStatus}
                </span>
              </td>
              <td className="p-3 text-right tabular-nums">
                {formatUsage(row.messagesUsed, row.messagesLimit)}
              </td>
              <td className="p-3 text-right tabular-nums">
                {formatUsage(row.aiUsed, row.aiLimit)}
              </td>
              <td className="p-3 text-right tabular-nums">
                {row.overageMessages > 0 || row.overageAi > 0
                  ? `Msg: ${row.overageMessages} | IA: ${row.overageAi}`
                  : "—"}
              </td>
              <td className="p-3 text-right tabular-nums">
                {row.lastInvoiceAmount != null
                  ? formatBRL(row.lastInvoiceAmount)
                  : "—"}
              </td>
              <td className="p-3">{row.lastInvoiceStatus ?? "—"}</td>
              <td className="p-3 text-muted-foreground">
                {new Date(row.updatedAt).toLocaleDateString("pt-BR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tenants.length === 0 && (
        <p className="p-6 text-center text-muted-foreground">
          Nenhum tenant encontrado.
        </p>
      )}
    </div>
  );
}
