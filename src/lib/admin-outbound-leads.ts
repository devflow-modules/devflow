/** Ordem comercial: menor = mais prioritário na listagem. */
export const OUTBOUND_LEAD_STATUS_PRIORITY: Record<string, number> = {
  negociacao: 0,
  demo_enviada: 1,
  respondeu: 2,
  contato_iniciado: 3,
  novo: 4,
  perdido: 5,
  fechado: 6,
};

/** Ordem sugerida para resumo e leitura do funil. */
export const OUTBOUND_LEAD_STATUS_DISPLAY_ORDER: string[] = [
  "negociacao",
  "demo_enviada",
  "respondeu",
  "contato_iniciado",
  "novo",
  "perdido",
  "fechado",
];

const DEFAULT_PRIORITY = 7;

function updatedAtTime(u: string | Date): number {
  return new Date(u).getTime();
}

export function sortOutboundLeadsByCommercialPriority<T extends { status: string; updatedAt: string | Date }>(
  leads: T[]
): T[] {
  return [...leads].sort((a, b) => {
    const pa = OUTBOUND_LEAD_STATUS_PRIORITY[a.status] ?? DEFAULT_PRIORITY;
    const pb = OUTBOUND_LEAD_STATUS_PRIORITY[b.status] ?? DEFAULT_PRIORITY;
    if (pa !== pb) return pa - pb;
    return updatedAtTime(b.updatedAt) - updatedAtTime(a.updatedAt);
  });
}
