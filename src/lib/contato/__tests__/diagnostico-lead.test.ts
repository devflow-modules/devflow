import { describe, it, expect } from "vitest";
import {
  buildDiagnosticoLeadNotes,
  buildDiagnosticoMessage,
  diagnosticoLeadInputSchema,
  DIAGNOSTICO_LEAD_ORIGIN,
  DIAGNOSTICO_PRODUCT_INTEREST,
  normalizeLeadPhone,
} from "../diagnostico-lead";

describe("diagnostico-lead", () => {
  const sample = {
    nome: "Maria Silva",
    whatsapp: "(11) 98888-7777",
    empresa: "Acme Ltda",
    segmento: "delivery",
    volume: "50 a 100 mensagens",
    problema: "Demora no atendimento",
    horario: "Manhã (8h–12h)",
  };

  it("normaliza telefone para dígitos", () => {
    expect(normalizeLeadPhone("(11) 98888-7777")).toBe("11988887777");
  });

  it("buildDiagnosticoMessage inclui campos do formulário", () => {
    const msg = buildDiagnosticoMessage(sample);
    expect(msg).toContain("Maria Silva");
    expect(msg).toContain("(11) 98888-7777");
    expect(msg).toContain("Acme Ltda");
    expect(msg).toContain("50 a 100 mensagens");
  });

  it("buildDiagnosticoLeadNotes inclui produto, origem e briefing", () => {
    const notes = buildDiagnosticoLeadNotes(sample);
    expect(notes).toContain(DIAGNOSTICO_PRODUCT_INTEREST);
    expect(notes).toContain(DIAGNOSTICO_LEAD_ORIGIN);
    expect(notes).toContain("site/formulário de diagnóstico");
    expect(notes).toContain("Maria Silva");
    expect(notes).toContain("Demora no atendimento");
    expect(notes).toContain(buildDiagnosticoMessage(sample));
  });

  it("schema aceita payload válido", () => {
    const parsed = diagnosticoLeadInputSchema.safeParse(sample);
    expect(parsed.success).toBe(true);
  });

  it("schema rejeita nome vazio", () => {
    const parsed = diagnosticoLeadInputSchema.safeParse({ ...sample, nome: "   " });
    expect(parsed.success).toBe(false);
  });

  it("schema rejeita whatsapp ausente", () => {
    const parsed = diagnosticoLeadInputSchema.safeParse({ ...sample, whatsapp: "" });
    expect(parsed.success).toBe(false);
  });
});
