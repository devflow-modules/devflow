/**
 * Read-only AF-REL-001 duplicate preflight.
 *
 * Reports groups where COUNT(*) > 1 for (accountId, sourceJobId)
 * with sourceJobId IS NOT NULL.
 *
 * NEVER deletes, unlinks, or mutates rows.
 */

export type SourceJobDuplicateGroup = {
  accountId: string;
  sourceJobId: string;
  count: number;
  applicationIds: string[];
};

export type SourceJobUniquenessPreflightResult = {
  duplicateGroupCount: number;
  duplicates: SourceJobDuplicateGroup[];
  mutated: false;
};

export type SourceJobPreflightRow = {
  accountId: string;
  id: string;
  sourceJobId: string | null;
};

/** Pure grouping used by MEMORY tests and Postgres raw-query adapters. */
export function findSourceJobDuplicateGroups(
  rows: readonly SourceJobPreflightRow[],
): SourceJobDuplicateGroup[] {
  const groups = new Map<string, { accountId: string; sourceJobId: string; applicationIds: string[] }>();
  for (const row of rows) {
    if (row.sourceJobId == null) continue;
    const key = `${row.accountId}::${row.sourceJobId}`;
    const existing = groups.get(key);
    if (existing) {
      existing.applicationIds.push(row.id);
    } else {
      groups.set(key, {
        accountId: row.accountId,
        sourceJobId: row.sourceJobId,
        applicationIds: [row.id],
      });
    }
  }
  return [...groups.values()]
    .filter((group) => group.applicationIds.length > 1)
    .map((group) => ({
      accountId: group.accountId,
      sourceJobId: group.sourceJobId,
      count: group.applicationIds.length,
      applicationIds: [...group.applicationIds].sort(),
    }))
    .sort((a, b) => {
      const byAccount = a.accountId.localeCompare(b.accountId);
      if (byAccount !== 0) return byAccount;
      return a.sourceJobId.localeCompare(b.sourceJobId);
    });
}

export function toSourceJobUniquenessPreflightResult(
  rows: readonly SourceJobPreflightRow[],
): SourceJobUniquenessPreflightResult {
  const duplicates = findSourceJobDuplicateGroups(rows);
  return {
    duplicateGroupCount: duplicates.length,
    duplicates,
    mutated: false,
  };
}

type PreflightQueryDb = {
  $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
};

/**
 * PostgreSQL read-only preflight. Uses only SELECT aggregations.
 * Does not require Prisma schema awareness of the partial unique index.
 */
export async function runSourceJobUniquenessPreflight(
  db: PreflightQueryDb,
): Promise<SourceJobUniquenessPreflightResult> {
  type AggRow = {
    account_id: string;
    source_job_id: string;
    cnt: bigint | number;
    application_ids: string[] | null;
  };

  const rows = await db.$queryRawUnsafe<AggRow[]>(
    `
    SELECT
      account_id,
      source_job_id,
      COUNT(*)::bigint AS cnt,
      array_agg(id ORDER BY id) AS application_ids
    FROM applyflow_applications
    WHERE source_job_id IS NOT NULL
    GROUP BY account_id, source_job_id
    HAVING COUNT(*) > 1
    ORDER BY account_id, source_job_id
    `,
  );

  const duplicates: SourceJobDuplicateGroup[] = rows.map((row) => ({
    accountId: String(row.account_id),
    sourceJobId: String(row.source_job_id),
    count: Number(row.cnt),
    applicationIds: Array.isArray(row.application_ids) ? row.application_ids.map(String) : [],
  }));

  return {
    duplicateGroupCount: duplicates.length,
    duplicates,
    mutated: false,
  };
}
