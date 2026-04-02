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
NEXT_PUBLIC_FINANCEIRO_APP_URL=http://localhost:3001
# ^ Origem canônica do app Financeiro (middleware 308 das rotas operacionais na raiz). Após Bloco C, em local use porta distinta do portal (ex. portal :3000, app em apps/financeiro :3001); se for igual à origem do portal, `/ferramentas/financeiro/*` operacional na raiz fica 404.
FINANCEIRO_STRIPE_SECRET_KEY=sk_live_...
FINANCEIRO_STRIPE_WEBHOOK_SECRET=whsec_...
FINANCEIRO_STRIPE_PRICE_PRO=price_...
```

## Variáveis OpenAI (compartilhadas)

Configuração orientada a env com override por tenant (AiAgentConfig):

| Variável | Default | Descrição |
|----------|---------|-----------|
| `OPENAI_MODEL` | gpt-4o-mini | Modelo (ex.: gpt-4o, gpt-4o-mini) |
| `OPENAI_MAX_OUTPUT_TOKENS` | 220 | Tokens máx. saída (50–500, ideal WhatsApp) |
| `OPENAI_TEMPERATURE` | 0.4 | Criatividade (0–1) |
| `OPENAI_TIMEOUT_MS` | 10000 | Timeout em ms (3000–20000) |

## Referência completa

Ver `.env.example` na raiz do monorepo.
