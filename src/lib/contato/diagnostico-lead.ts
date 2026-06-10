import { z } from "zod";

/** Payload público do formulário `/contato` (diagnóstico WhatsApp Platform). */
export const diagnosticoLeadInputSchema = z.object({
  nome: z.string().trim().min(1, "Informe seu nome.").max(200),
  whatsapp: z.string().trim().min(3, "Informe seu WhatsApp.").max(40),
  empresa: z.string().trim().max(200).optional().default(""),
  segmento: z.string().trim().max(200).optional().default(""),
  volume: z.string().trim().max(120).optional().default(""),
  problema: z.string().trim().max(200).optional().default(""),
  horario: z.string().trim().max(120).optional().default(""),
});

export type DiagnosticoLeadInput = z.infer<typeof diagnosticoLeadInputSchema>;

export const DIAGNOSTICO_LEAD_ORIGIN = "inbound_site" as const;
export const DIAGNOSTICO_LEAD_STATUS = "novo" as const;
export const DIAGNOSTICO_PRODUCT_INTEREST = "whatsapp_platform" as const;

/** Normalização leve: apenas dígitos, alinhada a helpers do portal (`whatsapp.ts`, templates CRM). */
export function normalizeLeadPhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  return digits.length > 0 ? digits : trimmed;
}

function displayOrDash(value: string | undefined): string {
  const t = value?.trim();
  return t ? t : "—";
}

/** Briefing enviado ao WhatsApp (CTA existente do formulário). */
export function buildDiagnosticoMessage(data: DiagnosticoLeadInput): string {
  const lines = [
    "Olá, vim pelo site e quero agendar um diagnóstico da minha operação no WhatsApp.",
    "",
    `Nome: ${data.nome.trim()}`,
    `WhatsApp: ${data.whatsapp.trim()}`,
    `Empresa: ${displayOrDash(data.empresa)}`,
    `Segmento: ${displayOrDash(data.segmento)}`,
    `Volume aproximado/dia: ${displayOrDash(data.volume)}`,
    `Principal problema hoje: ${displayOrDash(data.problema)}`,
    `Melhor horário para contato: ${displayOrDash(data.horario)}`,
  ];
  return lines.join("\n");
}

/** Notas estruturadas persistidas no CRM (`Lead.notes`). */
export function buildDiagnosticoLeadNotes(data: DiagnosticoLeadInput): string {
  const header = [
    "[Diagnóstico WhatsApp Platform — /contato]",
    `Produto de interesse: ${DIAGNOSTICO_PRODUCT_INTEREST}`,
    "Canal: site/formulário de diagnóstico",
    `Origem: ${DIAGNOSTICO_LEAD_ORIGIN}`,
    "",
    `Nome: ${data.nome.trim()}`,
    `WhatsApp: ${data.whatsapp.trim()}`,
    `Empresa: ${displayOrDash(data.empresa)}`,
    `Segmento: ${displayOrDash(data.segmento)}`,
    `Volume aproximado/dia: ${displayOrDash(data.volume)}`,
    `Principal problema hoje: ${displayOrDash(data.problema)}`,
    `Melhor horário para contato: ${displayOrDash(data.horario)}`,
    "",
    "---",
    "Mensagem WhatsApp (briefing do cliente):",
    buildDiagnosticoMessage(data),
  ];
  return header.join("\n");
}
