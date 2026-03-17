# Checklist de Produção — WhatsApp Platform

Use este checklist antes do deploy e para validar o ambiente.

---

## 1. Variáveis de ambiente obrigatórias

### whatsapp-webhook-api

| Variável | Descrição |
|----------|-----------|
| `WHATSAPP_DATABASE_URL` | URL PostgreSQL (pooler, ex.: `?pgbouncer=true` no Supabase) |
| `WHATSAPP_DIRECT_URL` | URL direta para migrations |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificação do webhook Meta (GET) |

Opcionais: `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY` para LLM; `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_ACCESS_TOKEN` para single-tenant sem DB.

### whatsapp-platform (Next.js)

| Variável | Descrição |
|----------|-----------|
| `WHATSAPP_DATABASE_URL` | Mesmo PostgreSQL do webhook-api |
| `WHATSAPP_DIRECT_URL` | Mesmo que no webhook-api |
| `JWT_SECRET` | Chave para JWT (mín. 32 caracteres) |
| `NEXT_PUBLIC_APP_URL` | URL base do app (ex.: `https://wa.seudominio.com`) |

Para Supabase (filas/agentes/conversações no painel): `WHATSAPP_SUPABASE_URL`, `WHATSAPP_SUPABASE_SERVICE_ROLE_KEY`.

Para /admin em produção: `ADMIN_METRICS_SECRET` (cookie ou header para métricas).  
Para Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO` (ou teste).

---

## 2. Setup do banco

1. Rodar a migration consolidada (idempotente):
   ```bash
   psql "$WHATSAPP_DATABASE_URL" -f docs/whatsapp/MIGRATION_CONSOLIDATED.sql
   ```
   Ou usar as migrations do Prisma no webhook-api:
   ```bash
   cd apps/whatsapp-webhook-api && pnpm db:migrate
   ```

2. Garantir que o schema Prisma do **whatsapp-webhook-api** e do **whatsapp-platform** estão alinhados (mesmas tabelas `whatsapp_*`).

3. Gerar o client:
   ```bash
   cd apps/whatsapp-webhook-api && pnpm db:generate
   cd apps/whatsapp-platform && pnpm db:generate
   ```

---

## 3. Configuração do webhook Meta

1. No Meta for Developers → seu app → WhatsApp → Configuration:
   - **Callback URL**: `https://seu-dominio.com/webhook` (ou a URL do whatsapp-webhook-api).
   - **Verify Token**: o mesmo valor de `WHATSAPP_VERIFY_TOKEN`.

2. Assinar o evento **messages**.

3. Após onboarding no painel, cada tenant terá `phone_number_id` e `access_token`; o webhook resolve o tenant pelo `phone_number_id` do payload.

---

## 4. Stripe (billing)

1. Criar produto e preço no Stripe (ex.: plano Pro).
2. Configurar webhook no Stripe apontando para:
   `https://seu-dominio.com/api/stripe/webhook`
3. Definir no app: `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO` (ou variáveis de teste).
4. Após checkout, o usuário é redirecionado para `/onboarding?session_id=...` e o tenant recebe `plan` e `activeUntil`.

---

## 5. LLM (OpenAI / Anthropic)

- No **whatsapp-webhook-api**: definir `OPENAI_API_KEY` e/ou `ANTHROPIC_API_KEY` conforme o driver.
- No painel, em **Configurações** (`/settings`), o tenant pode escolher o motor: **Apenas regras**, **OpenAI** ou **Claude**.
- Respostas por LLM e fallback são registradas nos logs estruturados (`responseSource`: `ai` ou `ruleBased`).

---

## 6. RLS (Supabase)

Se o painel usar Supabase para filas/agentes/conversas e você usar Supabase Auth, aplique RLS e políticas por tenant. Exemplo de policy (ajustar nome da tabela e claim):

```sql
-- Exemplo: usuário só vê conversas do próprio tenant
CREATE POLICY "tenant_conversations"
ON public.conversations
FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id'));
```

Com JWT do app (não Supabase Auth), as rotas já filtram por `auth.payload.tenantId`; o RLS no Supabase pode ficar permissivo para o service role e restrito por aplicação.

---

## 7. Como testar o fluxo completo

1. **Webhook**
   - Enviar POST para `/webhook` com payload de teste (objeto `whatsapp_business_account`, `entry[].changes[].value.messages`).
   - Verificar logs: `webhook.inbound`, `webhook.response`, e, se escalar, `webhook.escalated`, `webhook.enqueue`, `webhook.assign`.

2. **Fila e agente**
   - Criar agente (Supabase ou API) e marcar status `available` (Prisma: `AgentStatus`).
   - Disparar mensagem que gere `escalate: true`; conferir se a conversa entra na fila e, se houver agente disponível, é atribuída.

3. **Painel**
   - Login em `/login` → acessar `/admin/conversations`, `/admin/distribuir`, `/queues`, `/agents`.
   - Em **Distribuir**, clicar em “Pegar próxima conversa” e validar redirecionamento para a conversa.
   - Enviar mensagem na conversa e marcar como **Resolved** (rota `PATCH .../resolve`).

4. **Exportação**
   - Com usuário autenticado, acessar links de export CSV (dashboard de métricas) ou `GET /api/admin/export/conversations` e `GET /api/admin/export/messages` com cookie de sessão.

5. **Smoke script**
   - Rodar `pnpm exec tsx scripts/smoke-test-whatsapp.ts` (ou equivalente) conforme documentado no script.

---

## 8. Resumo de segurança

- **Middleware**: rotas `/admin/*` (exceto `/admin/login`) exigem JWT válido em cookie.
- **APIs**: rotas de queue, agents, conversations, export e resolve usam `getAuthFromRequest` e escopo por `tenantId`.
- **PATCH/DELETE** em `/api/queues/[id]` e `/api/agents/[id]`: apenas role `admin`.
- **Métricas admin**: em produção, exige `ADMIN_METRICS_SECRET` (cookie ou header) ou JWT válido.
