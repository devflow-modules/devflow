# Prisma + Supabase — Setup recomendado (Vercel)

Conexão separada para **runtime** (pooler) e **migrations** (conexão direta).

## Por que separar?

- **Runtime (Vercel/serverless):** muitas conexões efêmeras → precisa de pooler (Supavisor transaction mode).
- **Migrations:** `prisma migrate deploy` precisa de conexão direta/session → não usar pooler.

## Variáveis de ambiente

### DATABASE_URL (runtime)

Pooler transaction mode, porta **6543**:

```
postgresql://postgres:[PASSWORD_URL_ENCODED]@db.[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true
```

O `?pgbouncer=true` desativa prepared statements (necessário para transaction mode).

### DIRECT_URL (migrations)

Conexão direta, porta **5432**:

```
postgresql://postgres:[PASSWORD_URL_ENCODED]@db.[PROJECT_REF].supabase.co:5432/postgres
```

## Onde configurar

| Local | DATABASE_URL | DIRECT_URL |
|-------|--------------|------------|
| `.env.local` | Sim | Sim |
| Vercel → Environment Variables | Sim | Sim |

## URL encode da senha

Se a senha tiver caracteres especiais:

| Caractere | Encode |
|-----------|--------|
| @ | %40 |
| # | %23 |
| : | %3A |
| / | %2F |
| % | %25 |

Exemplo: senha `minha@senha123` → `minha%40senha123` na URL.

## Comandos

```bash
# Aplicar migrations (usa DIRECT_URL)
pnpm prisma migrate deploy

# O app em runtime usa DATABASE_URL
```

## Referências

- [Prisma: PgBouncer](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer)
- [Supabase: Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
