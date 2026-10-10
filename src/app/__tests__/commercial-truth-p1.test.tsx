/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import CasesPage from "../cases/page";
import WhatsAppMultiCanalPage from "../solucoes/whatsapp-multi-canal/page";
import WhatsappBusinessApiPage from "../whatsapp-business-api/page";
import ChatbotWhatsAppPage from "../chatbot-whatsapp/page";
import { CASES_TRANSPARENCY_NOTE, nicheExamples } from "@/lib/cases";
import { projects } from "@/lib/projects";
import {
  AUTOMACAO_WHATSAPP_CLINICA,
  AUTOMACAO_WHATSAPP_RESTAURANTE,
} from "@/lib/niche-whatsapp-automation-pages";
import { blogArticles } from "@/lib/blog";
import SoftwareAtendimentoWhatsAppPage from "../software-atendimento-whatsapp/page";

vi.mock("@/lib/analytics", () => ({
  trackCtaWhatsAppClick: vi.fn(),
  trackFunnelCtaClick: vi.fn(),
  trackProductsPageCtaClicked: vi.fn(),
}));

function textOf(node: HTMLElement) {
  return node.textContent ?? "";
}

describe("P1 commercial truth", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "5511999999999");
  });

  it("cases continuam simulação e sem métrica de tempo de resposta", () => {
    expect(CASES_TRANSPARENCY_NOTE.toLowerCase()).toContain("simulações");
    const joined = JSON.stringify(nicheExamples);
    expect(joined).not.toMatch(/métricas de tempo de resposta/i);
    expect(joined).not.toMatch(/intenção comercial/i);
    render(<CasesPage />);
    const text = textOf(document.body);
    expect(text).toMatch(/simulações operacionais/i);
    expect(text).not.toMatch(/SLA/i);
    expect(text).not.toMatch(/tempo de resposta/i);
  });

  it("solução e API não vendem SLA nem tempo médio como benefício", () => {
    render(<WhatsAppMultiCanalPage />);
    const solution = textOf(document.body);
    expect(solution).not.toMatch(/SLA/i);
    expect(solution).toMatch(/Não há relatório de tempo médio/i);
    expect(solution).toMatch(/Não é inbox de Instagram/i);
    document.body.innerHTML = "";
    render(<WhatsappBusinessApiPage />);
    const api = textOf(document.body);
    expect(api).not.toMatch(/SLA/i);
    expect(api).toMatch(/Cloud API/i);
    expect(api).toMatch(/não garante aprovação/i);
  });

  it("projetos descrevem a WhatsApp Platform sem SLA nem dashboard", () => {
    const whatsapp = projects.find((project) => project.id === "whatsapp-platform");
    expect(whatsapp?.description).toMatch(/Inbox compartilhado/i);
    expect(whatsapp?.description).not.toMatch(/SLA/i);
    expect(whatsapp?.description).not.toMatch(/dashboard/i);
  });

  it("chatbot preserva a busca e não promete piloto nem autonomia 24/7", () => {
    render(<ChatbotWhatsAppPage />);
    const text = textOf(document.body);
    expect(text.toLowerCase()).toContain("chatbot");
    expect(text).toMatch(/automação/i);
    expect(text).not.toMatch(/Piloto grátis/i);
    expect(text).not.toMatch(/Piloto de 7 dias/i);
    expect(text).not.toMatch(/24\/7|24 horas, 7 dias/i);
    expect(text).not.toMatch(/bot inteligente/i);
  });

  it("clínica não oferece diagnóstico e restaurante não vende resultado medido", () => {
    const clinic = JSON.stringify(AUTOMACAO_WHATSAPP_CLINICA);
    expect(clinic.toLowerCase()).toContain("não faz diagnóstico");
    expect(clinic).not.toMatch(/A IA diagnostica/i);
    expect(clinic).not.toMatch(/jejum obrigatório/i);
    expect(clinic).not.toMatch(/LGPD compliant|certificação formal de/i);
    expect(clinic).toMatch(/checklist de privacidade/i);
    const restaurant = JSON.stringify(AUTOMACAO_WHATSAPP_RESTAURANTE);
    expect(restaurant).not.toMatch(/SLA/i);
    expect(restaurant).not.toMatch(/muito mais rápida/i);
    expect(restaurant).not.toMatch(/1–2 min/i);
    expect(restaurant).toMatch(/Simulação de uso/i);
  });

  it("blog e software de atendimento não vendem handoff inteligente nem tempo de resposta", () => {
    const blog = JSON.stringify(blogArticles);
    expect(blog).not.toMatch(/handoff inteligente/i);
    expect(blog).not.toMatch(/24 horas por dia/i);
    expect(blog).not.toMatch(/tempo de primeira resposta/i);
    document.body.innerHTML = "";
    render(<SoftwareAtendimentoWhatsAppPage />);
    const text = textOf(document.body);
    expect(text).toMatch(/inbox compartilhado/i);
    expect(text).not.toMatch(/tempo de resposta/i);
    expect(text).not.toMatch(/Handoff automático/i);
  });
});
