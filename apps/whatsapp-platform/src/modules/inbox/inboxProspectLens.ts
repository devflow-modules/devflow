/** Filtros leves na lista do Inbox (campo JSON `lead_data.prospect`). */
export const INBOX_PROSPECT_LENS = [
  "followup_due",
  "proposal_open",
  "diagnosis_scheduled",
  "hot_lead",
  "pending_inbound",
] as const;

export type InboxProspectLens = (typeof INBOX_PROSPECT_LENS)[number];

export const INBOX_PROSPECT_LENS_LABELS: Record<InboxProspectLens, string> = {
  followup_due: "Follow-up",
  proposal_open: "Proposta",
  diagnosis_scheduled: "Diagnóstico",
  hot_lead: "Lead quente",
  pending_inbound: "Sem resposta",
};

export function isInboxProspectLens(v: string | null | undefined): v is InboxProspectLens {
  return typeof v === "string" && (INBOX_PROSPECT_LENS as readonly string[]).includes(v);
}
