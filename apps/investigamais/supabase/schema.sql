-- Investiga+ — Supabase schema (dedicated project)

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  senha_hash text not null,
  cpf text not null unique,
  nome text,
  telefone text,
  nascimento date,
  cidade text,
  uf text,
  genero text,
  role text not null check (role in ('cliente','operador','admin')) default 'cliente',
  bonus_concedido_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consultas (
  id uuid primary key default gen_random_uuid(),
  cpf text not null,
  cnpj text not null,
  nome text,
  status text not null check (status in ('Pendente','Consultado','Erro')) default 'Pendente',
  criado_em timestamptz not null default now()
);

create index if not exists idx_consultas_cpf on public.consultas(cpf);
create index if not exists idx_consultas_cnpj on public.consultas(cnpj);
create index if not exists idx_consultas_criado_em on public.consultas(criado_em desc);

create table if not exists public.dados_cnpj (
  cnpj text primary key,
  dados jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.consultas enable row level security;
alter table public.dados_cnpj enable row level security;

create policy "Allow all users" on public.users for all using (true) with check (true);
create policy "Allow all consultas" on public.consultas for all using (true) with check (true);
create policy "Allow all dados_cnpj" on public.dados_cnpj for all using (true) with check (true);
