/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarRail } from "../SidebarRail";
import {
  navAccountItemsForRole,
  navAutomationItemsForRole,
  navOperationItemsForRole,
  navTeamItemsForRole,
} from "../nav-config";
import type { UserRole } from "@/modules/auth";

const openSupport = vi.fn();

vi.mock("@/components/support/SupportProvider", () => ({
  useSupport: () => ({ openSupport }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

function renderRail(role: UserRole | null, pathname = "/inbox") {
  const onExpand = vi.fn();
  const onNavigate = vi.fn();
  const platformNav =
    role === "platform_admin"
      ? [{ href: "/admin/metrics", label: "Métricas internas" }]
      : [];

  render(
    <SidebarRail
      pathname={pathname}
      sessionRole={role}
      operationNav={navOperationItemsForRole(role)}
      automationNav={navAutomationItemsForRole(role)}
      accountNav={navAccountItemsForRole(role)}
      teamNav={navTeamItemsForRole(role)}
      platformNav={platformNav}
      onExpand={onExpand}
      onNavigate={onNavigate}
    />
  );

  return { onExpand, onNavigate };
}

describe("SidebarRail", () => {
  beforeEach(() => {
    openSupport.mockClear();
  });

  it("monograma DF e chrome dark (tokens df); home manager → /dashboard", () => {
    renderRail("manager");
    const home = screen.getByTestId("sidebar-rail-home");
    expect(home).toHaveTextContent("DF");
    expect(home).toHaveAttribute("href", "/dashboard");
    const rail = screen.getByTestId("sidebar-rail");
    expect(rail.className).toMatch(/df-page/);
    expect(rail.className).toMatch(/df-bg-elevated|--df-bg-elevated/);
  });

  it("operator: mostra Distribuir com href /distribuir e dispara onNavigate", async () => {
    const user = userEvent.setup();
    const { onNavigate } = renderRail("operator");
    const link = screen.getByTestId("sidebar-rail-distribuir");
    expect(link).toHaveAttribute("href", "/distribuir");
    expect(link).toHaveAttribute("aria-label", "Distribuir próxima");
    await user.click(link);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("manager: mostra Distribuir", () => {
    renderRail("manager");
    expect(screen.getByTestId("sidebar-rail-distribuir")).toBeInTheDocument();
  });

  it("platform_admin: não mostra Distribuir", () => {
    renderRail("platform_admin");
    expect(screen.queryByTestId("sidebar-rail-distribuir")).not.toBeInTheDocument();
  });

  it("role null (loading fail-closed): não mostra Distribuir", () => {
    renderRail(null);
    expect(screen.queryByTestId("sidebar-rail-distribuir")).not.toBeInTheDocument();
  });

  it("mantém ajuda, outra conta e logout com aria-label", () => {
    renderRail("operator");
    expect(screen.getByTestId("sidebar-rail-support")).toHaveAttribute(
      "aria-label",
      "Precisa de ajuda?"
    );
    expect(screen.getByTestId("sidebar-rail-login-other")).toHaveAttribute("href", "/login");
    expect(screen.getByTestId("sidebar-rail-login-other")).toHaveAttribute(
      "aria-label",
      "Entrar (outra conta)"
    );
    expect(screen.getByTestId("sidebar-rail-logout")).toHaveAttribute(
      "aria-label",
      "Terminar sessão"
    );
  });

  it("ajuda abre support", async () => {
    const user = userEvent.setup();
    renderRail("manager");
    await user.click(screen.getByTestId("sidebar-rail-support"));
    expect(openSupport).toHaveBeenCalledTimes(1);
  });

  it("marca nav activa com aria-current", () => {
    renderRail("operator", "/inbox");
    const inbox = screen.getByRole("link", { name: "Inbox" });
    expect(inbox).toHaveAttribute("aria-current", "page");
  });
});
