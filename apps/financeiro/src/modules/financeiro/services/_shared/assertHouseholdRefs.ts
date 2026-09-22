import type { PrismaClient } from "@prisma/client";

/** Generic denial for a client-supplied FK missing from the session household. */
export const HOUSEHOLD_REF_NOT_FOUND = "HOUSEHOLD_REF_NOT_FOUND" as const;

export type HouseholdRefDenied = {
  ok: false;
  error: typeof HOUSEHOLD_REF_NOT_FOUND;
};

export type AssertHouseholdRefsResult = { ok: true } | HouseholdRefDenied;

export type HouseholdRefsToAssert = {
  sourceIds?: ReadonlyArray<string | null | undefined>;
  accountId?: string | null;
  categoryId?: string | null;
  cycleId?: string | null;
  /**
   * Must belong to `accountId` in this household.
   * Passing a participant without `accountId` is always denied.
   */
  paidByParticipantId?: string | null;
};

function uniqueNonEmptyIds(ids: ReadonlyArray<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0))];
}

function missingIds(requested: string[], found: Array<{ id: string }>): boolean {
  const present = new Set(found.map((row) => row.id));
  return requested.some((id) => !present.has(id));
}

export function isHouseholdRefDenied(value: unknown): value is HouseholdRefDenied {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    (value as { ok: unknown }).ok === false &&
    "error" in value &&
    (value as { error: unknown }).error === HOUSEHOLD_REF_NOT_FOUND
  );
}

const denied: HouseholdRefDenied = { ok: false, error: HOUSEHOLD_REF_NOT_FOUND };

/**
 * Authorization boundary for client-supplied foreign keys.
 * Every id must exist AND belong to `householdId` before any connect/write.
 */
export async function assertHouseholdRefs(
  prisma: PrismaClient,
  householdId: string,
  refs: HouseholdRefsToAssert
): Promise<AssertHouseholdRefsResult> {
  const sourceIds = uniqueNonEmptyIds(refs.sourceIds ?? []);
  const accountId = refs.accountId ? refs.accountId : null;
  const categoryId = refs.categoryId ? refs.categoryId : null;
  const cycleId = refs.cycleId ? refs.cycleId : null;
  const paidByParticipantId = refs.paidByParticipantId ? refs.paidByParticipantId : null;

  if (paidByParticipantId && !accountId) {
    return denied;
  }

  const [sources, accounts, categories, cycles, participant] = await Promise.all([
    sourceIds.length > 0
      ? prisma.source.findMany({
          where: { householdId, id: { in: sourceIds } },
          select: { id: true },
        })
      : Promise.resolve([]),
    accountId
      ? prisma.account.findMany({
          where: { householdId, id: accountId },
          select: { id: true },
        })
      : Promise.resolve([]),
    categoryId
      ? prisma.category.findMany({
          where: { householdId, id: categoryId },
          select: { id: true },
        })
      : Promise.resolve([]),
    cycleId
      ? prisma.cycle.findMany({
          where: { householdId, id: cycleId },
          select: { id: true },
        })
      : Promise.resolve([]),
    paidByParticipantId && accountId
      ? prisma.accountParticipant.findFirst({
          where: {
            id: paidByParticipantId,
            accountId,
            account: { householdId },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (missingIds(sourceIds, sources)) return denied;
  if (accountId && missingIds([accountId], accounts)) return denied;
  if (categoryId && missingIds([categoryId], categories)) return denied;
  if (cycleId && missingIds([cycleId], cycles)) return denied;
  if (paidByParticipantId && !participant) return denied;

  return { ok: true };
}
