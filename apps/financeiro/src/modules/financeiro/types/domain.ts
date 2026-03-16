/**
 * Tipos de domínio do módulo financeiro.
 * Use para DTOs de UI, listagens e formas que não dependem diretamente do Prisma.
 */

export type MembershipRole = "OWNER" | "MEMBER";
export type SourceType = "PJ" | "PF";
export type ExpenseStatus = "PENDING" | "PAID" | "SCHEDULED";
export type IncomeStatus = "SCHEDULED" | "RECEIVED";
export type RuleType = "CATEGORY_PERCENTAGE" | "FIXED_PER_MEMBER";
export type CycleType = "MONTHLY" | "WEEKLY";

/** Item de membro para listagem (household members). */
export type MemberItem = {
  membershipId: string;
  userId: string;
  email: string;
  name: string | null;
  role: MembershipRole;
  createdAt: Date;
  isMe: boolean;
};

/** Item de alocação por regra (rules/allocations). */
export type AllocationItem = {
  sourceId: string;
  amount: number;
  share: number;
};

/** Resposta de rateio por regra. */
export type RuleAllocationResponse = {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  allocations: AllocationItem[];
};
