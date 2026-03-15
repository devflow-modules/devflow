/**
 * Contratos de API e contextos compartilhados do módulo financeiro.
 * Respostas padronizadas vêm de lib/api-response (ApiSuccessPayload, ApiErrorPayload).
 */

export type { ApiSuccessPayload, ApiErrorPayload } from "@/modules/financeiro/lib/api-response";

/** Contexto de autenticação com casa ativa (rotas que exigem household). */
export type AuthHouseholdContext = {
  userId: string;
  householdId: string;
  email: string;
  membershipRole: "OWNER" | "MEMBER";
};

/** Contexto de sessão apenas (sem casa obrigatória). */
export type AuthSessionContext = {
  userId: string;
  email: string;
};

/** Parâmetros comuns de listagem (futuro: paginação, filtros). */
export type ListParams = {
  householdId: string;
};
