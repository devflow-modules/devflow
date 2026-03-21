-- conversations + messages: usados por conversationsRepository e messagesRepository (Supabase client)
-- tenant_id TEXT para aceitar Prisma Tenant/WhatsappPhoneNumber.tenantId (cuid)
-- Compatível com apps/whatsapp-platform/supabase/schema.sql

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  wa_from text not null,
  status text not null default 'open' check (status in ('open', 'waiting_queue', 'waiting', 'assigned', 'in_progress', 'resolved', 'closed')),
  queue_id uuid,
  assigned_agent_id uuid,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, wa_from)
);

create index if not exists idx_conversations_tenant_last on public.conversations(tenant_id, last_message_at desc);
create index if not exists idx_conversations_tenant on public.conversations(tenant_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  wa_message_id text,
  body text not null,
  status text,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on public.messages(conversation_id);
create index if not exists idx_messages_created_at on public.messages(created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Allow all conversations" on public.conversations;
create policy "Allow all conversations" on public.conversations for all using (true) with check (true);

drop policy if exists "Allow all messages" on public.messages;
create policy "Allow all messages" on public.messages for all using (true) with check (true);
