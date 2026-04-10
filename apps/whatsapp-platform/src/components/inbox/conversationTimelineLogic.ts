import type { WaInboxMessageRow } from "./inboxTypes";
import { getOutboundKindFromMessage } from "./messageOutboundKind";

export type TimelineRow =
  | { kind: "inbound"; time: string; preview: string }
  | { kind: "outbound_ai"; time: string }
  | { kind: "outbound_automation"; time: string; sub: "followup" | "generic" }
  | { kind: "outbound_agent"; time: string };

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function previewText(m: WaInboxMessageRow): string {
  const t = m.contentText?.trim();
  if (!t) return "(mensagem)";
  return t.length > 48 ? `${t.slice(0, 45)}…` : t;
}

/**
 * Constrói linhas de resumo operacional a partir das mensagens já carregadas (sem API extra).
 */
export function buildOperationalTimelineRows(messages: WaInboxMessageRow[]): TimelineRow[] {
  const sorted = [...messages].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  const out: TimelineRow[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i];
    const time = formatTime(m.ts);
    if (m.direction === "INBOUND") {
      out.push({ kind: "inbound", time, preview: previewText(m) });
      continue;
    }
    const kind = getOutboundKindFromMessage(m);
    if (kind === "ai") {
      out.push({ kind: "outbound_ai", time });
      continue;
    }
    if (kind === "automation") {
      let sub: "followup" | "generic" = "generic";
      if (i > 0) {
        const prev = sorted[i - 1];
        const gap = new Date(m.ts).getTime() - new Date(prev.ts).getTime();
        if (gap > 10 * 60_000) sub = "followup";
      }
      out.push({ kind: "outbound_automation", time, sub });
      continue;
    }
    out.push({ kind: "outbound_agent", time });
  }

  if (out.length > 24) return out.slice(-24);
  return out;
}

export function timelineRowLabel(row: TimelineRow): string {
  switch (row.kind) {
    case "inbound":
      return `Cliente: “${row.preview}”`;
    case "outbound_ai":
      return "IA respondeu automaticamente";
    case "outbound_automation":
      return row.sub === "followup" ? "Follow-up enviado" : "Automação enviou mensagem";
    case "outbound_agent":
      return "Agente respondeu";
    default:
      return "";
  }
}
