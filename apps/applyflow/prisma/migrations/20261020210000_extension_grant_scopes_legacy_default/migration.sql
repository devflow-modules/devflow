-- Compatibility for the pre-scopes Prisma writer, which INSERT omits "scopes".
-- The default is exactly the legacy profile/jobs/applications set.
-- It does not grant contacts and does not make the old binary enforce scopes.
-- New mints still persist the explicit validated list; they must not rely on this default.

ALTER TABLE "applyflow_extension_grants"
  ALTER COLUMN "scopes" SET DEFAULT ARRAY[
    'profile:read',
    'profile:write',
    'jobs:read',
    'jobs:write',
    'applications:read',
    'applications:write'
  ]::TEXT[];
