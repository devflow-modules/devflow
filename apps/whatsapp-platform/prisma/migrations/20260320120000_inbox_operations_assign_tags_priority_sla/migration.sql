-- Inbox operations: assign, priority, SLA timestamps, tags

CREATE TYPE "WaInboxThreadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

ALTER TABLE "wa_inbox_threads" ADD COLUMN "priority" "WaInboxThreadPriority" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "wa_inbox_threads" ADD COLUMN "assigned_to_user_id" TEXT;
ALTER TABLE "wa_inbox_threads" ADD COLUMN "last_customer_message_at" TIMESTAMP(3);
ALTER TABLE "wa_inbox_threads" ADD COLUMN "last_agent_reply_at" TIMESTAMP(3);
ALTER TABLE "wa_inbox_threads" ADD COLUMN "first_response_at" TIMESTAMP(3);

CREATE INDEX "wa_inbox_threads_tenant_id_status_idx" ON "wa_inbox_threads"("tenant_id", "status");
CREATE INDEX "wa_inbox_threads_tenant_id_assigned_to_user_id_idx" ON "wa_inbox_threads"("tenant_id", "assigned_to_user_id");

ALTER TABLE "wa_inbox_threads" ADD CONSTRAINT "wa_inbox_threads_assigned_to_user_id_fkey"
  FOREIGN KEY ("assigned_to_user_id") REFERENCES "whatsapp_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "wa_inbox_tags" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" VARCHAR(32) NOT NULL DEFAULT '#6b7280',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_inbox_tags_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "wa_inbox_tags_tenant_id_idx" ON "wa_inbox_tags"("tenant_id");

ALTER TABLE "wa_inbox_tags" ADD CONSTRAINT "wa_inbox_tags_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "wa_inbox_thread_tags" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_inbox_thread_tags_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "wa_inbox_thread_tags_tenant_id_thread_id_idx" ON "wa_inbox_thread_tags"("tenant_id", "thread_id");
CREATE INDEX "wa_inbox_thread_tags_tenant_id_tag_id_idx" ON "wa_inbox_thread_tags"("tenant_id", "tag_id");

CREATE UNIQUE INDEX "wa_inbox_thread_tags_thread_id_tag_id_key" ON "wa_inbox_thread_tags"("thread_id", "tag_id");

ALTER TABLE "wa_inbox_thread_tags" ADD CONSTRAINT "wa_inbox_thread_tags_thread_id_fkey"
  FOREIGN KEY ("thread_id") REFERENCES "wa_inbox_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wa_inbox_thread_tags" ADD CONSTRAINT "wa_inbox_thread_tags_tag_id_fkey"
  FOREIGN KEY ("tag_id") REFERENCES "wa_inbox_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
