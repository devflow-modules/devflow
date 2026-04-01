import type { AuthHouseholdContext } from "@/modules/financeiro/types";

/**
 * Contexto completo de auth retornado pela camada de app (requireHouseholdMembership).
 * Services recebem apenas o que precisam (userId, householdId, role, email).
 */
export type AuthContext = AuthHouseholdContext & {
  membershipId: string;
  supabaseId: string;
};

export type { AuthHouseholdContext, AuthSessionContext } from "@/modules/financeiro/types";
