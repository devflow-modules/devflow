/** Motivos de perda normalizados (analytics / IA / scripts). */
export const DEAL_LOST_REASONS = [
  "preco",
  "sem_interesse",
  "sem_resposta",
  "concorrente",
  "outro",
] as const;

export type DealLostReason = (typeof DEAL_LOST_REASONS)[number];

const LOST_SET = new Set<string>(DEAL_LOST_REASONS);

export function isDealLostReason(value: string | null | undefined): value is DealLostReason {
  return value != null && LOST_SET.has(value);
}

export const DEAL_LOST_REASON_LABELS: Record<DealLostReason, string> = {
  preco: "Preço",
  sem_interesse: "Sem interesse",
  sem_resposta: "Sem resposta",
  concorrente: "Concorrente",
  outro: "Outro",
};
