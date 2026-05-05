-- Canal: finalidade, override de auto-reply e perfil IA por linha (MVP multi-número).
CREATE TYPE "WhatsappChannelPurpose" AS ENUM ('GENERAL', 'SUPPORT', 'SALES', 'PROSPECTING', 'FINANCE');

ALTER TABLE "whatsapp_phone_numbers" ADD COLUMN "purpose" "WhatsappChannelPurpose" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "whatsapp_phone_numbers" ADD COLUMN "auto_reply_enabled" BOOLEAN;
ALTER TABLE "whatsapp_phone_numbers" ADD COLUMN "ai_profile_override" TEXT;
