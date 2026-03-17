-- WhatsApp Platform — migration consolidada idempotente (PostgreSQL).
-- Seguro para rodar múltiplas vezes (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- Compatível com o schema Prisma do whatsapp-webhook-api e do app whatsapp-platform.

-- 1) whatsapp_tenants
CREATE TABLE IF NOT EXISTS whatsapp_tenants (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT,
  whatsapp_phone TEXT,
  system_prompt TEXT,
  default_prompt TEXT,
  business_type TEXT,
  phone_number_id TEXT,
  display_phone_number TEXT,
  access_token TEXT,
  api_key TEXT,
  subdomain TEXT,
  stripe_customer_id TEXT,
  plan TEXT,
  active_until TIMESTAMP(3),
  ai_driver TEXT,
  crm_webhook_url TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_tenants_phone_number_id_key ON whatsapp_tenants(phone_number_id) WHERE phone_number_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_tenants_api_key_key ON whatsapp_tenants(api_key) WHERE api_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_tenants_subdomain_key ON whatsapp_tenants(subdomain) WHERE subdomain IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE whatsapp_tenants ADD COLUMN IF NOT EXISTS ai_driver TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 2) whatsapp_users
CREATE TABLE IF NOT EXISTS whatsapp_users (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES whatsapp_tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS whatsapp_users_tenant_id_idx ON whatsapp_users(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_users_email_key ON whatsapp_users(email);

-- 3) whatsapp_conversations
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES whatsapp_tenants(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, external_id)
);

CREATE INDEX IF NOT EXISTS whatsapp_conversations_tenant_id_idx ON whatsapp_conversations(tenant_id);

-- 4) whatsapp_conversation_queue
CREATE TABLE IF NOT EXISTS whatsapp_conversation_queue (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES whatsapp_tenants(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  queued_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS whatsapp_conversation_queue_tenant_id_queued_at_idx ON whatsapp_conversation_queue(tenant_id, queued_at);

-- 5) whatsapp_agent_status
CREATE TABLE IF NOT EXISTS whatsapp_agent_status (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES whatsapp_tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_conversation_id TEXT,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS whatsapp_agent_status_tenant_id_status_idx ON whatsapp_agent_status(tenant_id, status);

-- 6) whatsapp_messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id TEXT NOT NULL PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  message_type TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  response_time_ms INTEGER,
  agent_id TEXT,
  intent TEXT
);

CREATE INDEX IF NOT EXISTS whatsapp_messages_conversation_id_timestamp_idx ON whatsapp_messages(conversation_id, timestamp);

DO $$ BEGIN
  ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS agent_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS intent TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 7) whatsapp_faqs
CREATE TABLE IF NOT EXISTS whatsapp_faqs (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES whatsapp_tenants(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS whatsapp_faqs_tenant_id_idx ON whatsapp_faqs(tenant_id);

-- 8) whatsapp_message_feedback
CREATE TABLE IF NOT EXISTS whatsapp_message_feedback (
  id TEXT NOT NULL PRIMARY KEY,
  message_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  agent_id TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS whatsapp_message_feedback_conversation_id_idx ON whatsapp_message_feedback(conversation_id);
CREATE INDEX IF NOT EXISTS whatsapp_message_feedback_message_id_idx ON whatsapp_message_feedback(message_id);
