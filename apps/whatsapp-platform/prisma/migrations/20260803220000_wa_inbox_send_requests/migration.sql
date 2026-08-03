-- CreateEnum
CREATE TYPE "WaInboxSendRequestStatus" AS ENUM ('PENDING', 'SENDING', 'META_ACCEPTED', 'COMPLETED', 'FAILED_PRE_META');

-- CreateTable
CREATE TABLE "wa_inbox_send_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "client_request_id" VARCHAR(128) NOT NULL,
    "text" TEXT NOT NULL,
    "status" "WaInboxSendRequestStatus" NOT NULL,
    "wa_message_id" VARCHAR(256),
    "last_error" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wa_inbox_send_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wa_inbox_send_requests_tenant_id_thread_id_idx" ON "wa_inbox_send_requests"("tenant_id", "thread_id");

-- CreateIndex
CREATE UNIQUE INDEX "wa_inbox_send_requests_tenant_id_client_request_id_key" ON "wa_inbox_send_requests"("tenant_id", "client_request_id");

-- AddForeignKey
ALTER TABLE "wa_inbox_send_requests" ADD CONSTRAINT "wa_inbox_send_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
