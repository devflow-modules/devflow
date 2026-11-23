/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ComoFuncionaPage from "../page";
import { HOW_IT_WORKS_STEPS } from "@/lib/how-it-works-steps";
import { trackFunnelCtaClick } from "@/lib/analytics";

vi.mock("@/lib/analytics", () => ({
  trackFunnelCtaClick: vi.fn(),
  trackHomeCta: vi.fn(),
  trackCtaWhatsAppClick: vi.fn(),
  trackCtaScroll50: vi.fn(),
  trackScrollDepth: vi.fn(),
  trackEcosystemLinkClick: vi.fn(),
  trackToolCardClick: vi.fn(),
  trackCtaDemoClick: vi.fn(),
}));

describe("como-funciona page", () => {
  it("usa quatro etapas compartilhadas e corrige a inconsistência de três passos", () => {
    render(<ComoFuncionaPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Como funciona a plataforma de WhatsApp" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Quatro etapas até a operação no WhatsApp" })).toBeTruthy();
    expect(document.body.textContent ?? "").toMatch(/Quatro etapas/i);
    expect(document.body.textContent ?? "").not.toMatch(/três passos/i);

    expect(HOW_IT_WORKS_STEPS).toHaveLength(4);
    for (const step of HOW_IT_WORKS_STEPS) {
      expect(screen.getByRole("heading", { name: step.title })).toBeTruthy();
      expect(screen.getByText(step.happens)).toBeTruthy();
      expect(screen.getByText(step.clientRole)).toBeTruthy();
      expect(screen.getByText(step.outcome)).toBeTruthy();
    }

    expect(screen.getByText("Exemplo ilustrativo")).toBeTruthy();
    expect(screen.getByText(/Separar comercial e suporte/i)).toBeTruthy();
  });

  it("fecha com demo primária, diagnóstico secundário e links de preços/produtos", () => {
    render(<ComoFuncionaPage />);

    const next = screen.getByRole("region", { name: "Próximo passo" });
    const demo = within(next).getByRole("link", { name: /Ver demonstração/i });
    const convert = within(next).getByRole("link", { name: /Solicitar diagnóstico/i });

    expect(demo).toHaveAttribute("href", "/demo");
    expect(convert).toHaveAttribute("href", "/contato");
    expect(within(next).getByRole("link", { name: "Preços" })).toHaveAttribute("href", "/precos");
    expect(within(next).getByRole("link", { name: "Catálogo de produtos" })).toHaveAttribute(
      "href",
      "/produtos",
    );

    const hub = screen.getByRole("region", { name: /Quatro etapas até a operação no WhatsApp/i });
    fireEvent.click(
      within(hub).getByRole("link", { name: "Ver demonstração guiada de atendimento no WhatsApp" }),
    );
    expect(trackFunnelCtaClick).toHaveBeenCalledWith({
      cta: "ver_demo_guiada",
      surface: "how_it_works_demo",
    });
  });

  it("preserva breadcrumb de volta à Home", () => {
    render(<ComoFuncionaPage />);
    const crumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(crumb).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  });
});
