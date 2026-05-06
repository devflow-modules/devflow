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

  it("carrega página alinhada à oferta multi-canal, CTAs WhatsApp + link solução", () => {
    render(<DemoPage />);
    expect(
      screen.getByRole("heading", {
        name: /Agende um diagnóstico da sua operação no WhatsApp/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/1\. Escolha o segmento/i)).toBeInTheDocument();
    const waLinks = screen.getAllByRole("link", { name: /Agendar diagnóstico/i });
    expect(waLinks[0].getAttribute("href")).toMatch(/^https:\/\/wa\.me\/5511888888888/);
    const solutionLinks = screen.getAllByRole("link", { name: /Ver solução WhatsApp multi-canal/i });
    expect(solutionLinks.length).toBeGreaterThan(0);
    expect(solutionLinks[0]).toHaveAttribute("href", "/solucoes/whatsapp-multi-canal");
  });
});
