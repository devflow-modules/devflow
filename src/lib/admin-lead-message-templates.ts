/**
 * Textos padrão para ações de WhatsApp no /admin/leads.
 * Nada é persistido: apenas gera `string` para abrir `wa.me`.
 */

export const ADMIN_LEAD_MESSAGE_TEMPLATE_KEYS = [
  "primeiro_contato",
  "follow_up",
  "enviar_demo",
] as const;

export type AdminLeadMessageTemplateKey = (typeof ADMIN_LEAD_MESSAGE_TEMPLATE_KEYS)[number];

/** Mínimo para preencher templates (p.ex. registro de Lead do Prisma). */
export type AdminLeadForMessageTemplates = {
  name?: string | null;
  company?: string | null;
};

export type LeadMessageVars = {
  name: string;
  company: string;
};

function pickName(v: LeadMessageVars): string {
  const t = v.name?.trim();
  if (t) return t;
  return "aí";
}

function pickCompany(v: LeadMessageVars): string {
  const t = v.company?.trim();
  if (t) return t;
  return "aí";
}

function toVars(lead: AdminLeadForMessageTemplates): LeadMessageVars {
  return {
    name: lead.name ?? "",
    company: lead.company ?? "",
  };
}

const bodies: Record<AdminLeadMessageTemplateKey, (v: LeadMessageVars) => string> = {
  primeiro_contato: (v) => {
    const n = pickName(v);
    return `Olá${n && n !== "aí" ? `, ${n}` : ""} — tudo bem? Aqui é da DevFlow Labs.\n\nVi o contato e queria alinhar em 1–2 minutos: faz sentido falarmos sobre atendimento no WhatsApp (fila, resposta, operação) para ${pickCompany(v)}? Se preferir, me diga um horário.`;
  },
  follow_up: (v) => {
    return `Olá${pickName(v) !== "aí" ? `, ${pickName(v)}` : ""} — passando o follow-up da DevFlow. Você teve chance de ver minha mensagem anterior?\n\nSe ainda fizer sentido, posso te mostrar em 2 min na demo online como organizam inbox e follow-up no WhatsApp. Me avise se prefere falar hoje ou amanhã.`;
  },
  enviar_demo: (v) => {
    return `Olá${pickName(v) !== "aí" ? `, ${pickName(v)}` : ""} — segue o link da demonstração guiada (2 min) da DevFlow: você vê o fluxo de atendimento no WhatsApp de ponta a ponta.\n\nQuando puder, me dê um “ok” aqui que te ajudo no próximo passo.`;
  },
};

export function firstContactTemplate(lead: AdminLeadForMessageTemplates): string {
  return bodies.primeiro_contato(toVars(lead));
}

export function followUpTemplate(lead: AdminLeadForMessageTemplates): string {
  return bodies.follow_up(toVars(lead));
}

export function sendDemoTemplate(lead: AdminLeadForMessageTemplates): string {
  return bodies.enviar_demo(toVars(lead));
}

/**
 * Gera o texto puro (para pré-visualização ou reutilização interna).
 */
export function renderAdminLeadMessageTemplate(
  key: AdminLeadMessageTemplateKey,
  vars: LeadMessageVars
): string {
  return bodies[key](vars);
}

/**
 * Gera a query `text=` para `wa.me` a partir de uma chave (texto ainda puro, encode em seguida).
 */
export function encodeAdminLeadMessageForWhatsApp(
  key: AdminLeadMessageTemplateKey,
  vars: LeadMessageVars
): string {
  return encodeURIComponent(renderAdminLeadMessageTemplate(key, vars));
}

/** `text` do segundo parâmetro já vem de `encodeURIComponent` / `encodeAdminLeadMessageForWhatsApp`. */
export function buildWaMeUrlWithText(phoneDigits: string, textEncoded: string): string {
  const d = phoneDigits.replace(/\D/g, "");
  if (!d) return "#";
  return `https://wa.me/${d}?text=${textEncoded}`;
}

/**
 * Abre WhatsApp com mensagem em texto plano (faz o encode de `text` aqui).
 */
export function buildWhatsAppUrlWithMessage(phone: string, text: string): string {
  return buildWaMeUrlWithText(phone.replace(/\D/g, ""), encodeURIComponent(text));
}
