-- Additive only: account-scoped Persistence V2 pilot + canonical state.
-- Does not alter Job/Application/MigrationSession rows, FKs, or ownership.
-- Existing accounts receive: pilot_eligible=false, canonical_persistence=v1_local.

-- CreateEnum
CREATE TYPE "ApplyFlowCanonicalPersistence" AS ENUM ('v1_local', 'v2_cloud');

-- AlterTable
ALTER TABLE "applyflow_accounts" ADD COLUMN "pilot_eligible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "applyflow_accounts" ADD COLUMN "canonical_persistence" "ApplyFlowCanonicalPersistence" NOT NULL DEFAULT 'v1_local';
