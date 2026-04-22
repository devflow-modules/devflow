-- Meta Business Verification (operational layer on whatsapp_phone_numbers)

CREATE TYPE "MetaBusinessVerificationStatus" AS ENUM (
  'NOT_STARTED',
  'READY_FOR_SUBMISSION',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED'
);

ALTER TABLE "whatsapp_phone_numbers"
  ADD COLUMN "verification_status" "MetaBusinessVerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "verification_checklist" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "verification_checklist_updated_at" TIMESTAMP(3),
  ADD COLUMN "verification_ready_at" TIMESTAMP(3),
  ADD COLUMN "verification_submitted_at" TIMESTAMP(3),
  ADD COLUMN "verification_approved_at" TIMESTAMP(3),
  ADD COLUMN "verification_rejected_at" TIMESTAMP(3);
