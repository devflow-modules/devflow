-- Auto-healing: tentativas e último timestamp
ALTER TABLE "whatsapp_phone_numbers"
ADD COLUMN IF NOT EXISTS "auto_heal_attempts" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "whatsapp_phone_numbers"
ADD COLUMN IF NOT EXISTS "last_auto_heal_at" TIMESTAMP(3);
