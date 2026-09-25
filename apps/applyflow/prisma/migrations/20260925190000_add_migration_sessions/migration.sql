-- Additive only: durable V1→V2 migration session table.
-- Does not alter Job/Application identity, indexes, or cascading deletes.

-- CreateTable
CREATE TABLE "applyflow_migration_sessions" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "source_version" INTEGER NOT NULL,
    "bundle_fingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expected_jobs" INTEGER NOT NULL,
    "expected_applications" INTEGER NOT NULL,
    "processed_jobs" INTEGER NOT NULL DEFAULT 0,
    "processed_applications" INTEGER NOT NULL DEFAULT 0,
    "conflict_summary" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "applyflow_migration_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "applyflow_migration_sessions_account_source_fp_key" ON "applyflow_migration_sessions"("account_id", "source_version", "bundle_fingerprint");

-- CreateIndex
CREATE INDEX "applyflow_migration_sessions_account_id_status_idx" ON "applyflow_migration_sessions"("account_id", "status");

-- AddForeignKey
ALTER TABLE "applyflow_migration_sessions" ADD CONSTRAINT "applyflow_migration_sessions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "applyflow_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
