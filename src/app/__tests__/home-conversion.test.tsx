/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import Home from "../page";
import { trackFunnelCtaClick, trackHomeCta } from "@/lib/analytics";

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

const SECTION_ORDER = [
  "hero-heading",
  "problem-solution-heading",
  "how-it-works-hub-heading",
  "whatsapp-product-heading",
  "faq-heading",
  "final-cta-v2-heading",
  "tools-heading",
  "products-heading",
] as const;

const UNSUPPORTED_CLAIMS = [
  "LIVE",
  "Produção",
  "1.247",
  "74%",
  "2m12s",
  "70%",
  "100%",
  "números reais",
  "não mockup",
  "não é mockup",
  "Ver exemplo real",
  "Operações reais",
  "24/7",
];

describe("home conversion cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "5511999999999");
  });

  it("ordena a decisão antes do ecossistema e não mostra prova inventada", () => {
    render(<Home />);

    const nodes = SECTION_ORDER.map((id) => {
      const node = document.getElementById(id);
      expect(node, id).toBeTruthy();
      return node!;
    });

    for (let index = 1; index < nodes.length; index += 1) {
      const relation = nodes[index - 1].compareDocumentPosition(nodes[index]);
      expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }

    const text = document.body.textContent ?? "";
    for (const claim of UNSUPPORTED_CLAIMS) {
      expect(text).not.toContain(claim);
    }

    expect(text).toContain("Dados ilustrativos");
    expect(text).toContain("Demonstração da plataforma");
    expect(text).toContain("Quer entender como isso funcionaria na sua operação?");
    expect(screen.getByRole("heading", { name: "O que entra na operação" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Como sua operação de WhatsApp sai do improviso" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Perguntas frequentes" })).toBeTruthy();
  });

  it("separa CTA primário, demo e WhatsApp no hero", () => {
    render(<Home />);
    const hero = screen.getByRole("region", { name: /Menos mensagem perdida/i });

    const primary = within(hero).getByRole("link", {
      name: "Agendar diagnóstico da operação no WhatsApp",
    });
    expect(primary).toHaveAttribute("href", "/contato");
    expect(primary.className).toContain("df-btn-primary");

    const demo = within(hero).getByRole("link", {
      name: "Ver demonstração guiada de atendimento no WhatsApp",
    });
    expect(demo).toHaveAttribute("href", "/demo");
    expect(demo).toHaveTextContent("Ver demo");
    expect(demo.className).not.toContain("df-btn-primary");

    const whatsapp = within(hero).getByRole("link", {
      name: "Falar no WhatsApp com a DevFlow Labs",
    });
    expect(whatsapp.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/5511999999999/);
    expect(whatsapp.className).not.toContain("df-btn");

    fireEvent.click(primary);
    expect(trackFunnelCtaClick).toHaveBeenCalledWith({
      cta: "agendar_diagnostico",
      surface: "hero_primary",
    });
    expect(trackHomeCta).toHaveBeenCalledWith("hero_agendar_diagnostico");

    fireEvent.click(demo);
    expect(trackFunnelCtaClick).toHaveBeenCalledWith({
      cta: "ver_demo_guiada",
      surface: "hero_secondary",
    });
  });

  it("mantém o CTA final imediatamente relevante e rastreado", () => {
    render(<Home />);
    const finalCta = screen.getByRole("region", {
      name: "Quer entender como isso funcionaria na sua operação?",
    });

    const primary = within(finalCta).getByRole("link", {
      name: "Agendar diagnóstico da operação no WhatsApp",
    });
    const demo = within(finalCta).getByRole("link", {
      name: "Ver demonstração guiada de atendimento no WhatsApp",
    });

    expect(primary).toHaveAttribute("href", "/contato");
    expect(demo).toHaveAttribute("href", "/demo");
    expect(demo).toHaveTextContent("Ver demo");

    fireEvent.click(primary);
    expect(trackFunnelCtaClick).toHaveBeenCalledWith({
      cta: "agendar_diagnostico",
      surface: "final_cta_primary",
    });

    fireEvent.click(demo);
    expect(trackFunnelCtaClick).toHaveBeenCalledWith({
      cta: "ver_demo_guiada",
      surface: "final_cta_secondary",
    });
  });
});
