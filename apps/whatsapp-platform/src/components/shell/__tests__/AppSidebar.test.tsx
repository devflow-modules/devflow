/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppSidebar } from "../AppSidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/inbox",
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
  useSessionRole: () => ({ role: "operator", tenantId: "t1", loading: false }),
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
  it("declara aria-label na aside e aria-current no link activo", () => {
    render(<AppSidebar />);
    const aside = screen.getByTestId("app-sidebar");
    expect(aside).toHaveAttribute("aria-label", "Navegação principal");
    expect(aside.tagName).toBe("ASIDE");

    const inbox = screen.getByRole("link", { name: "Inbox" });
    expect(inbox).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Histórico" })).not.toHaveAttribute("aria-current");
  });
});
