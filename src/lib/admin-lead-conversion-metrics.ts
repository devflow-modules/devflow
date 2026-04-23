type GroupRow = { status: string; _count: { _all: number } };

export type FunnelStageKey =
  | "novo"
  | "contato_iniciado"
  | "respondeu"
  | "demo_enviada"
  | "negociacao"
  | "fechado"
  | "perdido";

export const FUNNEL_STAGE_KEYS: FunnelStageKey[] = [
  "novo",
  "contato_iniciado",
  "respondeu",
  "demo_enviada",
  "negociacao",
  "fechado",
  "perdido",
];

export type ConversionMetricsPayload = {
  total: number;
  novos: number;
  contatoIniciado: number;
  respondeu: number;
  demoEnviada: number;
  negociacao: number;
  fechados: number;
  perdidos: number;
  responseRate: number | null;
  demoRate: number | null;
  negotiationRate: number | null;
  closeRate: number | null;
  lossRate: number | null;
};

function n(map: Record<string, number>, key: string): number {
  return map[key] ?? 0;
}

/** Taxa 0–1 com 2 casas decimais; evita divisão inválida. */
export function roundRate2(rate: number | null): number | null {
  if (rate == null) return null;
  return Math.round(rate * 100) / 100;
}

function fromGroupRows(rows: GroupRow[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const r of rows) {
    m[r.status] = (m[r.status] ?? 0) + r._count._all;
  }
  return m;
}

/**
 * Converte o resultado de `groupBy` em contagens e taxas (defensivas; total=0 =&gt; taxas null).
 * Denominador: total de leads do cohort (soma de contagens por status).
 */
export function buildConversionMetricsFromGroupBy(rows: GroupRow[]): {
  byStatus: Record<string, number>;
  conversionMetrics: ConversionMetricsPayload;
  funnelStageCounts: Record<FunnelStageKey, number>;
} {
  const byStatus = fromGroupRows(rows);
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const safeRate = (num: number) => (total > 0 ? num / total : null);

  const c: ConversionMetricsPayload = {
    total,
    novos: n(byStatus, "novo"),
    contatoIniciado: n(byStatus, "contato_iniciado"),
    respondeu: n(byStatus, "respondeu"),
    demoEnviada: n(byStatus, "demo_enviada"),
    negociacao: n(byStatus, "negociacao"),
    fechados: n(byStatus, "fechado"),
    perdidos: n(byStatus, "perdido"),
    responseRate: roundRate2(safeRate(n(byStatus, "respondeu"))),
    demoRate: roundRate2(safeRate(n(byStatus, "demo_enviada"))),
    negotiationRate: roundRate2(safeRate(n(byStatus, "negociacao"))),
    closeRate: roundRate2(safeRate(n(byStatus, "fechado"))),
    lossRate: roundRate2(safeRate(n(byStatus, "perdido"))),
  };

  const funnelStageCounts: Record<FunnelStageKey, number> = {
    novo: c.novos,
    contato_iniciado: c.contatoIniciado,
    respondeu: c.respondeu,
    demo_enviada: c.demoEnviada,
    negociacao: c.negociacao,
    fechado: c.fechados,
    perdido: c.perdidos,
  };

  return { byStatus, conversionMetrics: c, funnelStageCounts };
}

export type { GroupRow };
