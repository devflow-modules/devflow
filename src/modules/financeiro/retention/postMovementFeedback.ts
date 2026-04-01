import { trackFinanceiroScoreDeclined, trackFinanceiroScoreImproved } from "@/lib/analytics";
import { getFinanceiroHealthScore } from "@/modules/financeiro/health/getFinanceiroHealthScore";
import {
  readRetentionStoredScore,
  recordFinanceiroMovementLocalDay,
  writeRetentionStoredScore,
} from "./retentionStorage";
import { localDateOnly } from "./localDateOnly";

type MinimalIncome = { amount: number; receivedAt?: string | null };
type MinimalExpense = { amount: number; dueDate?: string | null; category?: string | null };

export type FinanceiroPostMovementRetention = {
  newScore: number;
  prevScore: number | null;
  improved: boolean;
  declined: boolean;
};

/**
 * Atualiza armazenamento local de retenção e score de referência.
 * Não exibe toast — o chamador monta uma única mensagem.
 */
export async function refreshFinanceiroRetentionAfterMovement(input: {
  householdId: string;
  incomes: MinimalIncome[];
  expenses: MinimalExpense[];
  activeMembershipRole: "OWNER" | "MEMBER" | null;
}): Promise<FinanceiroPostMovementRetention> {
  const now = new Date();
  const today = localDateOnly(now);
  recordFinanceiroMovementLocalDay(input.householdId, today);

  let rulesCount = 0;
  try {
    const res = await fetch("/api/rules");
    const payload = await res.json();
    rulesCount = Array.isArray(payload.data) ? payload.data.length : 0;
  } catch {
    rulesCount = 0;
  }

  const result = getFinanceiroHealthScore({
    now,
    incomes: input.incomes,
    expenses: input.expenses,
    rulesCount,
    activeMembershipRole: input.activeMembershipRole,
  });

  const prev = readRetentionStoredScore(input.householdId);
  writeRetentionStoredScore(input.householdId, result.score);

  const improved = prev != null && result.score > prev;
  const declined = prev != null && result.score < prev;

  if (improved) {
    trackFinanceiroScoreImproved({
      from_score: prev,
      to_score: result.score,
      delta: result.score - prev,
    });
  }
  if (declined) {
    trackFinanceiroScoreDeclined({
      from_score: prev,
      to_score: result.score,
      delta: prev - result.score,
    });
  }

  return {
    newScore: result.score,
    prevScore: prev,
    improved,
    declined,
  };
}

export type MovementToastAction = "income_added" | "expense_added";

const ACTION_LABEL: Record<MovementToastAction, string> = {
  income_added: "Receita adicionada",
  expense_added: "Despesa adicionada",
};

/** Uma única string para toast após criar movimentação. */
export function buildUnifiedMovementToastMessage(
  action: MovementToastAction,
  r: FinanceiroPostMovementRetention
): { message: string; variant: "success" | "warning" } {
  const base = ACTION_LABEL[action];
  if (r.prevScore == null) {
    return { message: base, variant: "success" };
  }
  if (r.improved) {
    const delta = r.newScore - r.prevScore;
    return {
      message: `${base}. +${delta}% — seu mês está mais organizado`,
      variant: "success",
    };
  }
  if (r.declined) {
    return {
      message: `${base}. Seu score caiu — pode valer revisar seus lançamentos.`,
      variant: "warning",
    };
  }
  return {
    message: `${base}. Seu mês segue atualizado.`,
    variant: "success",
  };
}
