# WhatsApp Platform — Release Notes (Release Candidate)

> **RP-1 (2026-08-04):** runtime e deploy canónicos = **`apps/whatsapp-platform`**.
> Instruções abaixo que mencionam `apps/whatsapp-webhook-api` como serviço de produção são **históricas** — não seguir para ops novas.
> Checklist actualizado: [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md).
> Webhook Meta: `{NEXT_PUBLIC_WHATSAPP_APP_URL}/api/webhook/whatsapp`.

Versão preparada para deploy em produção após hardening técnico e validação de consistência, segurança e fluxos ponta a ponta.

---

## Funcionalidades implementadas

- **Webhook Meta**: recepção de mensagens via Cloud API no **whatsapp-platform**, resolução de tenant por `phone_number_id`, resposta por IA (ruleBased / OpenAI / Claude) ou fallback, enfileiramento e atribuição a agentes.
- **Painel admin**: conversas, fila operacional, distribuição (“Pegar próxima conversa”), envio de mensagem pelo agente, resolução de conversa (`PATCH .../resolve`).
- **Multi-tenant**: isolamento por `tenantId` em todas as APIs; filas e agentes por tenant.
- **Auth**: signup, login (JWT em cookie HttpOnly), proteção de rotas `/admin/*` via middleware.
- **Autorização**: PATCH/DELETE em `/api/queues/[id]` e `/api/agents/[id]` restritos a role `admin`; demais rotas admin exigem JWT válido e escopo por tenant.
- **Métricas**: dashboard com volume 24h, contagem de tenants, export CSV de conversas e mensagens.
- **Configuração do tenant**: `/settings` com seleção de `aiDriver` (ruleBased, openAI, claude).
- **Billing**: Stripe checkout no signup, webhook para atualização de `plan` e `activeUntil`.

---

## Melhorias

- **Logs estruturados** no pipeline inbound (platform): eventos de webhook / resposta / erro (ver docs de observabilidade do app).
- **Smoke test** (`apps/whatsapp-platform` / scripts documentados): validação com `WHATSAPP_DATABASE_URL` e `WHATSAPP_DIRECT_URL`.
- **Migration**: preferir Prisma em `apps/whatsapp-platform`. `docs/whatsapp/MIGRATION_CONSOLIDATED.sql` é histórico (candidato a ARCHIVE).
- **Checklist de produção**: [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) — env, banco, webhook Meta, Stripe, LLM, ativação ACC.
- **Exemplo de env**: preferir `apps/whatsapp-platform/.env.example`. O [`.env.production.example`](./.env.production.example) nesta pasta é legado.

---

## Correções e consistência

- Testes Vitest no **whatsapp-platform**.
- Schema Prisma canónico em `apps/whatsapp-platform/prisma`.
- Rotas de export CSV com autenticação e filtro por `tenantId`.
- Envio de mensagem pelo agente actualiza estado da conversa conforme implementação actual do inbox.

---

## Instruções de deploy (canónicas)

### 1. Variáveis de ambiente

Usar `apps/whatsapp-platform/.env.example` e [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md).

- **Banco:** `WHATSAPP_DATABASE_URL`, `WHATSAPP_DIRECT_URL`.
- **Webhook:** `WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET`.
- **App:** `JWT_SECRET`, `NEXT_PUBLIC_WHATSAPP_APP_URL` (Base URL canónica).
- Stripe / metrics / encryption: conforme `.env.example` do app.

### 2. Banco de dados

```bash
cd apps/whatsapp-platform && pnpm db:migrate   # ou db:migrate:deploy
cd apps/whatsapp-platform && pnpm db:generate
```

**Não** usar `cd apps/whatsapp-webhook-api && pnpm db:*` para produto.

### 3. Build e start

```bash
cd apps/whatsapp-platform
pnpm install && pnpm build
pnpm start
```

### 4. Meta e Stripe

- **Meta:** Callback URL = `{NEXT_PUBLIC_WHATSAPP_APP_URL}/api/webhook/whatsapp` (ex.: `https://whatsapp.devflowlabs.com.br/api/webhook/whatsapp`); Verify Token = `WHATSAPP_VERIFY_TOKEN`; evento **messages**.
- **Stripe:** webhook → `{NEXT_PUBLIC_WHATSAPP_APP_URL}/api/stripe/webhook`.

### 5. Validação pós-deploy

- `pnpm test` em `apps/whatsapp-platform`.
- Smoke autorizado conforme [SMOKE-TEST-INBOUND-OUTBOUND.md](../whatsapp-platform/SMOKE-TEST-INBOUND-OUTBOUND.md).
- Seguir [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md).

---

## Nota histórica — `whatsapp-webhook-api`

Release Candidate antiga descrevia deploy paralelo do Express `apps/whatsapp-webhook-api` (porta 3005, Callback `/webhook`). Esse caminho **não é** o runtime de produto. O app foi **RETIRED** na RP-3; ver [REPOSITORY-PURITY-STATUS.md](../whatsapp-platform/REPOSITORY-PURITY-STATUS.md).

---

## Não incluso nesta release

- Novas features de produto além do escopo do hardening.
- Remoção física do webhook-api ou de `apps/site` (fatias posteriores de Purity).

---

## Resumo de estado

| Item | Status |
|------|--------|
| Testes (platform) | ✔ |
| Smoke (com DB + env + autorização) | Documentado |
| Migration / schema canónico | `apps/whatsapp-platform` |
| Segurança (auth, tenant, admin) | ✔ |
| Build platform | ✔ |
| Checklist e env | ✔ (RP-1) |

Deploy de produto = **whatsapp-platform** com env, banco, webhook Meta e Stripe conforme o checklist actualizado.
