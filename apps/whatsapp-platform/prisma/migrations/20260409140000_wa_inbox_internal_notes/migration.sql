-- CreateTable
CREATE TABLE "wa_inbox_internal_notes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wa_inbox_internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wa_inbox_internal_notes_tenant_id_thread_id_created_at_idx" ON "wa_inbox_internal_notes"("tenant_id", "thread_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "wa_inbox_internal_notes" ADD CONSTRAINT "wa_inbox_internal_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_inbox_internal_notes" ADD CONSTRAINT "wa_inbox_internal_notes_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "wa_inbox_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_inbox_internal_notes" ADD CONSTRAINT "wa_inbox_internal_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "whatsapp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
