-- E-mail transacional (Resend): registo operacional por envio

CREATE TYPE "EmailDeliveryStatus" AS ENUM ('SENT', 'FAILED');

CREATE TABLE "email_messages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT,
    "type" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "status" "EmailDeliveryStatus" NOT NULL,
    "error_code" TEXT,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_messages_tenant_id_created_at_idx" ON "email_messages"("tenant_id", "created_at");

CREATE INDEX "email_messages_user_id_created_at_idx" ON "email_messages"("user_id", "created_at");

CREATE INDEX "email_messages_type_created_at_idx" ON "email_messages"("type", "created_at");

ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "whatsapp_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
