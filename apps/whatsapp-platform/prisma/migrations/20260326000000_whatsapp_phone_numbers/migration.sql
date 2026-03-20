-- WhatsappPhoneNumber: multi-tenant embedded signup — um número por tenant/instalação
CREATE TYPE "WhatsappPhoneNumberStatus" AS ENUM ('PENDING', 'ACTIVE');

CREATE TABLE "whatsapp_phone_numbers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "phone_number_id" TEXT NOT NULL,
    "display_phone_number" TEXT,
    "waba_id" TEXT,
    "access_token" TEXT NOT NULL,
    "business_id" TEXT,
    "status" "WhatsappPhoneNumberStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_phone_numbers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_phone_numbers_phone_number_id_key" ON "whatsapp_phone_numbers"("phone_number_id");
CREATE INDEX "whatsapp_phone_numbers_tenant_id_idx" ON "whatsapp_phone_numbers"("tenant_id");
CREATE INDEX "whatsapp_phone_numbers_phone_number_id_idx" ON "whatsapp_phone_numbers"("phone_number_id");

ALTER TABLE "whatsapp_phone_numbers" ADD CONSTRAINT "whatsapp_phone_numbers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
