export type MembershipLike = { householdId: string };

export type ActiveHouseholdCookieDecision =
  | { action: "none"; activeHouseholdId: string | null }
  | { action: "set"; activeHouseholdId: string; cookieValue: string }
  | { action: "delete"; activeHouseholdId: null };

/**
 * Resolve a casa ativa a partir do cookie (se válido) e memberships.
 */
export function resolveActiveHousehold(args: {
  cookieHouseholdId: string | null;
  memberships: MembershipLike[];
}): ActiveHouseholdCookieDecision {
  const { cookieHouseholdId, memberships } = args;

  if (memberships.length === 0) {
    return { action: "delete", activeHouseholdId: null };
  }

  const cookieIsValid = !!(
    cookieHouseholdId &&
    memberships.some((m) => m.householdId === cookieHouseholdId)
  );
  if (cookieIsValid && cookieHouseholdId) {
    return { action: "none", activeHouseholdId: cookieHouseholdId };
  }

  const fallback = memberships[0]?.householdId ?? null;
  if (!fallback) return { action: "delete", activeHouseholdId: null };
  return { action: "set", activeHouseholdId: fallback, cookieValue: fallback };
}
