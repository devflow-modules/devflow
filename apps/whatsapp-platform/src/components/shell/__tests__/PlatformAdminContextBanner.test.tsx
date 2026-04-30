/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlatformAdminContextBanner } from "../PlatformAdminContextBanner";

vi.mock("@/components/navigation/SessionRoleContext", () => ({
  useSessionRole: vi.fn(),
}));

import { useSessionRole } from "@/components/navigation/SessionRoleContext";

describe("PlatformAdminContextBanner", () => {
  it("mostra banner para platform_admin", () => {
    vi.mocked(useSessionRole).mockReturnValue({
      role: "platform_admin",
      tenantId: "t1",
      loading: false,
    });
    render(<PlatformAdminContextBanner />);
    expect(screen.getByTestId("platform-admin-context-banner")).toHaveTextContent("Modo Plataforma");
    expect(screen.getByText(/Tenant atual: t1/i)).toBeInTheDocument();
  });

  it("não renderiza para manager", () => {
    vi.mocked(useSessionRole).mockReturnValue({
      role: "manager",
      tenantId: "t1",
      loading: false,
    });
    const { container } = render(<PlatformAdminContextBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
