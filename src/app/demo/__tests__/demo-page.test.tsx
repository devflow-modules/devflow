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

  it("carrega página alinhada à WhatsApp Platform com fluxo guiado e CTAs de conversão", () => {
    render(<DemoPage />);
    expect(
      screen.getByRole("heading", {
        name: /Veja como uma operação WhatsApp organizada funciona/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Fluxo guiado: da mensagem à fila/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Cliente chama no WhatsApp/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dados ilustrativos/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Painel ilustrativo da operação/i)).toBeInTheDocument();
    expect(screen.queryByText(/SLA/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/operação real/i)).not.toBeInTheDocument();

    const diagnoseLinks = screen.getAllByRole("link", { name: /Agendar diagnóstico/i });
    expect(diagnoseLinks[0]).toHaveAttribute("href", "/contato");

    const waLinks = screen.getAllByRole("link", { name: /Falar no WhatsApp/i });
    expect(waLinks[0].getAttribute("href")).toMatch(/^https:\/\/wa\.me\/5511888888888/);
  });
});
