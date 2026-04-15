/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TenantsAdminListClient } from "../TenantsAdminListClient";
import type { TenantListRow } from "@/modules/affiliates/tenantAdminListFilters";

const rows: TenantListRow[] = [
  {
    id: "t1",
    name: "Com ref",
    plan: "free",
    affiliateId: "a1",
    affiliateSource: "ref",
    gtmLifecycle: "IMPLANTADO",
  },
  {
    id: "t2",
    name: "Sem afiliado",
    plan: "free",
    affiliateId: null,
    affiliateSource: null,
    gtmLifecycle: "AVALIACAO",
  },
];

describe("TenantsAdminListClient", () => {
  it("mostra contagem e filtra por afiliado", async () => {
    const user = userEvent.setup();
    render(<TenantsAdminListClient initialRows={rows} />);
    expect(screen.getByTestId("tenant-filter-count")).toHaveTextContent("2 de 2");

    await user.selectOptions(screen.getByTestId("filter-affiliate"), "with");
    expect(screen.getByTestId("tenant-filter-count")).toHaveTextContent("1 de 2");
    expect(screen.getByTestId("tenant-row-t1")).toBeInTheDocument();
    expect(screen.queryByTestId("tenant-row-t2")).not.toBeInTheDocument();
  });
});
