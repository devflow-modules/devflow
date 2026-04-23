import { daysSinceLastContactAt } from "@/lib/admin-lead-stale";

export type LeadActionUrgency = "low" | "medium" | "high";

export type LeadActionState = {
  needsFollowUp: boolean;
  urgency: LeadActionUrgency;
  reason: string;
};

export type SuggestedActionType = "contact" | "followup" | "demo" | "close" | "none";

export type SuggestedAction = {
  label: string;
  type: SuggestedActionType;
};

export type LeadForActionInput = {
  status: string;
  lastContactAt: string | Date | null | undefined;
  name?: string | null;
  company?: string | null;
  phone?: string;
  id?: string;
};

const TERMINAL: Record<string, string> = {
  fechado: "Ganho / concluído",
  ganho: "Ganho / concluído",
  pausado: "Em pausa",
  perdido: "Perdido (reengajamento opcional)",
};

/**
 * Janela mínima (dias desde o último contato) para exigir follow-up por estágio.
 */
function minDaysSinceForFollowUpStatus(status: string): number | null {
  if (status === "demo_enviada") return 2;
  if (status === "respondeu") return 1;
  if (status === "contato_iniciado") return 2;
  return null;
}

function urgencyOverThreshold(daysSince: number, minDays: number): LeadActionUrgency {
  const over = daysSince - minDays;
  if (over <= 0) return "low";
  if (over <= 2) return "medium";
  return "high";
}

/**
 * Tarefa automática (derivada na leitura) — sem persistência.
 */
export function getLeadActionState(lead: LeadForActionInput, now: Date = new Date()): LeadActionState {
  const s = (lead.status ?? "").trim();
  if (s === "fechado" || s === "ganho" || s === "pausado") {
    return { needsFollowUp: false, urgency: "low", reason: TERMINAL[s] ?? "Concluído" };
  }
  if (s === "perdido") {
    return { needsFollowUp: false, urgency: "low", reason: TERMINAL.perdido };
  }

  if (lead.lastContactAt == null) {
    return {
      needsFollowUp: true,
      urgency: "high",
      reason: "Nunca contatado",
    };
  }

  const days = daysSinceLastContactAt(lead.lastContactAt, now);
  if (days == null) {
    return { needsFollowUp: true, urgency: "high", reason: "Data de contato inválida" };
  }

  const minD = minDaysSinceForFollowUpStatus(s);
  if (minD == null) {
    return { needsFollowUp: false, urgency: "low", reason: "Sem lembrete automático para este estágio" };
  }

  if (days < minD) {
    return { needsFollowUp: false, urgency: "low", reason: "Dentro da janela" };
  }

  return {
    needsFollowUp: true,
    urgency: urgencyOverThreshold(days, minD),
    reason:
      s === "demo_enviada"
        ? "Demo enviada — retomar contato"
        : s === "respondeu"
          ? "Respondeu — acompanhar"
          : s === "contato_iniciado"
            ? "Contato iniciado — sem retorno recente"
            : "Acompanhar contato",
  };
}

/**
 * Próxima ação sugerida para a operação (independente de tarefa automática).
 */
export function getSuggestedAction(lead: LeadForActionInput, pre?: LeadActionState): SuggestedAction {
  const st = (lead.status ?? "").trim();
  const action = pre ?? getLeadActionState(lead);

  if (st === "fechado" || st === "ganho" || st === "pausado") {
    return { label: "Nenhuma ação", type: "none" };
  }
  if (st === "perdido") {
    return { label: "Reengajar (opcional)", type: "contact" };
  }
  if (st === "novo") {
    return { label: "Iniciar contato", type: "contact" };
  }
  if (st === "contato_iniciado") {
    if (lead.lastContactAt == null) {
      return { label: "Follow-up", type: "followup" };
    }
    return action.needsFollowUp
      ? { label: "Follow-up", type: "followup" }
      : { label: "Aguardar resposta", type: "followup" };
  }
  if (st === "respondeu") {
    return { label: "Enviar demo", type: "demo" };
  }
  if (st === "demo_enviada") {
    return { label: "Fazer follow-up", type: "followup" };
  }
  if (st === "negociacao") {
    return { label: "Fechar cliente", type: "close" };
  }
  if (st === "qualificado" || st === "reuniao") {
    return { label: "Acompanhar oportunidade", type: "followup" };
  }
  return { label: "Acompanhar", type: "followup" };
}

const URG_ORDER: Record<LeadActionUrgency, number> = { high: 3, medium: 2, low: 1 };

function leadSortKey(lead: LeadForActionInput & { name?: string | null; company?: string | null; phone?: string; id?: string }) {
  return (lead.name ?? lead.company ?? lead.phone ?? lead.id ?? "").toString();
}

/**
 * Compara prioridade (urgência) e, em seguida, nome/empresa para lista estável.
 */
export function compareLeadsForActionList(
  a: LeadForActionInput & { leadActionState: LeadActionState; name?: string | null; company?: string | null; phone?: string; id?: string },
  b: LeadForActionInput & { leadActionState: LeadActionState; name?: string | null; company?: string | null; phone?: string; id?: string }
): number {
  const du = URG_ORDER[b.leadActionState.urgency] - URG_ORDER[a.leadActionState.urgency];
  if (du !== 0) return du;
  return leadSortKey(a).localeCompare(leadSortKey(b), "pt-BR");
}

type EnrichedForAction = LeadForActionInput & {
  leadActionState: LeadActionState;
  name?: string | null;
  company?: string | null;
  phone?: string;
  id?: string;
};

/**
 * A partir de leads já enriquecidos com `leadActionState` (um único cálculo na API).
 */
export function pickActionListWithState<T extends EnrichedForAction>(enriched: T[]): T[] {
  return [...enriched].filter((l) => l.leadActionState.needsFollowUp).sort(compareLeadsForActionList);
}

/**
 * Leads com `needsFollowUp` (lista operacional do dia), ordenada por prioridade.
 */
export function getTodayActionList<T extends LeadForActionInput & { name?: string | null; company?: string | null }>(
  leads: T[],
  now: Date = new Date()
): T[] {
  const withState = leads
    .map((l) => {
      const st = getLeadActionState(l, now);
      return { lead: l, st };
    })
    .filter(({ st }) => st.needsFollowUp);

  withState.sort((a, b) => {
    const du = URG_ORDER[b.st.urgency] - URG_ORDER[a.st.urgency];
    if (du !== 0) return du;
    return leadSortKey(a.lead).localeCompare(leadSortKey(b.lead), "pt-BR");
  });

  return withState.map((x) => x.lead);
}
