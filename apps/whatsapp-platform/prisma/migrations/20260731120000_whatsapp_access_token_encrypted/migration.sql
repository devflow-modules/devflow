-- SEC-1a: parallel encrypted Meta access token (nullable, no backfill, no data copy).
ALTER TABLE "whatsapp_phone_numbers" ADD COLUMN "access_token_encrypted" TEXT;
