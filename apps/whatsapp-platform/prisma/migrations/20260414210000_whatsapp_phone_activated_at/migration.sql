-- Primeira vez que o canal fica ACTIVE (auditoria de tempo de ativação).
ALTER TABLE "whatsapp_phone_numbers" ADD COLUMN IF NOT EXISTS "activated_at" TIMESTAMP(3);
