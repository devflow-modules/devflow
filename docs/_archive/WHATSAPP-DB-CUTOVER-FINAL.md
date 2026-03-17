# WhatsApp DB — Cutover final (execução)

Cutover da base compartilhada para o banco dedicado WhatsApp. **Financeiro não é alterado.**

---

## STEP 1 — Modo de migração

| Modo | Critério | Responsável |
|------|----------|-------------|
| **CLEAN START** | Dados WhatsApp atuais são apenas dev/teste ou descartáveis. | Operador confirma |
| **DATA MIGRATION** | Existe produção/legado com tenants, conversas ou billing que deve ser preservado. | Operador confirma |

**Seleção:** [x] CLEAN START  _[ ] DATA MIGRATION  

**Motivo:** Clean start — dados WhatsApp atuais são descartáveis (dev/test) ou ambiente greenfield; não migrar dados.

- ~~Se **DATA MIGRATION**: garantir que o script já foi executado e contagens/FKs validadas.~~ (não aplicável)

---

## STEP 2 — Pré-cutover (checagens)

### 2.1 Variáveis de ambiente previstas

| Variável | Obrigatória | webhook-api | platform |
|----------|-------------|-------------|----------|
| WHATSAPP_DATABASE_URL | Sim | Sim | Sim |
| WHATSAPP_DIRECT_URL | Sim | Sim | Sim |
| WHATSAPP_SUPABASE_URL | — | — | Sim |
| WHATSAPP_SUPABASE_SERVICE_ROLE_KEY | — | — | Sim |
| WHATSAPP_SUPABASE_ANON_KEY | Opcional | — | Se usar cliente público |

**Confirmar em produção (Vercel/outro):** _[ ] Todas as obrigatórias configuradas para o projeto **novo** WhatsApp.

### 2.2 Prisma aponta apenas para WHATSAPP_DATABASE_URL

| Verificação | Resultado |
|-------------|-----------|
| whatsapp-webhook-api/prisma/schema.prisma usa apenas `env("WHATSAPP_DATABASE_URL")` e `env("WHATSAPP_DIRECT_URL")` | OK (verificado) |
| whatsapp-platform/prisma/schema.prisma idem | OK (verificado) |

**Status:** PASS — Nenhum uso de `DATABASE_URL` ou `DIRECT_URL` nos apps WhatsApp.

### 2.3 whatsapp-platform NÃO usa banco/Supabase compartilhado

