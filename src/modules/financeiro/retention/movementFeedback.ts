import { recordRetentionLastEntryDay } from "./retentionStorage";
import { trackFinanceiroScoreImproved } from "@/lib/analytics";

type FinalizeOpts = {
  householdId: string;
  prevScore: number;
  nextScore: number;
  now?: Date;
};

/** Grava dia de atividade + analytics quando o score sobe após novo lançamento. */
export function finalizeRetentionAfterCreate(opts: FinalizeOpts): void {
  const now = opts.now ?? new Date();
  recordRetentionLastEntryDay(opts.householdId, now);
  const delta = opts.nextScore - opts.prevScore;
  if (delta > 0) {
    trackFinanceiroScoreImproved({
      delta,
      from: opts.prevScore,
      to: opts.nextScore,
      surface: "expenses_page",
    });
  }
}

/** Texto curto para combinar com toast principal (receita/despesa cadastrada). */
export function retentionMovementDescription(prevScore: number, nextScore: number): string {
  const delta = nextScore - prevScore;
  if (delta > 0) {
    return `+${delta}% de organização — seu mês ficou mais completo`;
  }
  return "Você está mais próximo de fechar o mês";
}
