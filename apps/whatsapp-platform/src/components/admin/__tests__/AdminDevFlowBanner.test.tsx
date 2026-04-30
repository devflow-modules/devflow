/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminDevFlowBanner } from "../AdminDevFlowBanner";

vi.mock("@/components/navigation/SessionRoleContext", () => ({
  useSessionRole: vi.fn(),
}));

import { useSessionRole } from "@/components/navigation/SessionRoleContext";

describe("AdminDevFlowBanner", () => {
  it("mostra modo plataforma e contexto tenant quando há tenantId", () => {
    vi.mocked(useSessionRole).mockReturnValue({
      role: "platform_admin",
      tenantId: "t-ctx",
      loading: false,
    });
    render(<AdminDevFlowBanner />);
    expect(screen.getByTestId("admin-devflow-banner")).toHaveTextContent(
      "Modo Plataforma — área interna DevFlow"
    );
    expect(screen.getByText(/contexto atual: tenant/i)).toBeInTheDocument();
    expect(screen.getByText("t-ctx")).toBeInTheDocument();
  });

  it("omite linha de tenant quando tenantId está vazio", () => {
    vi.mocked(useSessionRole).mockReturnValue({
      role: "platform_admin",
      tenantId: null,
      loading: false,
    });
    render(<AdminDevFlowBanner />);
    expect(screen.getByTestId("admin-devflow-banner")).toHaveTextContent(
      "Modo Plataforma — área interna DevFlow"
    );
    expect(screen.queryByText(/contexto atual:/i)).not.toBeInTheDocument();
  });
});
