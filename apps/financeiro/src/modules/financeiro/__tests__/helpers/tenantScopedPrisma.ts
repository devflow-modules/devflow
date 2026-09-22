import { vi } from "vitest";

export type HouseholdRow = { id: string; householdId: string };

export type ParticipantRow = {
  id: string;
  accountId: string;
  householdId: string;
};

function requestedIds(idFilter: unknown): string[] | null {
  if (idFilter == null) return null;
  if (typeof idFilter === "string") return [idFilter];
  if (typeof idFilter === "object" && idFilter !== null && "in" in idFilter) {
    const list = (idFilter as { in: unknown }).in;
    return Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : [];
  }
  return [];
}

/**
 * Prisma-like findMany: tenant filter applies only when `where.householdId` is present.
 * Omitting householdId returns matching ids across households (insecure query).
 */
export function tenantFindMany(rows: HouseholdRow[]) {
  return vi.fn(async (args?: { where?: { householdId?: string; id?: unknown } }) => {
    const where = args?.where ?? {};
    const ids = requestedIds(where.id);
    return rows
      .filter((row) => {
        if (ids && !ids.includes(row.id)) return false;
        if (typeof where.householdId === "string" && row.householdId !== where.householdId) {
          return false;
        }
        return true;
      })
      .map((row) => ({ id: row.id }));
  });
}

export function tenantParticipantFindFirst(rows: ParticipantRow[]) {
  return vi.fn(
    async (args?: {
      where?: {
        id?: string;
        accountId?: string;
        account?: { householdId?: string };
      };
    }) => {
      const where = args?.where ?? {};
      const match = rows.find((row) => {
        if (where.id && row.id !== where.id) return false;
        if (where.accountId && row.accountId !== where.accountId) return false;
        const householdId = where.account?.householdId;
        if (typeof householdId === "string" && row.householdId !== householdId) return false;
        return true;
      });
      return match ? { id: match.id } : null;
    }
  );
}

export function createHouseholdRefPrisma(seed: {
  sources?: HouseholdRow[];
  accounts?: HouseholdRow[];
  categories?: HouseholdRow[];
  cycles?: HouseholdRow[];
  participants?: ParticipantRow[];
}) {
  return {
    source: { findMany: tenantFindMany(seed.sources ?? []) },
    account: { findMany: tenantFindMany(seed.accounts ?? []) },
    category: {
      findMany: tenantFindMany(seed.categories ?? []),
      findFirst: vi.fn(async (args?: { where?: { id?: string; householdId?: string }; select?: { name?: boolean } }) => {
        const where = args?.where ?? {};
        const row = (seed.categories ?? []).find((category) => {
          if (where.id && category.id !== where.id) return false;
          if (typeof where.householdId === "string" && category.householdId !== where.householdId) {
            return false;
          }
          return true;
        });
        if (!row) return null;
        return args?.select?.name ? { name: `Category ${row.id}` } : { id: row.id };
      }),
    },
    cycle: { findMany: tenantFindMany(seed.cycles ?? []) },
    accountParticipant: { findFirst: tenantParticipantFindFirst(seed.participants ?? []) },
  };
}
