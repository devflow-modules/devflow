-- AF-REL-001: at most one Application per (account_id, source_job_id)
-- when source_job_id IS NOT NULL.
--
-- Prisma 6 cannot express partial unique indexes in schema.prisma.
-- This raw SQL migration is the authoritative correctness boundary.
-- Application-level findBySourceJobId remains UX / fast-path only.
--
-- NULL source_job_id rows are intentionally excluded so multiple
-- standalone Applications remain allowed for the same account.
-- Cross-account pairs with the same source_job_id remain allowed.
--
-- SAFETY: never auto-delete or pick a winner. If duplicates already
-- exist, refuse the index and require explicit operator remediation.

DO $$
DECLARE
  dup_groups integer;
BEGIN
  SELECT COUNT(*)::integer INTO dup_groups
  FROM (
    SELECT 1
    FROM "applyflow_applications"
    WHERE "source_job_id" IS NOT NULL
    GROUP BY "account_id", "source_job_id"
    HAVING COUNT(*) > 1
  ) AS duplicate_groups;

  IF dup_groups > 0 THEN
    RAISE EXCEPTION
      'AF-REL-001 preflight refused: % duplicate (account_id, source_job_id) group(s) exist. Operator must remediate manually before applying the unique index. Never auto-DELETE or silently choose a winner. Re-run migrate after cleanup.',
      dup_groups;
  END IF;
END $$;

-- Replace non-unique lookup index with a partial unique index.
-- Partial unique still supports findBySourceJobId lookups (non-null).
DROP INDEX IF EXISTS "applyflow_applications_account_id_source_job_id_idx";

CREATE UNIQUE INDEX "applyflow_applications_account_id_source_job_id_uidx"
ON "applyflow_applications" ("account_id", "source_job_id")
WHERE "source_job_id" IS NOT NULL;
