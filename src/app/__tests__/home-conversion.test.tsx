/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import Home from "../page";
import { trackFunnelCtaClick, trackHomeCta } from "@/lib/analytics";
import { HOW_IT_WORKS_STEPS } from "@/lib/how-it-works-steps";

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
  "ownership-heading",
  "routing-heading",
  "handoff-heading",
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
    expect(text).not.toContain("SLA");
    expect(text).not.toContain("dashboard operacional");
    expect(text).not.toContain("Próximo produto");
    expect(text).not.toContain("Quero saber");
    expect(text).toContain("API oficial da Meta");
    expect(text).toContain("Inbox da equipe");
    expect(text).toContain("O time sabe quem está atendendo cada conversa");
    expect(text).toContain("Quer ver a plataforma ou falar sobre a sua operação?");
    expect(screen.getByRole("heading", { name: "O que a plataforma coloca na operação" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Como a solução entra na sua operação" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Perguntas frequentes" })).toBeTruthy();

    for (const step of HOW_IT_WORKS_STEPS) {
      expect(text).toContain(step.title);
      expect(text).toContain(step.summary);
    }
  });

  it("prioriza demonstração no hero e mantém diagnóstico como caminho secundário", () => {
    render(<Home />);
    const hero = screen.getByRole("region", { name: /Organize o atendimento da sua equipe no WhatsApp/i });

    const demo = within(hero).getByRole("link", {
      name: "Ver demonstração guiada de atendimento no WhatsApp",
    });
    expect(demo).toHaveAttribute("href", "/demo");
    expect(demo).toHaveTextContent("Ver demonstração");
    expect(demo.className).toContain("df-btn-primary");

    const convert = within(hero).getByRole("link", {
      name: "Solicitar diagnóstico da operação no WhatsApp",
    });
    expect(convert).toHaveAttribute("href", "/contato");
    expect(convert).toHaveTextContent("Solicitar diagnóstico");
    expect(convert.className).not.toContain("df-btn-primary");

    const whatsapp = within(hero).getByRole("link", {
      name: "Falar no WhatsApp com a DevFlow Labs",
    });
    expect(whatsapp.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/5511999999999/);
    expect(whatsapp.className).not.toContain("df-btn");

    fireEvent.click(demo);
    expect(trackFunnelCtaClick).toHaveBeenCalledWith({
      cta: "ver_demo_guiada",
      surface: "hero_primary",
    });
    expect(trackHomeCta).toHaveBeenCalledWith("hero_ver_demo");

    fireEvent.click(convert);
    expect(trackFunnelCtaClick).toHaveBeenCalledWith({
      cta: "agendar_diagnostico",
      surface: "hero_secondary",
    });
  });

  it("liga o hub resumido à página Como funciona sem disparar CTA só por render", () => {
    render(<Home />);
    expect(trackFunnelCtaClick).not.toHaveBeenCalled();

    const hub = screen.getByRole("region", { name: "Como a solução entra na sua operação" });
    const detail = within(hub).getByRole("link", {
      name: "Ver como funciona a implantação da plataforma de WhatsApp",
    });
    expect(detail).toHaveAttribute("href", "/como-funciona");

    fireEvent.click(detail);
    expect(trackFunnelCtaClick).toHaveBeenCalledWith({
      cta: "ver_como_funciona",
      surface: "how_it_works_detail",
    });
  });

  it("mantém o CTA final imediatamente relevante e rastreado", () => {
    render(<Home />);
    const finalCta = screen.getByRole("region", {
      name: "Quer ver a plataforma ou falar sobre a sua operação?",
    });

    const demo = within(finalCta).getByRole("link", {
      name: "Ver demonstração guiada de atendimento no WhatsApp",
    });
    const convert = within(finalCta).getByRole("link", {
      name: "Solicitar diagnóstico da operação no WhatsApp",
    });

    expect(demo).toHaveAttribute("href", "/demo");
    expect(demo).toHaveTextContent("Ver demonstração");
    expect(demo.className).toContain("df-btn-primary");
    expect(convert).toHaveAttribute("href", "/contato");

    fireEvent.click(demo);
    expect(trackFunnelCtaClick).toHaveBeenCalledWith({
      cta: "ver_demo_guiada",
      surface: "final_cta_primary",
    });

    fireEvent.click(convert);
    expect(trackFunnelCtaClick).toHaveBeenCalledWith({
      cta: "agendar_diagnostico",
      surface: "final_cta_secondary",
    });
  });
});
