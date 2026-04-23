export type TenantListRow = {
  id: string;
  name: string | null;
  plan: string | null;
  affiliateId: string | null;
  affiliateSource: string | null;
  gtmLifecycle: string;
  isInternal: boolean;
};

export type TenantListFilters = {
  affiliate: "all" | "with" | "without";
  source: "all" | "ref" | "manual";
  gtm: "all" | "IMPLANTADO" | "AVALIACAO";
};

export function filterTenantAdminRows(rows: TenantListRow[], f: TenantListFilters): TenantListRow[] {
  return rows.filter((r) => {
    if (f.affiliate === "with" && !r.affiliateId) return false;
    if (f.affiliate === "without" && r.affiliateId) return false;

    if (f.source === "ref" && r.affiliateSource !== "ref") return false;
    if (f.source === "manual" && r.affiliateSource !== "manual") return false;

    if (f.gtm === "IMPLANTADO" && r.gtmLifecycle !== "IMPLANTADO") return false;
    if (f.gtm === "AVALIACAO" && r.gtmLifecycle !== "AVALIACAO") return false;

    return true;
  });
}
