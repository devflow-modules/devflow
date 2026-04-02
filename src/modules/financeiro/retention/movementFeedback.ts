import { calendarDayFromDate, recordFinanceiroMovementLocalDay } from "./retentionStorage";
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
  recordFinanceiroMovementLocalDay(opts.householdId, calendarDayFromDate(now));
  const delta = opts.nextScore - opts.prevScore;
  if (delta > 0) {
    trackFinanceiroScoreImproved({
      from_score: opts.prevScore,
      to_score: opts.nextScore,
      delta,
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
