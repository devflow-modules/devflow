# Estrutura de variáveis de ambiente — monorepo

Billing e configuração isolados por produto para evitar colisões e confusão no deploy.

## Namespaces

| Prefixo | App |
|---------|-----|
| `FINANCEIRO_*` | apps/financeiro |
| `WHATSAPP_*` | apps/whatsapp-platform |

## Regras

1. **Cada app lê apenas o próprio namespace** — ex.: whatsapp-platform usa `WHATSAPP_STRIPE_*`, não `STRIPE_*` genérico.
2. **Fallback legado** — para migração gradual, apps aceitam variáveis sem prefixo (ex.: `STRIPE_SECRET_KEY`) quando a nomeada não existe.
3. **Deploy** — no provider (Vercel, Railway), injete o namespace do produto. Opcional: mapeie `DATABASE_URL` e `DIRECT_URL` se o Prisma do app esperar esses nomes.

## Exemplo WhatsApp Platform

```env
# Com pooler (Supabase/Neon/Vercel Postgres): adicione ?pgbouncer=true na URL
WHATSAPP_DATABASE_URL=postgresql://...?pgbouncer=true
WHATSAPP_DIRECT_URL=postgresql://...
WHATSAPP_SUPABASE_URL=https://...
WHATSAPP_SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_WHATSAPP_APP_URL=https://wa.seudominio.com
WHATSAPP_ADMIN_METRICS_SECRET=...
WHATSAPP_STRIPE_SECRET_KEY=sk_live_...
WHATSAPP_STRIPE_WEBHOOK_SECRET=whsec_...
WHATSAPP_STRIPE_PRICE_PRO=price_...
WHATSAPP_STRIPE_PRICE_SCALE=price_...
```

## Exemplo Financeiro

```env
FINANCEIRO_DATABASE_URL=postgresql://...
FINANCEIRO_DIRECT_URL=postgresql://...
NEXT_PUBLIC_FINANCEIRO_SUPABASE_URL=https://...
NEXT_PUBLIC_FINANCEIRO_APP_URL=http://localhost:3000
FINANCEIRO_STRIPE_SECRET_KEY=sk_live_...
FINANCEIRO_STRIPE_WEBHOOK_SECRET=whsec_...
FINANCEIRO_STRIPE_PRICE_PRO=price_...
```

## Referência completa

Ver `.env.example` na raiz do monorepo.
