# Checklist de Produção — WhatsApp Platform

Use este checklist antes do deploy e para validar o ambiente.

**Runtime canónico:** `apps/whatsapp-platform` (host típico: `https://whatsapp.devflowlabs.com.br`).
**Não usar para ops novas:** `apps/whatsapp-webhook-api` (**RETIRED**, RP-3 — ver [REPOSITORY-PURITY-STATUS.md](../whatsapp-platform/REPOSITORY-PURITY-STATUS.md)).

Referências: `apps/whatsapp-platform/.env.example` · [WEBHOOK_META_CHECKLIST.md](./WEBHOOK_META_CHECKLIST.md) · [PILOT-RUNBOOK.md](../whatsapp-platform/PILOT-RUNBOOK.md) · [OPERATIONAL_PLAYBOOK.md](./OPERATIONAL_PLAYBOOK.md).
O ficheiro [`.env.production.example`](./.env.production.example) nesta pasta é **legado/histórico**; preferir o `.env.example` do app.

---

## 1. Variáveis de ambiente obrigatórias (`whatsapp-platform`)

| Variável | Descrição |
|----------|-----------|
| `WHATSAPP_DATABASE_URL` | PostgreSQL (pooler, ex.: `?pgbouncer=true`) |
| `WHATSAPP_DIRECT_URL` | URL direta para migrations Prisma |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificação do webhook Meta (GET) |
| `META_APP_SECRET` | App Secret Meta — HMAC do POST (`X-Hub-Signature-256`) |
| `JWT_SECRET` | Chave JWT (mín. 32 caracteres) |
| `NEXT_PUBLIC_WHATSAPP_APP_URL` | **Base URL canónica** do app (ex.: `https://whatsapp.devflowlabs.com.br`) |

Produção / admin: `WHATSAPP_ADMIN_METRICS_SECRET` (ou equivalentes documentados no app).
Stripe: `WHATSAPP_STRIPE_*` conforme `.env.example` do app.
Keyring de token de canal: `WHATSAPP_TOKEN_ENCRYPTION_*` conforme docs de segurança do app.

---

## 2. Setup do banco

1. Migrations Prisma **só** no runtime canónico:
   ```bash
   cd apps/whatsapp-platform && pnpm db:migrate
   # ou pnpm db:migrate:deploy em CI/prod
   ```
2. Gerar o client:
   ```bash
   cd apps/whatsapp-platform && pnpm db:generate
   ```
3. **Não** aplicar `docs/whatsapp/MIGRATION_CONSOLIDATED.sql` como caminho operacional (candidato a ARCHIVE; preferir Prisma do platform).
4. **Não** correr `db:*` em `apps/whatsapp-webhook-api` para deploy de produto.

---

## 3. Configuração do webhook Meta

1. Meta for Developers → app → WhatsApp → Configuration:
   - **Callback URL:** `https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp`
     (ou `{NEXT_PUBLIC_WHATSAPP_APP_URL}/api/webhook/whatsapp`)
   - **Verify Token:** o mesmo valor de `WHATSAPP_VERIFY_TOKEN` no **whatsapp-platform**.
2. Assinar o evento **messages**.
3. Tenant resolve por `phone_number_id` no payload (canal provisionado/activado no ACC).

Detalhe: [WEBHOOK_META_CHECKLIST.md](./WEBHOOK_META_CHECKLIST.md).

---

## 4. Stripe (billing)

1. Produto/preço no Stripe.
2. Webhook Stripe → `{NEXT_PUBLIC_WHATSAPP_APP_URL}/api/stripe/webhook`.
3. Vars `WHATSAPP_STRIPE_*` + `NEXT_PUBLIC_WHATSAPP_APP_URL` no projeto Vercel do **platform**.

---

## 5. LLM (OpenAI / Anthropic)

- Definir `OPENAI_API_KEY` e/ou `ANTHROPIC_API_KEY` no ambiente do **whatsapp-platform** (não no webhook-api legado).
- No painel: **Configurações** (`/settings`) — motor `ruleBased` / `openAI` / `claude`.
- Ver [OPENAI_ENV_AND_FLOW.md](./OPENAI_ENV_AND_FLOW.md) e [AI_AUTOMATION.md](../whatsapp-platform/AI_AUTOMATION.md).

---

## 6. Ativação de canal (ops)

Caminho canónico: **`/admin/whatsapp`** (Activation Control Center) — provision → `PENDING_ACTIVATION` → Ativar com token → `ACTIVE`.
Playbook: [OPERATIONAL_PLAYBOOK.md](./OPERATIONAL_PLAYBOOK.md).
Pacote piloto: [CLIENT-IMPLANTATION-PACK-v1.md](../whatsapp-platform/CLIENT-IMPLANTATION-PACK-v1.md).

Rotas históricas `/api/admin/whatsapp/onboarding/*` **não existem** no runtime actual — ver banner em [WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md](./WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md).

---

## 7. Fluxo de teste mínimo pós-deploy

1. GET verify do webhook (challenge).
2. Login no app (`{NEXT_PUBLIC_WHATSAPP_APP_URL}`).
3. Canal `ACTIVE` no ACC (se aplicável).
4. Smoke autorizado: [SMOKE-TEST-INBOUND-OUTBOUND.md](../whatsapp-platform/SMOKE-TEST-INBOUND-OUTBOUND.md).

---

## 8. Nota sobre `apps/whatsapp-webhook-api`

App Express **RETIRED** (RP-3). Não correr `db:*` nesse path (já removido). Callback e ops: `apps/whatsapp-platform`. Migrations históricas documentais: `docs/_archive/whatsapp-webhook-api-migrations/`.
