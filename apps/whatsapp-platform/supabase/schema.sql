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

-- queues: filas por tenant para roteamento
create table if not exists public.queues (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  slug text not null,
  settings jsonb default '{}',
  max_size int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, slug)
);

create index if not exists idx_queues_tenant on public.queues(tenant_id);

-- agents: atendentes por tenant
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  email text,
  status text not null default 'offline' check (status in ('available', 'busy', 'offline')),
  settings jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agents_tenant on public.agents(tenant_id);
create index if not exists idx_agents_status on public.agents(tenant_id, status);

-- conversations: uma por par (tenant, wa_from); status inclui waiting_queue e in_progress
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  wa_from text not null,
  status text not null default 'open' check (status in ('open', 'waiting_queue', 'waiting', 'assigned', 'in_progress', 'resolved', 'closed')),
  queue_id uuid references public.queues(id) on delete set null,
  assigned_agent_id uuid references public.agents(id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, wa_from)
);

create index if not exists idx_conversations_tenant_last on public.conversations(tenant_id, last_message_at desc);
create index if not exists idx_conversations_queue on public.conversations(queue_id);
create index if not exists idx_conversations_assigned_agent on public.conversations(assigned_agent_id);
create index if not exists idx_conversations_status on public.conversations(tenant_id, status);

-- conversation_assignments: histórico de atribuições (conversation -> agent)
create table if not exists public.conversation_assignments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_conversation_assignments_conversation on public.conversation_assignments(conversation_id);
create index if not exists idx_conversation_assignments_agent on public.conversation_assignments(agent_id);

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
alter table public.queues enable row level security;
alter table public.agents enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_assignments enable row level security;
alter table public.messages enable row level security;
alter table public.webhook_logs enable row level security;

-- Políticas permissivas para service role (ajustar em produção conforme auth)
create policy "Allow all tenants" on public.tenants for all using (true) with check (true);
create policy "Allow all queues" on public.queues for all using (true) with check (true);
create policy "Allow all agents" on public.agents for all using (true) with check (true);
create policy "Allow all conversations" on public.conversations for all using (true) with check (true);
create policy "Allow all conversation_assignments" on public.conversation_assignments for all using (true) with check (true);
create policy "Allow all messages" on public.messages for all using (true) with check (true);
create policy "Allow all webhook_logs" on public.webhook_logs for all using (true) with check (true);
