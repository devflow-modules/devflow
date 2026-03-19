-- Inbox multi-tenant (Cloud API mirror)

CREATE TYPE "WaInboxThreadStatus" AS ENUM ('OPEN', 'CLOSED', 'PENDING');
CREATE TYPE "WaInboxDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "WaInboxMsgType" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'DOCUMENT', 'UNKNOWN');
CREATE TYPE "WaInboxDeliveryStatus" AS ENUM ('RECEIVED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

CREATE TABLE "wa_inbox_threads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "contact_name" TEXT,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_preview" VARCHAR(512),
    "status" "WaInboxThreadStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wa_inbox_threads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wa_inbox_threads_tenant_id_phone_number_key" ON "wa_inbox_threads"("tenant_id", "phone_number");
CREATE INDEX "wa_inbox_threads_tenant_id_last_message_at_idx" ON "wa_inbox_threads"("tenant_id", "last_message_at" DESC);

ALTER TABLE "wa_inbox_threads" ADD CONSTRAINT "wa_inbox_threads_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "wa_inbox_messages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "wa_message_id" TEXT NOT NULL,
    "direction" "WaInboxDirection" NOT NULL,
    "from_number" TEXT NOT NULL,
    "to_number" TEXT NOT NULL,
    "message_type" "WaInboxMsgType" NOT NULL,
    "content_text" TEXT,
    "content_json" JSONB,
    "ts" TIMESTAMP(3) NOT NULL,
    "status" "WaInboxDeliveryStatus" NOT NULL,
    "error_code" TEXT,
    "error_message" VARCHAR(2000),
    "raw_payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_inbox_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wa_inbox_messages_tenant_id_wa_message_id_key" ON "wa_inbox_messages"("tenant_id", "wa_message_id");
CREATE INDEX "wa_inbox_messages_tenant_id_thread_id_ts_idx" ON "wa_inbox_messages"("tenant_id", "thread_id", "ts");

ALTER TABLE "wa_inbox_messages" ADD CONSTRAINT "wa_inbox_messages_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wa_inbox_messages" ADD CONSTRAINT "wa_inbox_messages_thread_id_fkey"
  FOREIGN KEY ("thread_id") REFERENCES "wa_inbox_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "wa_inbox_status_history" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "status" "WaInboxDeliveryStatus" NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_inbox_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "wa_inbox_status_history_tenant_id_message_id_ts_idx" ON "wa_inbox_status_history"("tenant_id", "message_id", "ts");

ALTER TABLE "wa_inbox_status_history" ADD CONSTRAINT "wa_inbox_status_history_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wa_inbox_status_history" ADD CONSTRAINT "wa_inbox_status_history_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "wa_inbox_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
