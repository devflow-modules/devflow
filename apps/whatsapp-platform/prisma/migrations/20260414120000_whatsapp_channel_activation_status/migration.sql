-- Renomear valor legado do enum (onboarding antigo)
ALTER TYPE "WhatsappPhoneNumberStatus" RENAME VALUE 'PENDING' TO 'PENDING_ACTIVATION';

-- Novo estado de erro operacional
ALTER TYPE "WhatsappPhoneNumberStatus" ADD VALUE 'ERROR';

-- Canal manual pode existir sem token até ativação
ALTER TABLE "whatsapp_phone_numbers" ALTER COLUMN "access_token" DROP NOT NULL;
