export type FinanceiroMonthlyTask = {
  id: string;
  title: string;
  completed: boolean;
  priority: number;
  cta: {
    label: string;
    href: string;
  };
};

export type FinanceiroMonthlyTaskInput = {
  now?: Date;
  incomes: { amount: number; receivedAt?: string | null }[];
  expenses: { amount: number; dueDate?: string | null; category?: string | null }[];
  rulesCount: number;
  activeMembershipRole: "OWNER" | "MEMBER" | null;
};
