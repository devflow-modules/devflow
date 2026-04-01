export type FinanceiroInsightSeverity = "warning" | "info" | "opportunity";

export type FinanceiroInsight = {
  id: string;
  type: FinanceiroInsightSeverity;
  title: string;
  description: string;
  priority: number;
  cta: {
    label: string;
    href: string;
  };
};

export type FinanceiroInsightInput = {
  /** Data de referência (mês “atual” do painel) */
  now?: Date;
  incomes: { amount: number; receivedAt?: string | null }[];
  expenses: { amount: number; dueDate?: string | null; category?: string | null }[];
  rulesCount: number;
  activeMembershipRole: "OWNER" | "MEMBER" | null;
  /**
   * Série mensal (últimos meses), mais recente por último — para comparar gastos.
   * Ex.: API /api/dashboard/summary
   */
  summarySeries?: { label: string; incomes: number; expenses: number; balance: number }[];
};
