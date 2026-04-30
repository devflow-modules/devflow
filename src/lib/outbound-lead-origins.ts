import { z } from "zod";

/**
 * Valores canónicos de `Lead.origin` (portal / CRM).
 * Filtros e UIs devem alinhar-se a estes slugs; PATCH ainda aceita textos legados 1–120.
 */
export const OUTBOUND_LEAD_ORIGINS = [
  "outbound_whatsapp",
  "lead_finder_google_maps",
  "inbound_site",
  "demo",
  /** Conversa existente no WhatsApp Platform (portal espelha; inbox = fonte de verdade). */
  "inbound_whatsapp_thread",
] as const;

export type OutboundLeadOrigin = (typeof OUTBOUND_LEAD_ORIGINS)[number];

const originEnum = z.enum(OUTBOUND_LEAD_ORIGINS);

export function isCanonicalLeadOrigin(s: string | null | undefined): s is OutboundLeadOrigin {
  if (s == null || s === "") return false;
  return (OUTBOUND_LEAD_ORIGINS as readonly string[]).includes(s);
}

export const OUTBOUND_LEAD_ORIGIN_LABELS: Record<OutboundLeadOrigin, string> = {
  outbound_whatsapp: "WhatsApp outbound",
  lead_finder_google_maps: "Lead finder (Google Maps)",
  inbound_site: "Site / inbound",
  demo: "Demo / pedido de demo",
  inbound_whatsapp_thread: "Inbox WhatsApp (conversa existente)",
};

/** POST /api/admin/leads — só canónicos ou `null` / omitido. */
export const createLeadOriginField = z.union([originEnum, z.null()]).optional();

/**
 * PATCH — canónico, texto legado curto, ou `null` para limpar. "" → sem alterar (omitir campo).
 */
export const patchLeadOriginField = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.union([z.null(), originEnum, z.string().trim().min(1).max(120)]).optional()
);
