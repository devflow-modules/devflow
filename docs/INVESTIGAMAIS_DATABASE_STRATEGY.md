# Investiga+ — Database strategy

## Primary database: Supabase (dedicated project)

One Supabase project per product; do not share with financeiro or whatsapp-platform.

## Tables

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| email | text | NOT NULL, UNIQUE |
| senha_hash | text | NOT NULL |
| cpf | text | NOT NULL, UNIQUE (digits only stored) |
| nome | text | |
| telefone | text | |
| nascimento | date | |
| cidade | text | |
| uf | text | |
| genero | text | |
| role | text | NOT NULL, check in ('cliente','operador','admin') |
| bonus_concedido_at | timestamptz | NULL until bonus granted |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### consultas
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| cpf | text | NOT NULL (user's CPF) |
| cnpj | text | NOT NULL (digits) |
| nome | text | company name or fantasia |
| status | text | NOT NULL, check in ('Pendente','Consultado','Erro') |
| criado_em | timestamptz | NOT NULL default now() |

Indexes: (cpf), (cnpj), (criado_em desc).

### dados_cnpj
| Column | Type | Notes |
|--------|------|-------|
| cnpj | text | PK (digits) |
| dados | jsonb | NOT NULL (API response) |
| updated_at | timestamptz | default now() |

## RLS

Enable RLS on all tables. Service role used in API routes bypasses RLS. For future browser client: users can read/update own row; consultas filter by cpf = auth user.

## Cache

No separate SQLite; cache is dados_cnpj table in Supabase.
