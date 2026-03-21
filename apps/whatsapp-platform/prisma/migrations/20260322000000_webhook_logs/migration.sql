-- webhook_logs: auditoria de payloads (usado por persistWebhookLog via Supabase client)
-- tenant_id TEXT para aceitar Prisma Tenant.id (cuid)
create table if not exists public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id text,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_webhook_logs_created on public.webhook_logs(created_at desc);
create index if not exists idx_webhook_logs_tenant on public.webhook_logs(tenant_id);

alter table public.webhook_logs enable row level security;

drop policy if exists "Allow all webhook_logs" on public.webhook_logs;
create policy "Allow all webhook_logs" on public.webhook_logs for all using (true) with check (true);
