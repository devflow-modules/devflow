/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppSidebar } from "../AppSidebar";
import {
  DF_NAV_SENSITIVE_IDLE,
  DF_NAV_SENSITIVE_SECTION,
  DF_NAV_SENSITIVE_SECTION_TITLE,
} from "../nav-sensitive-classes";

const pathnameMock = vi.hoisted(() => ({ value: "/inbox" }));
const sessionRoleMock = vi.hoisted(() => ({
  role: "operator" as string | null,
  tenantId: "t1",
  loading: false,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock.value,
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

vi.mock("@/components/navigation/SessionRoleContext", () => ({
  useSessionRole: () => sessionRoleMock,
}));

vi.mock("@/components/navigation/useNavPreferences", () => ({
  useNavPreferences: () => ({
    prefs: { collapsedSections: {} },
    setSectionCollapsed: vi.fn(),
  }),
}));

vi.mock("../ShellLayoutContext", () => ({
  useShellLayoutOptional: () => null,
}));

vi.mock("@/lib/useMediaMinWidth", () => ({
  useMediaMinWidth: () => true,
}));

vi.mock("@/components/support/SupportHelpButton", () => ({
  SupportHelpButton: () => <div data-testid="support-help-stub" />,
}));

vi.mock("../SessionRoleModePill", () => ({
  SessionRoleModePill: () => null,
}));

describe("AppSidebar (expandida a11y + home)", () => {
  beforeEach(() => {
    pathnameMock.value = "/inbox";
    sessionRoleMock.role = "operator";
  });

  it("declara aria-label na aside e aria-current no link activo", () => {
    render(<AppSidebar />);
    const aside = screen.getByTestId("app-sidebar");
    expect(aside).toHaveAttribute("aria-label", "Navegação principal");
    expect(aside.tagName).toBe("ASIDE");

    const inbox = screen.getByRole("link", { name: "Inbox" });
    expect(inbox).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Histórico" })).not.toHaveAttribute("aria-current");
  });

  it("SB-7: secções sensíveis e link Plataforma usam --df-admin-* (sem amber)", () => {
    sessionRoleMock.role = "platform_admin";
    render(<AppSidebar />);

    const platformToggle = screen.getByRole("button", { name: /Plataforma/i });
    expect(platformToggle.className).toContain(DF_NAV_SENSITIVE_SECTION_TITLE);
    expect(platformToggle.className).not.toMatch(/\bamber-/);

    for (const id of ["automacao_ia", "conta", "plataforma"] as const) {
      const chrome = screen.getByTestId(`sidebar-sensitive-section-${id}`);
      expect(chrome.className).toContain(DF_NAV_SENSITIVE_SECTION);
      expect(chrome.className).not.toMatch(/\bamber-/);
    }

    const metrics = screen.getByTestId("sidebar-sensitive-link");
    expect(metrics).toHaveAttribute("href", "/admin/metrics");
    expect(metrics.className).toContain(DF_NAV_SENSITIVE_IDLE);
    expect(metrics.className).not.toMatch(/\bamber-/);
    expect(metrics).not.toHaveAttribute("aria-current");
  });

  it("SB-7: link sensível activo mantém tokens de marca (não idle admin)", () => {
    sessionRoleMock.role = "platform_admin";
    pathnameMock.value = "/admin/metrics";
    render(<AppSidebar />);

    const metrics = screen.getByTestId("sidebar-sensitive-link");
    expect(metrics).toHaveAttribute("aria-current", "page");
    expect(metrics.className).toMatch(/--df-brand-/);
    expect(metrics.className).not.toContain(DF_NAV_SENSITIVE_IDLE);
    expect(metrics.className).not.toMatch(/\bamber-/);
  });
});
