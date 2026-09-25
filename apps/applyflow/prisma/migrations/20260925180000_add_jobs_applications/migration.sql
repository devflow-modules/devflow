-- CreateTable
CREATE TABLE "applyflow_jobs" (
    "account_id" UUID NOT NULL,
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "location" TEXT,
    "url" TEXT,
    "canonical_url" TEXT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "job_context" JSONB NOT NULL,
    "description_snapshot" TEXT,
    "description_hash" TEXT,
    "job_match" JSONB NOT NULL,
    "evaluated_with" JSONB,
    "curriculum_recommendation" JSONB,
    "application_pack" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applyflow_jobs_pkey" PRIMARY KEY ("account_id","id")
);

-- CreateTable
CREATE TABLE "applyflow_applications" (
    "account_id" UUID NOT NULL,
    "id" TEXT NOT NULL,
    "source_job_id" TEXT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "job_title" TEXT,
    "company_name" TEXT,
    "job_url" TEXT,
    "fit_score" DOUBLE PRECISION,
    "notes" TEXT,
    "job_meta" JSONB,
    "v2_meta" JSONB,
    "extras" JSONB,
    "applied_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applyflow_applications_pkey" PRIMARY KEY ("account_id","id")
);

-- CreateIndex
CREATE INDEX "applyflow_jobs_account_id_canonical_url_idx" ON "applyflow_jobs"("account_id", "canonical_url");

-- CreateIndex
CREATE INDEX "applyflow_jobs_account_id_description_hash_idx" ON "applyflow_jobs"("account_id", "description_hash");

-- CreateIndex
CREATE INDEX "applyflow_applications_account_id_source_job_id_idx" ON "applyflow_applications"("account_id", "source_job_id");

-- AddForeignKey
ALTER TABLE "applyflow_jobs" ADD CONSTRAINT "applyflow_jobs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "applyflow_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applyflow_applications" ADD CONSTRAINT "applyflow_applications_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "applyflow_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- NOTE:
-- No FK from applyflow_applications(source_job_id) to applyflow_jobs.
-- PostgreSQL ON DELETE SET NULL on a composite FK (account_id, source_job_id)
-- would also NULL account_id and destroy ownership. Soft link + repository
-- nulls source_job_id only when a Job is deleted.
