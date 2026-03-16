-- Migração: adicionar colunas de billing em users (executar em bases já existentes)
alter table public.users
  add column if not exists plan text not null default 'free' check (plan in ('free','standard','pro')),
  add column if not exists remaining_queries int not null default 10 check (remaining_queries >= 0),
  add column if not exists stripe_customer_id text;
