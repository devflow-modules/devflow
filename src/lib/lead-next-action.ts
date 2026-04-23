import { daysSinceLastContactAt } from "@/lib/admin-lead-stale";

/**
 * Próxima ação comercial (NBA) — regras human-in-the-loop, sem automação.
 */
export type LeadActionType =
  | "first_contact"
  | "qualify"
  | "send_demo"
  | "follow_up"
  | "handoff"
  | "close"
  | "none";

export type NextActionResult = {
  type: LeadActionType;
  label: string;
  priority: "low" | "medium" | "high";
};

export type LeadForNextAction = {
  status: string;
  name?: string | null;
  company?: string | null;
  lastContactAt?: string | Date | null;
  nextFollowUpAt?: string | Date | null;
  /** Com conversa: `negociacao` tende a fecho; sem: handoff. */
  conversationRef?: string | null;
};

const TERMINAL: ReadonlySet<string> = new Set([
  "fechado",
  "ganho",
  "perdido",
  "pausado",
]);

function toDate(v: string | Date | null | undefined): Date | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Mapeia status → ação e rótulo base; a prioridade é ajustada depois.
 */
export function getNextAction(lead: LeadForNextAction, now: Date = new Date()): NextActionResult {
  const s = (lead.status ?? "").trim();
  if (TERMINAL.has(s)) {
    if (s === "perdido") {
      return { type: "none", label: "Sem ação (perdido)", priority: "low" };
    }
    return { type: "none", label: "Sem ação (encerrado)", priority: "low" };
  }

  let type: LeadActionType = "none";
  let label = "Acompanhar";

  switch (s) {
    case "novo":
      type = "first_contact";
      label = "Primeiro contato";
      break;
    case "contato_iniciado":
      type = "qualify";
      label = "Qualificar interesse";
      break;
    case "respondeu":
      type = "send_demo";
      label = "Enviar demonstração";
      break;
    case "demo_enviada":
      type = "follow_up";
      label = "Follow-up pós-demo";
      break;
    case "negociacao": {
      const inOfficialFlow = Boolean(lead.conversationRef?.trim());
      if (inOfficialFlow) {
        type = "close";
        label = "Fechar / converter";
      } else {
        type = "handoff";
        label = "Handoff (alinhar fechamento)";
      }
      break;
    }
    case "qualificado":
      type = "follow_up";
      label = "Aprofundar qualificação";
      break;
    case "reuniao":
      type = "follow_up";
      label = "Confirmar reunião / próximos passos";
      break;
    default:
      type = "follow_up";
      label = "Acompanhar pipeline";
  }

  const nfu = toDate(lead.nextFollowUpAt);
  const last = toDate(lead.lastContactAt);
  const nfuOverdue = nfu != null && nfu < now;
  const neverContacted = last == null;
  const days = last != null ? daysSinceLastContactAt(last, now) : null;
  const demoStale = s === "demo_enviada" && days != null && days > 2;

  let priority: "low" | "medium" | "high" = "medium";

  if (nfuOverdue || neverContacted || demoStale) {
    priority = "high";
  } else if (s === "demo_enviada" && (days == null || days <= 2)) {
    priority = "low";
  } else if (s === "contato_iniciado" && days != null && days >= 2) {
    priority = "medium";
  }

  return { type, label, priority };
}
