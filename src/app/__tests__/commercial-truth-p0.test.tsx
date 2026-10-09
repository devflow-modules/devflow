/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PrecosPage from "../precos/page";
import AutomacaoWhatsAppPage from "../automacao-whatsapp/page";
import { ProductsHubClient } from "@/components/products/products-hub-client";
import { getBlogArticleBySlug } from "@/lib/blog";

vi.mock("@/lib/analytics", () => ({
  trackCtaWhatsAppClick: vi.fn(),
  trackFunnelCtaClick: vi.fn(),
  trackProductsPageCtaClicked: vi.fn(),
  trackToolCardClick: vi.fn(),
  trackEcosystemLinkClick: vi.fn(),
}));

const BANNED = [
  "Piloto grátis",
  "Piloto de 7 dias",
  "1.000 mensagens",
  "Mensagens ilimitadas",
  "Métricas avançadas",
  "métricas em tempo real",
  "SLA dedicado",
  "Suporte 24/7",
  "responde 24/7",
  "sem ocupar a equipe",
  "handoff inteligente",
  "handoff imediato",
  "operações reais",
  "em produção em operações reais",
];

function expectNoBannedClaims(text: string) {
  for (const claim of BANNED) {
    expect(text.toLowerCase()).not.toContain(claim.toLowerCase());
  }
}

describe("P0 commercial truth", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "5511999999999");
  });

  it("preços não promete cota, SLA, métrica avançada nem suporte 24/7", () => {
    render(<PrecosPage />);
    const text = document.body.textContent ?? "";
    expectNoBannedClaims(text);
    expect(text).toMatch(/Implantação acompanhada/i);
    expect(text).toMatch(/Operação mensal/i);
    expect(text).not.toMatch(/R\$\s?\d/);
  });

  it("automação não promete autonomia 24/7 nem handoff inteligente", () => {
    render(<AutomacaoWhatsAppPage />);
    const text = document.body.textContent ?? "";
    expectNoBannedClaims(text);
    expect(text).toMatch(/Automatize o repetitivo/i);
    expect(text).toMatch(/segue para a equipe/i);
  });

  it("hub de produtos não usa operações reais como prova", () => {
    render(<ProductsHubClient />);
    const text = document.body.textContent ?? "";
    expectNoBannedClaims(text);
    expect(screen.getByRole("heading", { name: /Produtos DevFlow/i })).toBeInTheDocument();
  });

  it("artigo de custo operacional não afirma produção em clientes", () => {
    const article = getBlogArticleBySlug("reduzir-custo-operacional-automacao");
    expect(article).toBeDefined();
    const text = `${article?.description ?? ""} ${article?.content ?? ""}`;
    expectNoBannedClaims(text);
    expect(text).toMatch(/organizar operações de atendimento/i);
    expect(text).not.toMatch(/em produção/i);
  });
});
