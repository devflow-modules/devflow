/**
 * Templates de mensagem por tipo de ação (NBA) — reutiliza textos de `admin-lead-message-templates`.
 * Codificação única em `buildWhatsAppUrlWithMessage` (evita double-encode).
 */

import type { LeadActionType } from "./lead-next-action";
import {
  firstContactTemplate,
  followUpTemplate,
  sendDemoTemplate,
  buildWhatsAppUrlWithMessage,
  type AdminLeadForMessageTemplates,
} from "./admin-lead-message-templates";

export type { AdminLeadForMessageTemplates };

function pickName(lead: AdminLeadForMessageTemplates): string {
  const t = lead.name?.trim();
  return t || "aí";
}

function pickCompany(lead: AdminLeadForMessageTemplates): string {
  const t = lead.company?.trim();
  return t || "a operação aí";
}

export { firstContactTemplate, followUpTemplate, sendDemoTemplate, buildWhatsAppUrlWithMessage };

/**
 * Aprofundar após primeiro toque: fit e dor.
 */
export function qualifyTemplate(lead: AdminLeadForMessageTemplates): string {
  const n = pickName(lead);
  return `Olá${n && n !== "aí" ? `, ${n}` : ""} — aqui da DevFlow de novo. Para alinhar rápido: hoje o time trata o WhatsApp mais por volume (resposta) ou por conversão? Assim monto a próxima frase de forma útil para ${pickCompany(lead)}.`;
}

/**
 * Passar a etapa (ex.: SDR → closer) sem automação: texto neutro a editar in loco.
 */
export function handoffTemplate(lead: AdminLeadForMessageTemplates): string {
  const n = pickName(lead);
  return `Olá${n && n !== "aí" ? `, ${n}` : ""} — vou acionar o time de DevFlow no próximo passo (fechamento / proposta) para ${pickCompany(lead)}. Se puder, me diga um horário ou o melhor contato interno.`;
}

/**
 * Gera o texto a enviar conforme a próxima ação (exceto `close` / `none`, vazio).
 */
export function getTemplateByAction(
  type: LeadActionType,
  lead: AdminLeadForMessageTemplates
): string {
  switch (type) {
    case "first_contact":
      return firstContactTemplate(lead);
    case "qualify":
      return qualifyTemplate(lead);
    case "send_demo":
      return sendDemoTemplate(lead);
    case "follow_up":
      return followUpTemplate(lead);
    case "handoff":
      return handoffTemplate(lead);
    case "close":
    case "none":
      return "";
  }
}
