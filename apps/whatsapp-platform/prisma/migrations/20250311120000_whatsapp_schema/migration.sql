-- WhatsApp schema: create tables if not exist, add new columns to existing tables.
-- Safe to run on shared DB (only whatsapp_* tables).

-- CreateTable whatsapp_tenants (skip if exists; then add columns if table existed)
CREATE TABLE IF NOT EXISTS "whatsapp_tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "whatsapp_phone" TEXT,
    "system_prompt" TEXT,
    "default_prompt" TEXT,
    "business_type" TEXT,
    "phone_number_id" TEXT,
    "display_phone_number" TEXT,
    "access_token" TEXT,
    "api_key" TEXT,
    "subdomain" TEXT,
    "stripe_customer_id" TEXT,
    "plan" TEXT,
    "active_until" TIMESTAMP(3),
    "ai_driver" TEXT,
    "crm_webhook_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_tenants_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "whatsapp_tenants" ADD COLUMN IF NOT EXISTS "default_prompt" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "whatsapp_tenants" ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "whatsapp_tenants" ADD COLUMN IF NOT EXISTS "plan" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "whatsapp_tenants" ADD COLUMN IF NOT EXISTS "active_until" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "whatsapp_tenants" ADD COLUMN IF NOT EXISTS "ai_driver" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "whatsapp_tenants" ADD COLUMN IF NOT EXISTS "crm_webhook_url" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
ALTER TABLE "whatsapp_tenants" ALTER COLUMN "phone_number_id" DROP NOT NULL;
ALTER TABLE "whatsapp_tenants" ALTER COLUMN "access_token" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_tenants_phone_number_id_key" ON "whatsapp_tenants"("phone_number_id");
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_tenants_api_key_key" ON "whatsapp_tenants"("api_key");
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_tenants_subdomain_key" ON "whatsapp_tenants"("subdomain");

CREATE TABLE IF NOT EXISTS "whatsapp_users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_users_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "whatsapp_users_tenant_id_idx" ON "whatsapp_users"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_users_email_key" ON "whatsapp_users"("email");
CREATE INDEX IF NOT EXISTS "whatsapp_users_email_idx" ON "whatsapp_users"("email");
ALTER TABLE "whatsapp_users" DROP CONSTRAINT IF EXISTS "whatsapp_users_tenant_id_fkey";
ALTER TABLE "whatsapp_users" ADD CONSTRAINT "whatsapp_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "whatsapp_conversations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_conversations_tenant_id_external_id_key" ON "whatsapp_conversations"("tenant_id", "external_id");
ALTER TABLE "whatsapp_conversations" DROP CONSTRAINT IF EXISTS "whatsapp_conversations_tenant_id_fkey";
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "whatsapp_conversation_queue" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_conversation_queue_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "whatsapp_conversation_queue_tenant_id_queued_at_idx" ON "whatsapp_conversation_queue"("tenant_id", "queued_at");
ALTER TABLE "whatsapp_conversation_queue" DROP CONSTRAINT IF EXISTS "whatsapp_conversation_queue_tenant_id_fkey";
ALTER TABLE "whatsapp_conversation_queue" ADD CONSTRAINT "whatsapp_conversation_queue_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversation_queue" DROP CONSTRAINT IF EXISTS "whatsapp_conversation_queue_conversation_id_fkey";
ALTER TABLE "whatsapp_conversation_queue" ADD CONSTRAINT "whatsapp_conversation_queue_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "whatsapp_agent_status" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "current_conversation_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_agent_status_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_agent_status_tenant_id_user_id_key" ON "whatsapp_agent_status"("tenant_id", "user_id");
CREATE INDEX IF NOT EXISTS "whatsapp_agent_status_tenant_id_status_idx" ON "whatsapp_agent_status"("tenant_id", "status");
ALTER TABLE "whatsapp_agent_status" DROP CONSTRAINT IF EXISTS "whatsapp_agent_status_tenant_id_fkey";
ALTER TABLE "whatsapp_agent_status" ADD CONSTRAINT "whatsapp_agent_status_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "message_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response_time_ms" INTEGER,
    "agent_id" TEXT,
    "intent" TEXT,
    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "response_time_ms" INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "agent_id" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "intent" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "whatsapp_messages_conversation_id_timestamp_idx" ON "whatsapp_messages"("conversation_id", "timestamp");
ALTER TABLE "whatsapp_messages" DROP CONSTRAINT IF EXISTS "whatsapp_messages_conversation_id_fkey";
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "whatsapp_faqs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "keywords" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_faqs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "whatsapp_faqs_tenant_id_idx" ON "whatsapp_faqs"("tenant_id");
ALTER TABLE "whatsapp_faqs" DROP CONSTRAINT IF EXISTS "whatsapp_faqs_tenant_id_fkey";
ALTER TABLE "whatsapp_faqs" ADD CONSTRAINT "whatsapp_faqs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "whatsapp_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "whatsapp_message_feedback" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "agent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_message_feedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "whatsapp_message_feedback_conversation_id_idx" ON "whatsapp_message_feedback"("conversation_id");
CREATE INDEX IF NOT EXISTS "whatsapp_message_feedback_message_id_idx" ON "whatsapp_message_feedback"("message_id");
