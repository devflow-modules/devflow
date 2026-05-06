import { WHATSAPP_CHANNEL_PURPOSE_PT } from "@/lib/whatsappChannelPurposeLabels";

/** Dados mínimos para apresentação de linha (alinhado com `WhatsappLineSummary`). */
export type WhatsappLinePresentationInput = {
  phoneNumberId: string;
  label: string | null;
  displayPhoneNumber: string | null;
  isPrimary: boolean;
  isDefaultOutbound: boolean;
  purpose: string;
};

const MAX_BADGE_LABEL = 22;

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function isPrimaryWhatsappLine(line: Pick<WhatsappLinePresentationInput, "isPrimary">): boolean {
  return Boolean(line.isPrimary);
}

/** Finalidade em PT para chips e legendas (sem SaaS/billing). */
export function getWhatsappLinePurposeLabel(line: Pick<WhatsappLinePresentationInput, "purpose">): string {
  const p = (line.purpose ?? "").trim();
  if (!p) return "Linha operacional";
  return WHATSAPP_CHANNEL_PURPOSE_PT[p] ?? p;
}

/**
 * Classes de chip alinhadas a `globals.css` (df-badge-*).
 * Tom principal: linha principal de atendimento; restantes por finalidade.
 */
export function getWhatsappLinePurposeTone(
  line: WhatsappLinePresentationInput
): { className: string } {
  if (line.isPrimary) {
    return { className: "df-badge-brand max-w-full truncate text-[10px] font-semibold tracking-tight" };
  }
  const purpose = (line.purpose ?? "").trim().toUpperCase();
  const compact = "max-w-full truncate text-[10px] font-semibold tracking-tight";
  switch (purpose) {
    case "PROSPECTING":
      return { className: `df-badge-admin ${compact}` };
    case "SALES":
      return { className: `df-badge-success ${compact}` };
    case "SUPPORT":
      return { className: `df-badge-info ${compact}` };
    case "FINANCE":
      return { className: `df-badge-warning ${compact}` };
    case "GENERAL":
    default:
      return { className: `df-badge-muted ${compact}` };
  }
}

/**
 * Rótulo curto para chip na lista (Inbox / histórico).
 * Não duplica o texto longo do filtro — usar `formatWhatsappLineFilterOptionLabel` para tooltip/detalhe.
 */
export function formatWhatsappLineBadgeLabel(line: WhatsappLinePresentationInput): string {
  if (line.isPrimary) {
    return "Principal";
  }
  const label = line.label?.trim();
  if (label) {
    return truncate(label, MAX_BADGE_LABEL);
  }
  const purposePt = getWhatsappLinePurposeLabel(line);
  if (purposePt && purposePt !== "Geral") {
    return truncate(purposePt, MAX_BADGE_LABEL);
  }
  const phone = line.displayPhoneNumber?.trim();
  if (phone) {
    return truncate(phone, MAX_BADGE_LABEL);
  }
  const id = line.phoneNumberId;
  return id.length > 12 ? `${id.slice(0, 10)}…` : id;
}

/**
 * Rótulo completo para select de filtro, detalhe e tooltips (comportamento anterior de `formatInboxLineFilterOptionLabel`).
 */
export function formatWhatsappLineFilterOptionLabel(line: WhatsappLinePresentationInput): string {
  const purposePt = getWhatsappLinePurposeLabel(line);
  const label = line.label?.trim() || null;
  const phone = line.displayPhoneNumber?.trim() || null;
  const idShort =
    line.phoneNumberId.length > 14 ? `${line.phoneNumberId.slice(0, 12)}…` : line.phoneNumberId;

  const parts: string[] = [];
  if (label) parts.push(label);
  if (phone && phone !== label) parts.push(phone);
  if (parts.length === 0) parts.push(idShort);
  parts.push(purposePt);
  if (line.isPrimary) parts.push("Principal");
  if (line.isDefaultOutbound) parts.push("Envio padrão");

  return parts.join(" · ");
}
