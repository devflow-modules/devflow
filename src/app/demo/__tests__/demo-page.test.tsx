/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DemoPage from "../page";

vi.mock("@/lib/analytics", () => ({
  trackDemoCompleted: vi.fn(),
  trackDemoHandoff: vi.fn(),
  trackDemoMessageSent: vi.fn(),
  trackDemoScenarioSelected: vi.fn(),
}));

describe("P1 — Demo /demo", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "5511888888888");
  });

  it("carrega experiência guiada, CTA especialista (wa.me) e Ver produto", () => {
    render(<DemoPage />);
    expect(
      screen.getByRole("heading", {
        name: /Veja como seu WhatsApp pode responder/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/1\. Escolha o segmento/i)).toBeInTheDocument();
    const wa = screen.getByRole("link", { name: /Falar com especialista/i });
    expect(wa.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/5511888888888/);
    expect(
      screen.getByRole("link", {
        name: /Ver página do produto WhatsApp Platform/i,
      })
    ).toHaveAttribute("href", "/produtos/whatsapp-platform");
  });
});
