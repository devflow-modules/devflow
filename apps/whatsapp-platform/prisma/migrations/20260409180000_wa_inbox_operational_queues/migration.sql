-- Filas operacionais da Inbox (fonte canónica Prisma) + vínculo em threads.

CREATE TABLE "wa_inbox_queues" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" VARCHAR(32),
    "sla_target_minutes" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wa_inbox_queues_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wa_inbox_queues_tenant_id_slug_key" ON "wa_inbox_queues"("tenant_id", "slug");
CREATE INDEX "wa_inbox_queues_tenant_id_idx" ON "wa_inbox_queues"("tenant_id");

ALTER TABLE "wa_inbox_queues" ADD CONSTRAINT "wa_inbox_queues_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "wa_inbox_queue_memberships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "queue_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wa_inbox_queue_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wa_inbox_queue_memberships_queue_id_user_id_key" ON "wa_inbox_queue_memberships"("queue_id", "user_id");
CREATE INDEX "wa_inbox_queue_memberships_tenant_id_user_id_idx" ON "wa_inbox_queue_memberships"("tenant_id", "user_id");
CREATE INDEX "wa_inbox_queue_memberships_queue_id_idx" ON "wa_inbox_queue_memberships"("queue_id");

ALTER TABLE "wa_inbox_queue_memberships" ADD CONSTRAINT "wa_inbox_queue_memberships_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wa_inbox_queue_memberships" ADD CONSTRAINT "wa_inbox_queue_memberships_queue_id_fkey"
  FOREIGN KEY ("queue_id") REFERENCES "wa_inbox_queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wa_inbox_queue_memberships" ADD CONSTRAINT "wa_inbox_queue_memberships_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "whatsapp_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wa_inbox_threads" ADD COLUMN "queue_id" TEXT;

CREATE INDEX "wa_inbox_threads_tenant_id_queue_id_idx" ON "wa_inbox_threads"("tenant_id", "queue_id");

ALTER TABLE "wa_inbox_threads" ADD CONSTRAINT "wa_inbox_threads_queue_id_fkey"
  FOREIGN KEY ("queue_id") REFERENCES "wa_inbox_queues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Alinha com Prisma: um registo de presença por utilizador (`user_id` único em `whatsapp_agent_status`).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'whatsapp_agent_status'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'whatsapp_agent_status_user_id_key'
    ) THEN
      CREATE UNIQUE INDEX "whatsapp_agent_status_user_id_key" ON "whatsapp_agent_status"("user_id");
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'whatsapp_agent_status_user_id_fkey'
    ) THEN
      ALTER TABLE "whatsapp_agent_status"
        ADD CONSTRAINT "whatsapp_agent_status_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "whatsapp_users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
