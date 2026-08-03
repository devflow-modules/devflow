-- SEC-1-final: remove legacy plaintext Meta access token column.
-- Encrypt-only at rest; access_token_encrypted remains nullable for PENDING_ACTIVATION.
ALTER TABLE "whatsapp_phone_numbers" DROP COLUMN IF EXISTS "access_token";
