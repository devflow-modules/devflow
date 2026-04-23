import { describe, it, expect } from "vitest";
import { filterTenantAdminRows, type TenantListRow } from "../tenantAdminListFilters";

const rows: TenantListRow[] = [
  {
    id: "t1",
    name: "A",
    plan: "free",
    affiliateId: "a1",
    affiliateSource: "ref",
    gtmLifecycle: "IMPLANTADO",
    isInternal: false,
  },
  {
    id: "t2",
    name: "B",
    plan: "free",
    affiliateId: null,
    affiliateSource: null,
    gtmLifecycle: "AVALIACAO",
    isInternal: false,
  },
  {
    id: "t3",
    name: "C",
    plan: "pro",
    affiliateId: "a2",
    affiliateSource: "manual",
    gtmLifecycle: "IMPLANTADO",
    isInternal: false,
  },
];

describe("filterTenantAdminRows", () => {
  it("filtra com afiliado", () => {
    const out = filterTenantAdminRows(rows, { affiliate: "with", source: "all", gtm: "all" });
    expect(out.map((r) => r.id)).toEqual(["t1", "t3"]);
  });

  it("filtra origem ref", () => {
    const out = filterTenantAdminRows(rows, { affiliate: "all", source: "ref", gtm: "all" });
    expect(out.map((r) => r.id)).toEqual(["t1"]);
  });

  it("filtra origem manual", () => {
    const out = filterTenantAdminRows(rows, { affiliate: "all", source: "manual", gtm: "all" });
    expect(out.map((r) => r.id)).toEqual(["t3"]);
  });

  it("filtra GTM implantado", () => {
    const out = filterTenantAdminRows(rows, { affiliate: "all", source: "all", gtm: "IMPLANTADO" });
    expect(out.map((r) => r.id)).toEqual(["t1", "t3"]);
  });
});