| Verificação | Resultado |
|-------------|-----------|
| Código em apps/whatsapp-platform/src não referencia `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | OK (verificado) |
| supabase-server.ts usa apenas WHATSAPP_SUPABASE_URL e WHATSAPP_SUPABASE_SERVICE_ROLE_KEY | OK (verificado) |

**Status:** PASS — Platform não depende do shared DB nem do Supabase antigo no código.

### 2.4 Schema aplicado no novo banco

Tabelas esperadas (existentes após `prisma migrate deploy` no novo DB):

- whatsapp_tenants, whatsapp_users, whatsapp_conversations, whatsapp_messages  
- whatsapp_faqs, whatsapp_conversation_queue, whatsapp_agent_status, whatsapp_message_feedback  

**Confirmar:** _[ ] Conectado ao novo DB e todas as tabelas existem (ou `prisma migrate deploy` executado com WHATSAPP_* apontando para o novo projeto).

### 2.5 Se modo DATA MIGRATION: dados já migrados e validados

**Modo CLEAN START** — N/A. Pular esta etapa.

---

## STEP 3 — Ordem de execução do cutover

Executar **nesta ordem**:

| # | Ação | Feito |
|---|------|-------|
| 1 | Atualizar variáveis de ambiente **locais** (.env / .env.local) com WHATSAPP_* do **novo** projeto | _[ ] |
| 2 | Subir app local e validar: boot OK, conexão com DB, uma query básica (ex.: listar tenants) | _[ ] |
| 3 | Atualizar variáveis de ambiente de **produção** (webhook-api e whatsapp-platform) com os valores do novo DB/Supabase | _[ ] |
| 4 | Redeploy **whatsapp-webhook-api** (primeiro) | _[ ] |
| 5 | Redeploy **whatsapp-platform** (segundo) | _[ ] |
| 6 | Confirmar saúde: sem erros de startup, sem erros de conexão com DB | _[ ] |

---

## STEP 4 — Validação pós-cutover (fluxos críticos)

Preencher após o cutover (Pass / Fail / N/A).

| Área | Fluxo | Resultado |
|------|--------|-----------|
| AUTH | Signup | _[ ] Pass  _[ ] Fail |
| AUTH | Login | _[ ] Pass  _[ ] Fail |
| AUTH | GET /api/tenants/me | _[ ] Pass  _[ ] Fail |
| CORE | Criação de tenant | _[ ] Pass  _[ ] Fail |
| CORE | Leitura de tenant | _[ ] Pass  _[ ] Fail |
| WHATSAPP | Webhook inbound (mensagem recebida) | _[ ] Pass  _[ ] Fail |
| WHATSAPP | Resposta outbound (mensagem enviada) | _[ ] Pass  _[ ] Fail |
| WHATSAPP | Resposta FAQ | _[ ] Pass  _[ ] Fail |
| WHATSAPP | Fila / escalação | _[ ] Pass  _[ ] Fail |
| WHATSAPP | Agentes atendendo | _[ ] Pass  _[ ] Fail |
| DATA | Conversas criadas | _[ ] Pass  _[ ] Fail |
| DATA | Mensagens persistidas | _[ ] Pass  _[ ] Fail |
| METRICS | Métricas atualizadas | _[ ] Pass  _[ ] Fail |
| METRICS | response_time_ms registrado | _[ ] Pass  _[ ] Fail |
| FEEDBACK | Rating gravado | _[ ] Pass  _[ ] Fail |
| FEEDBACK | Feedback visível na UI | _[ ] Pass  _[ ] Fail |
| EXPORT | Export CSV | _[ ] Pass  _[ ] Fail |
| INTEGRATIONS | CRM webhook | _[ ] Pass  _[ ] Fail |
| BILLING | Checkout (Stripe) | _[ ] Pass  _[ ] Fail |
| BILLING | Webhook Stripe atualiza tenant (plan, active_until, stripe_customer_id) | _[ ] Pass  _[ ] Fail |

---

## STEP 5 — Confirmar que o banco antigo não recebe writes

- _[ ] Contagem de linhas em **whatsapp_conversations** (banco antigo) antes do cutover: _______
- _[ ] Contagem de linhas em **whatsapp_messages** (banco antigo) antes do cutover: _______
- _[ ] Após cutover + alguns minutos: nova contagem das mesmas tabelas no banco antigo.
- _[ ] **Resultado:** contagens não aumentaram → antigo não está recebendo writes. Se aumentaram → PARAR e investigar.

---

## STEP 6 — Rollback (se necessário)

**Gatilhos para rollback:**

- Aumento relevante de 5xx ou falha de health check.
- Falha de webhook (mensagens não persistidas).
- Falha de login/signup.
- Stripe não atualizando tenants.
- Conversas/mensagens falhando.

**Passos de rollback:**

1. Restaurar envs anteriores (WHATSAPP_* apontando para o **banco compartilhado** e Supabase antigo, ou restaurar envs pré-cutover).
2. Redeploy whatsapp-webhook-api.
3. Redeploy whatsapp-platform.
4. Validar sistema usando o banco antigo.
5. Registrar incidente e causa raiz.

Detalhes: `docs/WHATSAPP-DB-ISOLATION-BLOCK2.md` (seção 7).

---

## STEP 7 — Cleanup pós-cutover (modo seguro)

- **NÃO** apagar tabelas whatsapp_* no banco antigo.
- Marcar tabelas como **LEGACY** (documentação/runbook).
- Garantir que não há writes no antigo (já validado no Step 5).
- Manter por período de observação (30–90 dias) antes de avaliar remoção.

---

## Entregas — Resumo

| Entregável | Status |
|------------|--------|
| Checklist de cutover (executado vs pendente) | Este documento (Steps 1–7) |
| Modo de migração usado | **CLEAN START** (sem migração de dados) |
| Resultados de validação por fluxo | Preencher em Step 4 |
| Confirmação: novo DB é source of truth; antigo sem writes | Step 5 |
| Rollback pronto | Step 6 + doc Block 2 |
| Riscos/anomalias detectadas | Abaixo |

### Riscos ou anomalias

_(Preencher durante/após a execução)_

_________________________________________________
_________________________________________________
