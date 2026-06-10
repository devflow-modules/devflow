import { describe, expect, it } from "vitest";
import { shouldRunSupabaseSession } from "@/lib/supabase/should-run-supabase-session";

describe("shouldRunSupabaseSession", () => {
  it("returns false for public marketing routes", () => {
    const publicPaths = [
      "/",
      "/demo",
      "/contato",
      "/cases",
      "/precos",
      "/projetos",
      "/sobre",
      "/ferramentas",
      "/ferramentas/divisao-de-contas",
      "/ferramentas/consulta-cnpj",
      "/produtos/whatsapp-platform",
      "/automacao-whatsapp",
      "/automacao-whatsapp-clinica",
      "/software-atendimento-whatsapp",
      "/blog",
      "/blog/post-slug",
    ];

    for (const path of publicPaths) {
      expect(shouldRunSupabaseSession(path), path).toBe(false);
    }
  });

  it("returns false for static and metadata paths", () => {
    expect(shouldRunSupabaseSession("/_next/static/chunk.js")).toBe(false);
    expect(shouldRunSupabaseSession("/favicon.ico")).toBe(false);
    expect(shouldRunSupabaseSession("/robots.txt")).toBe(false);
    expect(shouldRunSupabaseSession("/sitemap.xml")).toBe(false);
    expect(shouldRunSupabaseSession("/og-devflow.png")).toBe(false);
  });

  it("returns false for financeiro demo (public)", () => {
    expect(shouldRunSupabaseSession("/ferramentas/financeiro/demo")).toBe(false);
  });

  it("returns true for financeiro landing (authenticated redirect)", () => {
    expect(shouldRunSupabaseSession("/ferramentas/financeiro")).toBe(true);
    expect(shouldRunSupabaseSession("/ferramentas/financeiro/")).toBe(true);
  });

  it("returns true for financeiro auth and operational paths", () => {
    expect(shouldRunSupabaseSession("/ferramentas/financeiro/auth")).toBe(true);
    expect(shouldRunSupabaseSession("/ferramentas/financeiro/auth/callback")).toBe(true);
    expect(shouldRunSupabaseSession("/ferramentas/financeiro/dashboard")).toBe(true);
    expect(shouldRunSupabaseSession("/ferramentas/financeiro/app")).toBe(true);
  });

  it("returns true for admin and whatsapp protected routes", () => {
    expect(shouldRunSupabaseSession("/admin/leads")).toBe(true);
    expect(shouldRunSupabaseSession("/admin/metrics")).toBe(true);
    expect(shouldRunSupabaseSession("/inbox")).toBe(true);
    expect(shouldRunSupabaseSession("/settings/billing")).toBe(true);
  });

  it("returns true for private admin APIs", () => {
    expect(shouldRunSupabaseSession("/api/admin/leads")).toBe(true);
  });

  it("returns false for public APIs", () => {
    expect(shouldRunSupabaseSession("/api/health")).toBe(false);
    expect(shouldRunSupabaseSession("/api/tools/cnpj/123")).toBe(false);
  });
});
