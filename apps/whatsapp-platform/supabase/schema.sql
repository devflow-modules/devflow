-- WhatsApp Platform — schema para projeto Supabase do produto.
-- Executar no SQL Editor do Supabase ou via migração.

-- tenants: um por número/conta WhatsApp
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  phone_number_id text not null unique,
  display_phone_number text,
  access_token text not null,
  verify_token text,
  settings jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- conversations: uma por par (tenant, wa_from)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  wa_from text not null,
  status text not null default 'open' check (status in ('open', 'waiting', 'assigned', 'resolved', 'closed')),
  assigned_agent_id uuid,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, wa_from)
);

create index if not exists idx_conversations_tenant_last on public.conversations(tenant_id, last_message_at desc);

-- messages: inbound e outbound
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

-- webhook_logs: auditoria de payloads
create table if not exists public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_webhook_logs_created on public.webhook_logs(created_at desc);

-- RLS: desabilitar ou configurar conforme necessidade (service role ignora RLS)
alter table public.tenants enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.webhook_logs enable row level security;

-- Políticas permissivas para service role (ajustar em produção conforme auth)
create policy "Allow all tenants" on public.tenants for all using (true) with check (true);
create policy "Allow all conversations" on public.conversations for all using (true) with check (true);
create policy "Allow all messages" on public.messages for all using (true) with check (true);
create policy "Allow all webhook_logs" on public.webhook_logs for all using (true) with check (true);
