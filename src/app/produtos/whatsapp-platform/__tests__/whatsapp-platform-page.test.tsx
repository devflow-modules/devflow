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

    const primary = screen.getAllByRole("link", { name: /Reservar conversa com vendas/i });
    expect(primary.length).toBeGreaterThanOrEqual(1);
    const wa = primary[0];
    expect(wa.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/5511999999999/);

    const demoLinks = screen.getAllByRole("link", { name: /Ver demo em 2 minutos/i });
    expect(demoLinks[0]).toHaveAttribute("href", "/demo");

    const inbox = screen.getByRole("link", { name: /Abrir inbox/i });
    expect(inbox.getAttribute("href")).toContain("/inbox");

    const contact = screen.getAllByRole("link", { name: /Mandar briefing/i });
    expect(contact[0]).toHaveAttribute("href", "/contato");
  });

  it("secção final inclui CTA WhatsApp e link para demo", () => {
    render(<WhatsAppPlatformPage />);
    const final = screen.getByRole("region", { name: /Quer sentir o produto/i });
    expect(
      within(final).getByRole("link", { name: /Reservar conversa com vendas/i })
    ).toHaveAttribute("href", expect.stringMatching(/^https:\/\/wa\.me\//));
    expect(within(final).getByRole("link", { name: /Ver demo em 2 minutos/i })).toHaveAttribute("href", "/demo");
  });
});
