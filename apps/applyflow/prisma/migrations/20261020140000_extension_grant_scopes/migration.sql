-- Additive: explicit extension grant scopes.
-- Existing grants receive the legacy profile/jobs/applications set only.
-- Contacts scopes are never backfilled — they require an explicit reconnect mint.

ALTER TABLE "applyflow_extension_grants"
  ADD COLUMN "scopes" TEXT[];

UPDATE "applyflow_extension_grants"
SET "scopes" = ARRAY[
  'profile:read',
  'profile:write',
  'jobs:read',
  'jobs:write',
  'applications:read',
  'applications:write'
]::TEXT[]
WHERE "scopes" IS NULL;

ALTER TABLE "applyflow_extension_grants"
  ALTER COLUMN "scopes" SET NOT NULL;
