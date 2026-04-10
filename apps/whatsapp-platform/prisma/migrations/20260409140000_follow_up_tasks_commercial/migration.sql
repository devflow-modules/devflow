-- Automação comercial: follow-up, reativação, recuperação
CREATE TABLE "follow_up_tasks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "type" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "follow_up_tasks_tenant_id_scheduled_at_idx" ON "follow_up_tasks"("tenant_id", "scheduled_at");
CREATE INDEX "follow_up_tasks_executed_scheduled_at_idx" ON "follow_up_tasks"("executed", "scheduled_at");
CREATE INDEX "follow_up_tasks_conversation_id_executed_idx" ON "follow_up_tasks"("conversation_id", "executed");

ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "wa_inbox_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wa_inbox_threads" ADD COLUMN "needs_recovery" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "wa_inbox_threads" ADD COLUMN "commercial_msg_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "wa_inbox_threads" ADD COLUMN "last_commercial_msg_at" TIMESTAMP(3);
