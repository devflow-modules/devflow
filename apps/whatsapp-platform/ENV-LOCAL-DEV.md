# Configuração local — WhatsApp Platform

## Carregamento de env no dev

O script `scripts/load-env-and-dev.mjs` carrega `../../.env.local` (raiz do monorepo) antes de iniciar o Next.js. Use `pnpm dev` normalmente.

## WHATSAPP_DATABASE_URL com pooler (Supabase/Supavisor)

Se usar a URL do **pooler** (porta 6543), adicione `?pgbouncer=true` no final para evitar erro de prepared statements:

```
WHATSAPP_DATABASE_URL="postgresql://...@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

## Variáveis obrigatórias

- `WHATSAPP_DATABASE_URL` (com ?pgbouncer=true se pooler)
- `WHATSAPP_DIRECT_URL`
- `WHATSAPP_SUPABASE_URL`
- `WHATSAPP_SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` (mín. 32 caracteres)
