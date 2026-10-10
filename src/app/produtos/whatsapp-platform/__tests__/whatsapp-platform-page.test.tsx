/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import WhatsAppPlatformPage from "../page";

vi.mock("@/lib/analytics", () => ({
  trackCtaWhatsAppClick: vi.fn(),
}));

describe("P0 — Landing /produtos/whatsapp-platform", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "5511999999999");
  });

  it("renderiza sem crash e todas as secções principais", () => {
    render(<WhatsAppPlatformPage />);

    expect(document.getElementById("whatsapp-hero-heading")).toBeTruthy();
    expect(document.getElementById("problem-section-heading")).toBeTruthy();
    expect(document.getElementById("solution-section-heading")).toBeTruthy();
    expect(document.getElementById("product-preview-heading")).toBeTruthy();
    expect(document.getElementById("differentiators-section-heading")).toBeTruthy();
    expect(document.getElementById("use-cases-section-heading")).toBeTruthy();
    expect(document.getElementById("positioning-section-heading")).toBeTruthy();
    expect(document.getElementById("final-cta-heading")).toBeTruthy();
  });

  it("CTAs primário (WhatsApp) e secundário (demo) com hrefs válidos", () => {
    render(<WhatsAppPlatformPage />);

    const primary = screen.getAllByRole("link", { name: /Agendar diagnóstico/i });
    expect(primary.length).toBeGreaterThanOrEqual(1);
    const wa = primary[0];
    expect(wa.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/5511999999999/);

    const demoLinks = screen.getAllByRole("link", { name: /Ver demo guiada/i });
    expect(demoLinks[0]).toHaveAttribute("href", "/demo");

    const inbox = screen.getByRole("link", { name: /Abrir inbox/i });
    expect(inbox.getAttribute("href")).toContain("/inbox");

    const contact = screen.getAllByRole("link", { name: /Mandar briefing/i });
    expect(contact[0]).toHaveAttribute("href", "/contato");
  });

  it("não vende SLA, score nem garantia de mensagem duplicada", () => {
    render(<WhatsAppPlatformPage />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/SLA/i);
    expect(text).not.toContain("Score 94");
    expect(text).not.toMatch(/zero mensagem duplicada/i);
    expect(text).not.toMatch(/zero msg duplicada/i);
    expect(text).not.toMatch(/dashboard operacional/i);
    expect(text).toMatch(/Dados ilustrativos/i);
  });

  it("secção final inclui CTA WhatsApp e link para demo", () => {
    render(<WhatsAppPlatformPage />);
    const final = screen.getByRole("region", { name: /Quer sair da conversa com um plano/i });
    expect(
      within(final).getByRole("link", { name: /Agendar diagnóstico/i })
    ).toHaveAttribute("href", expect.stringMatching(/^https:\/\/wa\.me\//));
    expect(within(final).getByRole("link", { name: /Ver demo guiada/i })).toHaveAttribute("href", "/demo");
  });
});
