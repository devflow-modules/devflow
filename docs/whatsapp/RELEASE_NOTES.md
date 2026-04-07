# WhatsApp Platform — Release Notes (Release Candidate)

Versão preparada para deploy em produção após hardening técnico e validação de consistência, segurança e fluxos ponta a ponta.

---

## Funcionalidades implementadas

- **Webhook Meta**: recepção de mensagens via Cloud API, resolução de tenant por `phone_number_id`, resposta por IA (ruleBased / OpenAI / Claude) ou fallback, enfileiramento e atribuição a agentes.
- **Painel admin**: conversas, fila operacional, distribuição (“Pegar próxima conversa”), envio de mensagem pelo agente, resolução de conversa (`PATCH .../resolve`).
- **Multi-tenant**: isolamento por `tenantId` em todas as APIs; filas e agentes por tenant.
- **Auth**: signup, login (JWT em cookie HttpOnly), proteção de rotas `/admin/*` via middleware.
- **Autorização**: PATCH/DELETE em `/api/queues/[id]` e `/api/agents/[id]` restritos a role `admin`; demais rotas admin exigem JWT válido e escopo por tenant.
- **Métricas**: dashboard com volume 24h, contagem de tenants, export CSV de conversas e mensagens.
- **Configuração do tenant**: `/settings` com seleção de `aiDriver` (ruleBased, openAI, claude).
- **Billing**: Stripe checkout no signup, webhook para atualização de `plan` e `activeUntil`.

---

## Melhorias

- **Logs estruturados** no webhook-api: eventos `webhook.inbound`, `webhook.response` (com `responseSource`, `intent`, `responseTimeMs`), `webhook.escalated`, `webhook.assign`, `webhook.error`.
- **Smoke test** (`scripts/smoke-test-whatsapp.ts`): validação de criação de tenant/usuário/conversa, enqueue, dequeue via `/api/admin/queue/next`, login e resolve; exige `WHATSAPP_DATABASE_URL` e `WHATSAPP_DIRECT_URL`; senha de teste com hash bcrypt para E2E completo quando o platform está no ar.
- **Migration consolidada** idempotente: `docs/whatsapp/MIGRATION_CONSOLIDATED.sql` com tabelas `whatsapp_*`, coluna `ai_driver`, índices; alinhada aos schemas Prisma do webhook-api e do platform.
- **Checklist de produção**: `docs/whatsapp/PRODUCTION_CHECKLIST.md` com env vars, setup de banco, webhook Meta, Stripe, LLM, RLS e fluxo de teste.
- **Exemplo de env para produção**: `docs/whatsapp/.env.production.example` com variáveis do webhook-api e do platform.

---

## Correções e consistência

- Testes Vitest (webhook-api e platform) passando; isolamento por tenant nos testes de API.
- Schemas Prisma do webhook-api e do platform alinhados às tabelas da migration (incl. `ai_driver`, `whatsapp_conversation_queue`, `whatsapp_agent_status`).
- Rotas de export CSV (`/api/admin/export/conversations`, `/api/admin/export/messages`) com autenticação e filtro por `tenantId`.
- Envio de mensagem pelo agente (`/api/admin/conversations/[id]/send`) atualiza status da conversa para `in_progress` quando Supabase está configurado.

---

## Instruções de deploy

### 1. Variáveis de ambiente

Usar como referência `docs/whatsapp/.env.production.example`. Obrigatórias:

- **Banco**: `WHATSAPP_DATABASE_URL` (pooler, ex.: `?pgbouncer=true`), `WHATSAPP_DIRECT_URL`.
- **webhook-api**: `WHATSAPP_VERIFY_TOKEN` (token de verificação do webhook Meta).
- **platform**: `JWT_SECRET` (mín. 32 caracteres), `NEXT_PUBLIC_APP_URL`; Supabase: `WHATSAPP_SUPABASE_URL`, `WHATSAPP_SUPABASE_SERVICE_ROLE_KEY`; produção: `ADMIN_METRICS_SECRET`; Stripe conforme checklist.

### 2. Banco de dados

Aplicar a migration consolidada (idempotente):

```bash
psql "$WHATSAPP_DIRECT_URL" -f docs/whatsapp/MIGRATION_CONSOLIDATED.sql
```

Ou usar as migrations do Prisma no webhook-api. Em seguida, gerar o client em ambos os apps:

```bash
cd apps/whatsapp-webhook-api && pnpm db:generate
cd apps/whatsapp-platform && pnpm db:generate
```

### 3. Build e start

**webhook-api** (Node):

```bash
cd apps/whatsapp-webhook-api
pnpm install && pnpm build
pnpm start   # PORT padrão 3005
```

**platform** (Next.js):

```bash
cd apps/whatsapp-platform
pnpm install && pnpm build
pnpm start   # porta 3000 por padrão no script)
```

### 4. Meta e Stripe

- **Meta**: em WhatsApp → Configuration, definir Callback URL para o endpoint `/webhook` do webhook-api e Verify Token = `WHATSAPP_VERIFY_TOKEN`; assinar evento **messages**.
- **Stripe**: webhook apontando para `https://seu-dominio/api/stripe/webhook`; configurar `STRIPE_WEBHOOK_SECRET` e preços (ex.: `STRIPE_PRICE_PRO`).

### 5. Validação pós-deploy

- Executar testes: `pnpm test` em `apps/whatsapp-webhook-api` e `apps/whatsapp-platform`.
- Com banco e (opcionalmente) platform rodando: `cd apps/whatsapp-platform && pnpm run smoke`.
- Seguir o fluxo do checklist (webhook, fila, agente, painel, export CSV).

---

## Não incluso nesta release

- Novas features de produto além do escopo do hardening.
- Alterações de arquitetura ou refatorações não necessárias para estabilidade e deploy.

---

## Resumo de estado

| Item                         | Status |
|-----------------------------|--------|
| Testes (webhook-api)         | ✔ Passando |
| Testes (platform)            | ✔ Passando |
| Smoke test (com DB + env)    | ✔ Script pronto; E2E com platform em execução |
| Migration / schemas          | ✔ Alinhados |
| Segurança (auth, tenant, admin) | ✔ Aplicada |
| Build webhook-api            | ✔ OK |
| Build platform               | ✔ OK |
| Checklist e env example      | ✔ Documentados |

A WhatsApp Platform está **pronta para deploy em produção** como Release Candidate, desde que as variáveis de ambiente, banco, webhook Meta e Stripe estejam configurados conforme o checklist e as instruções acima.
