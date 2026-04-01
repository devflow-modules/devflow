/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardOperationalSection } from "@/modules/financeiro/components/operational/DashboardOperationalSection";

vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

vi.mock("@/modules/financeiro/lib/household/HouseholdProvider", () => ({
  useHousehold: () => ({
    household: { id: "h1", name: "Casa", slug: "casa" },
    households: [{ id: "h1", name: "Casa", slug: "casa" }],
    setHousehold: vi.fn(),
    isLoading: false,
    refetchMe: vi.fn(),
    activeMembershipRole: "OWNER" as const,
  }),
}));

vi.mock("@/modules/financeiro/navigation/operational/lastActionStorage", () => ({
  getFinanceiroLastAction: () => null,
}));

vi.mock("next/link", () => ({
  default ({
    href,
    children,
    ...rest
  }: React.ComponentProps<"a"> & { href: string }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

describe("DashboardOperationalSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renderiza ações rápidas para OWNER", () => {
    render(<DashboardOperationalSection />);
    expect(screen.getByRole("heading", { name: /ações rápidas/i })).toBeTruthy();
    expect(screen.getByText(/nova despesa/i)).toBeTruthy();
    expect(screen.getByText(/regras automáticas/i)).toBeTruthy();
  });
});
