# Ambiente — WhatsApp Platform

## Variáveis críticas (produção)

Validação automática no arranque do servidor Node (`instrumentation.ts` → `src/config/env.ts`) quando `NODE_ENV=production`.

| Variável | Obrigatório | Notas |
|----------|-------------|--------|
| `JWT_SECRET` | Sim | Mínimo 32 caracteres. |
| `WHATSAPP_DATABASE_URL` | Sim | Connection string PostgreSQL (pooler com `?pgbouncer=true` em serverless). |
| `WHATSAPP_VERIFY_TOKEN` | Sim | Igual ao configurado na Meta (webhook GET). |
| `META_APP_SECRET` | Sim (prod) | Validação HMAC `X-Hub-Signature-256` no POST webhook. Fallback: `FACEBOOK_APP_SECRET`. |
| `NEXT_PUBLIC_WHATSAPP_APP_URL` | Sim | URL pública HTTPS do deploy (ex. `https://whatsapp.devflowlabs.com.br`). |

**Dev/test:** `WHATSAPP_SKIP_WEBHOOK_SIGNATURE=1` desliga validação de assinatura (ignorado em `NODE_ENV=production`).

### Emergência

- `SKIP_ENV_VALIDATION=1` — desliga a validação estrita (apenas incidentes; remover assim que possível).

## Outras variáveis (documentação)

Ver `.env.example` na raiz de `apps/whatsapp-platform` para:

- `WHATSAPP_DIRECT_URL` — migrações Prisma
- Supabase (`WHATSAPP_SUPABASE_*`) — realtime / legado
- Meta Embedded Signup (`META_APP_*`)
- Stripe (`WHATSAPP_STRIPE_*`)
- OpenAI (`OPENAI_API_KEY`, etc.)
- Segredos admin (`WHATSAPP_ADMIN_METRICS_SECRET`, `WHATSAPP_OPS_METRICS_SECRET`)

## Ambientes

| Ambiente | NODE_ENV | Validação estrita |
|----------|----------|-------------------|
| Local | development | Não |
| CI / testes | test / development | Não |
| Produção | production | Sim (se não `SKIP_ENV_VALIDATION`) |

## Referências

- `DEPLOY_APP_SUBDOMAIN.md`
- `docs/architecture/LEGACY-CLEANUP.md`
