# WhatsApp Platform — Pilot Runbook

**Versão:** 1.0 · **Data:** 2026-06-09  
**App canónico:** `apps/whatsapp-platform`  
**Base:** [WHATSAPP-PLATFORM-P0-BACKLOG.md](./WHATSAPP-PLATFORM-P0-BACKLOG.md) · [WHATSAPP-PLATFORM-AUDIT.md](./WHATSAPP-PLATFORM-AUDIT.md)

Runbook operacional para configurar e validar **1 piloto real**: 1 cliente, 1 tenant, 1 número WhatsApp Cloud API, inbox, webhook e envio outbound com suporte assistido DevFlow.

**Runtime canónico:** o webhook, inbox e auth vivem no app `whatsapp-platform` (deploy dedicado, ex. `NEXT_PUBLIC_WHATSAPP_APP_URL`). O portal raiz (`devflowlabs.com.br`) redirecciona UI operacional via cutover — **não** usar `apps/whatsapp-webhook-api` (legado).

---

## 1. Objetivo

Este documento consolida, num único fluxo assinável, tudo o que a equipa precisa para:

1. Configurar ambiente (Vercel/env, Postgres, Meta).
2. Ligar 1 número WhatsApp Cloud API a 1 tenant.
3. Validar webhook (GET verify + POST com assinatura).
4. Confirmar mensagem inbound → inbox → resposta humana → fecho.
5. Executar rollback seguro se algo falhar.

Não substitui runbooks especializados — referencia-os onde aplicável.

**Privacidade / piloto:** antes de activar tráfego real de consumidores finais, completar e assinar [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) §10.

---

## 2. Escopo do piloto

### Incluído

| Item | Descrição |
|------|-----------|
| 1 cliente real | Operação assistida pela DevFlow |
| 1 tenant | Isolamento Prisma (`Tenant` + `User`) |
| 1 número WhatsApp Cloud API | `WhatsappPhoneNumber` com `phoneNumberId` + token |
| Inbox operacional | `/inbox` — lista, mensagens, assign, fecho |
| Recebimento via webhook | `POST /api/webhook/whatsapp` |
| Resposta humana | Envio via Cloud API pelo operador |
| Automação/IA controlada | LLM ou rule-based com supervisão; pausa via config operacional |
| Suporte assistido DevFlow | Onboarding, Meta, treino inicial |

### Fora de escopo

- Self-service completo (checkout → tenant sem intervenção)
- Billing automático / metered billing em produção
- Multi-tenant avançado (vários clientes self-serve)
- White-label / hostname customizado
- Analytics avançado (intent distribution, BI)
- IA autónoma sem supervisão humana
- Demo mock do portal (`/demo` em `src/`)

---

## 3. Pré-requisitos

### Equipa e acesso

- [ ] Acesso ao repositório DevFlow (`apps/whatsapp-platform`)
- [ ] Acesso ao deploy (Vercel ou equivalente) com permissão para env vars
- [ ] Acesso ao Postgres/Supabase do projeto WhatsApp
- [ ] Utilizador DevFlow com papel **`platform_admin`** (admin plataforma) ou **`manager`** / **`operator`** no tenant piloto
- [ ] Gestor de segredos (nunca colar tokens em issues, chat ou commits)

### Infraestrutura

- [ ] URL pública **HTTPS** do app canónico (`NEXT_PUBLIC_WHATSAPP_APP_URL`)
- [ ] PostgreSQL configurado (`WHATSAPP_DATABASE_URL` + `WHATSAPP_DIRECT_URL`)
- [ ] Migrations Prisma aplicáveis no ambiente alvo

### Meta / WhatsApp

- [ ] Meta Business Manager com acesso ao cliente (ou WABA DevFlow assistida)
- [ ] Meta App (tipo Business) com produto **WhatsApp** activo
- [ ] WhatsApp Business Account (WABA ID)
- [ ] Phone Number ID do número piloto
- [ ] Access Token com permissões de envio/leitura (System User ou token de linha persistido em `WhatsappPhoneNumber.accessToken`)
- [ ] Verify Token (`WHATSAPP_VERIFY_TOKEN`) — string definida pela equipa, igual na Meta e no env
- [ ] App Secret (`META_APP_SECRET`) — obrigatório em produção para validação `X-Hub-Signature-256` (P0-01)

### Documentação complementar

| Tema | Documento |
|------|-----------|
| Setup Cloud API | [WHATSAPP-SETUP.md](../whatsapp/WHATSAPP-SETUP.md) |
| Ativação número (admin API) | [WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md](../whatsapp/WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md) |
| Onboarding assistido (painel) | [OPERATIONAL_PLAYBOOK.md](../whatsapp/OPERATIONAL_PLAYBOOK.md) |
| Go-live deploy | [GO_LIVE_WHATSAPP_PLATFORM.md](../../apps/whatsapp-platform/docs/ops/GO_LIVE_WHATSAPP_PLATFORM.md) |
| Variáveis | [ENVIRONMENT.md](../../apps/whatsapp-platform/docs/ops/ENVIRONMENT.md) |
| Checklist produção | [PRODUCTION_CHECKLIST.md](../whatsapp/PRODUCTION_CHECKLIST.md) |

---

## 4. Variáveis de ambiente obrigatórias

Referência completa: `apps/whatsapp-platform/.env.example`

| Variável | Exemplo / descrição | Obrigatória em produção? | Observações |
|----------|---------------------|--------------------------|-------------|
| `NEXT_PUBLIC_WHATSAPP_APP_URL` | `https://whatsapp.exemplo.com` | **Sim** | URL base HTTPS do deploy canónico; webhook e OAuth |
| `JWT_SECRET` | string ≥ 32 chars | **Sim** | Auth JWT (login inbox) |
| `WHATSAPP_DATABASE_URL` | `postgresql://…?pgbouncer=true` | **Sim** | Pooler serverless; **não** usar `DATABASE_URL` genérico neste app |
| `WHATSAPP_DIRECT_URL` | `postgresql://…:5432/…` | **Sim** | Migrations Prisma (`pnpm db:migrate`) |
| `WHATSAPP_VERIFY_TOKEN` | string escolhida pela equipa | **Sim** | GET webhook verify; igual ao configurado na Meta |
| `META_APP_SECRET` | secret do Meta App | **Sim** | HMAC `X-Hub-Signature-256` no POST webhook (P0-01) |
| `FACEBOOK_APP_SECRET` | — | Alternativa | Fallback de código se `META_APP_SECRET` vazio |
| `META_APP_ID` | ID numérico do app | **Sim** (Embedded Signup) | Onboarding multi-tenant via OAuth |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | config id | **Sim** (Embedded Signup) | Fluxo `/dashboard/whatsapp` |
| `WHATSAPP_PHONE_NUMBER_ID` | ex. `123456789` | Parcial | Fallback single-tenant / dev; em piloto multi-tenant fica em `WhatsappPhoneNumber` |
| `WHATSAPP_ACCESS_TOKEN` | `EAAx…` | Parcial | Fallback dev; produção: token por linha na BD |
| `WHATSAPP_DISPLAY_PHONE_NUMBER` | `+5511…` | Não | Exibição |
| `META_WABA_ID` / `WHATSAPP_BUSINESS_ACCOUNT_ID` | ID WABA | Parcial | Admin onboarding / diagnóstico; persistido em `WhatsappPhoneNumber.wabaId` |
| `WHATSAPP_SUPABASE_URL` | URL Supabase | Parcial | Service role; legado/realtime — ver audit |
| `WHATSAPP_SUPABASE_SERVICE_ROLE_KEY` | `eyJ…` | Parcial | Idem |
| `WHATSAPP_ADMIN_METRICS_SECRET` | secret longo | **Sim** (admin prod) | Protege `/admin/*` ops |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | — | Opcional | IA automática no piloto |
| `WHATSAPP_ENABLE_LLM` | `true` / `false` | Opcional | Gate LLM |
| `RESEND_API_KEY` + `EMAIL_FROM` | — | Parcial | Reset password / e-mail transacional |
| `WHATSAPP_SKIP_WEBHOOK_SIGNATURE` | `1` | **Nunca em produção** | Bypass assinatura POST — **só dev/test local**; ignorado se `NODE_ENV=production` |
| `WHATSAPP_SKIP_CLOUD_CREDENTIAL_VALIDATE` | `1` | **Nunca em produção** | Dev/E2E: não validar credenciais Meta no PATCH tenant |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | **Nunca no piloto real** | Mock UI/API — não usar com cliente real |
| `SKIP_ENV_VALIDATION` | `1` | Emergência apenas | Desliga validação estrita no arranque |

---

## 5. Configuração Meta

Passo a passo operacional (detalhes em [WHATSAPP-SETUP.md](../whatsapp/WHATSAPP-SETUP.md)):

1. **Aceder Meta for Developers** — conta com permissão no Business Manager do cliente.
2. **Seleccionar ou criar App** — tipo **Business**; anotar **App ID**.
3. **Adicionar produto WhatsApp** — *Add Product* → *WhatsApp* → *Set Up*.
4. **Localizar WABA ID** — WhatsApp → *API Setup* ou Business Manager → WhatsApp Accounts; anotar ID numérico (`wabaId`).
5. **Localizar Phone Number ID** — WhatsApp → *Phone numbers* → coluna ID (não confundir com número formatado `+55…`).
6. **Gerar / obter Access Token** — token temporário (API Setup) para testes; produção: System User ou token persistido após Embedded Signup / provisionamento admin.
7. **Configurar webhook Callback URL** — URL canónica:
   ```
   https://<NEXT_PUBLIC_WHATSAPP_APP_URL>/api/webhook/whatsapp
   ```
   Alias compatível: `/api/webhooks/whatsapp` (preferir canónica).
8. **Configurar Verify Token** — mesmo valor de `WHATSAPP_VERIFY_TOKEN` no deploy.
9. **Subscrever campos/eventos** — mínimo: **`messages`** (inbound + status de entrega). Confirmar que eventos de status estão activos se quiser rastrear entrega.
10. **Confirmar assinatura do webhook** — Meta envia GET verify; deve retornar `200` + challenge (secção 8).

**App Secret:** em *App Settings* → *Basic* → *App Secret* → copiar para `META_APP_SECRET` no Vercel (nunca commitar).

---

## 6. Configuração no deploy

### 6.1 Vercel / ambiente

1. Projecto apontando para `apps/whatsapp-platform` (monorepo — root directory correcto no Vercel).
2. Adicionar env vars da secção 4 (Production + Preview conforme política da equipa).
3. Confirmar `NODE_ENV=production` no deploy de produção.
4. **Não** definir `WHATSAPP_SKIP_WEBHOOK_SIGNATURE=1` em Production.

### 6.2 Domínio HTTPS

- Confirmar `NEXT_PUBLIC_WHATSAPP_APP_URL` = domínio final com `https://`.
- Meta exige HTTPS no callback do webhook.

### 6.3 Base de dados

```bash
cd apps/whatsapp-platform
# Com WHATSAPP_DIRECT_URL e WHATSAPP_DATABASE_URL configurados:
pnpm db:migrate
pnpm exec prisma generate
```

- Não há seed obrigatório confirmado para piloto — tenant criado manualmente (secção 7).
- Alternativa SQL consolidada (legado): `docs/whatsapp/MIGRATION_CONSOLIDATED.sql` — preferir migrations Prisma do app.

### 6.4 Deploy e health

1. Deploy / redeploy após env vars.
2. Confirmar arranque sem erro de validação de env (`instrumentation` → `src/config/env.ts`).
3. Opcional: script de smoke do repo:
   ```bash
   ./scripts/ops/validate-whatsapp-platform.sh https://<SEU_HOST>
   ```
   (caminho relativo à raiz do monorepo — **não confirmado** em todos os ambientes; secção 11 cobre checklist manual.)

### 6.5 Endpoint público

- `GET/POST https://<host>/api/webhook/whatsapp` deve ser acessível da internet (sem auth JWT — Meta chama directamente).
- Rate limit POST: configurável via `WHATSAPP_WEBHOOK_RATE_MAX` / `WHATSAPP_WEBHOOK_RATE_WINDOW_MS`.

---

## 7. Criar tenant piloto

**Pré-requisito compliance:** revisar [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) (secções 4–10) antes de receber mensagens de consumidores finais no número ligado.

**Fluxo actual: assistido com associação CRM.** Após criar tenant, use «Converter em piloto WhatsApp» em `/admin/leads` ou `POST …/convert` — ver [LEAD-TO-TENANT-PILOT.md](./LEAD-TO-TENANT-PILOT.md) (P0-06).

### 7.1 Registo mínimo a documentar por piloto

| Campo | Onde registar |
|-------|---------------|
| Nome do cliente | Planilha interna / CRM `/admin/leads` |
| `tenantId` (cuid Prisma) | Admin `/admin/tenants` ou BD após signup |
| Número WhatsApp (E.164) | `WhatsappPhoneNumber.displayPhoneNumber` |
| Phone Number ID | `WhatsappPhoneNumber.phoneNumberId` |
| WABA ID | `WhatsappPhoneNumber.wabaId` |
| Responsável DevFlow | CRM / planilha piloto |
| Responsável cliente | Contacto operacional + Meta BM |
| Utilizadores / roles | `User.role`: `manager`, `operator` |
| Plano / status piloto | ex. `plan` manual, `isInternal`, pausa IA se necessário |

### 7.2 Caminhos disponíveis hoje

**Opção A — Signup assistido (tenant + utilizador gestor)**

1. Cliente ou DevFlow acede `https://<host>/signup`.
2. Cria `Tenant` + `User` (JWT).
3. Login → `/dashboard` / `/inbox`.

**Opção B — Admin plataforma (`platform_admin`)**

1. Login admin → `/admin/tenants`.
2. Criar/gerir tenant e utilizadores (**UI admin** — detalhe exacto depende do estado do painel; confirmar no deploy).

**Opção C — Canal WhatsApp (obrigatório para mensagens reais)**

1. Painel interno: `/admin/whatsapp` — provisionar canal manualmente ([OPERATIONAL_PLAYBOOK.md](../whatsapp/OPERATIONAL_PLAYBOOK.md)).
2. Ou Embedded Signup: cliente em `/dashboard/whatsapp` (requer `META_APP_*` configurado).
3. Ativação pós-aprovação Meta: botão **Ativar** + token, ou runbook [WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md](../whatsapp/WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md).

**Ponte comercial CRM → tenant:** UI modal + API em `/admin/leads` grava `convertedToRef=<tenantId>` e trilha em `notes` — [LEAD-TO-TENANT-PILOT.md](./LEAD-TO-TENANT-PILOT.md). Criação de tenant e canal Meta continuam manuais.

---

## 8. Validação GET verify

### 8.1 Pela Meta (recomendado)

Ao guardar Callback URL + Verify Token no painel WhatsApp → *Configuration*, a Meta envia GET automaticamente. Sucesso = webhook marcado como verificado.

### 8.2 curl (genérico — substituir placeholders)

```bash
curl -sS -D - \
  "https://SEU_DOMINIO/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=VERIFY_TOKEN&hub.challenge=123"
```

**Resultado esperado:**

- HTTP **200**
- Body: `123` (texto plano, valor do `hub.challenge`)
- Header `X-Trace-Id` presente (opcional)

**Falha comum:** HTTP **403** + `WEBHOOK_VERIFY_FORBIDDEN` — verify token não coincide com `WHATSAPP_VERIFY_TOKEN`.

> **Nota:** a URL canónica é `/api/webhook/whatsapp`, não `/api/whatsapp/webhook`.

---

## 9. Validação POST inbound

### 9.1 Procedimento

1. Enviar mensagem **real** do telemóvel do testador para o número WhatsApp ligado ao piloto.
2. Verificar logs do deploy (Vercel / observabilidade) — ver [OBSERVABILITY-PILOT.md](./OBSERVABILITY-PILOT.md):
   - `webhook_signature_validated` — assinatura OK (produção)
   - `webhook_post_received` → `webhook_tenant_resolved` → `inbound_message_persisted`
   - Anotar `trace_id` (header `X-Trace-Id` na resposta do webhook)
   - **Não** deve aparecer `webhook_signature_missing` / `webhook_signature_invalid`
3. Confirmar persistência (BD):
   - `WaInboxThread` criada/atualizada para o telefone remetente
   - `WaInboxMessage` inbound com `waMessageId`
4. Confirmar UI: login no tenant → `/inbox` → thread visível com mensagem.

### 9.2 O que observar (sem expor PII)

| Sinal | OK | Problema |
|-------|-----|----------|
| Log `webhook_signature_validated` | Assinatura Meta OK | Ver secção 12 |
| Log `webhook_tenant_unresolved` | Phone Number ID não mapeado a tenant | Provisionar canal / corrigir ID |
| Log `inbound_pipeline_skipped_channel_not_active` | Canal não ACTIVE ou sem token | Activar canal em `/admin/whatsapp` |
| Thread no inbox | Persistência OK | BD / tenant errado |

Não copiar payloads webhook completos para tickets — contêm telefone e texto.

---

## 10. Validação outbound humano

1. Abrir `/inbox` com utilizador autenticado do tenant piloto.
2. Seleccionar thread da mensagem inbound.
3. Escrever resposta manual → enviar.
4. Confirmar:
   - Mensagem aparece no histórico da thread (outbound).
   - Testador recebe no WhatsApp no telemóvel.
   - Status de entrega actualiza (webhook status — se subscrito).
5. Opcional: **Assign** a operador → **Fechar** thread (status `CLOSED`).

**API envolvida:** `POST /api/inbox/conversations/[id]/send` → `WhatsAppCloudAdapter.sendText` (`@devflow/whatsapp-core`).

---

## 11. Smoke test operacional

**Procedimento detalhado (fluxos A–D, critérios de aceite, registro de resultado):**  
→ **[SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md)**

Resumo checklist assinável pré go-live (complementa o documento acima):

- [ ] **LGPD piloto:** [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) §10 revisto e assinado
- [ ] Deploy com envs correctas (secção 4)
- [ ] `META_APP_SECRET` definido; **sem** `WHATSAPP_SKIP_WEBHOOK_SIGNATURE` em produção
- [ ] Migrations aplicadas
- [ ] Webhook GET verify OK (secção 8)
- [ ] Webhook POST inbound OK — mensagem real recebida
- [ ] Assinatura validada (`webhook_signature_validated` nos logs — [OBSERVABILITY-PILOT.md](./OBSERVABILITY-PILOT.md))
- [ ] POST sem assinatura **rejeitado** (401) — testar só em staging ou com curl consciente
- [ ] Mensagem persistida em `WaInboxMessage`
- [ ] Thread aparece no `/inbox`
- [ ] Humano responde pelo app
- [ ] Mensagem outbound entregue no WhatsApp
- [ ] Thread pode ser atribuída (assign)
- [ ] Thread pode ser fechada
- [ ] Logs sem corpo completo de mensagem / tokens
- [ ] Rollback lido e compreendido (secção 13)

**Responsável DevFlow:** _______________ **Data:** _______________

Após execução, preencher **Registro de resultado** em [SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md) §10.

---

## 12. Troubleshooting

| Sintoma | Causa provável | Acção corretiva |
|---------|----------------|-----------------|
| GET verify falha (403) | `WHATSAPP_VERIFY_TOKEN` ≠ token na Meta | Alinhar env e painel Meta; redeploy |
| POST 401 `WEBHOOK_SIGNATURE_MISSING` | Header `X-Hub-Signature-256` ausente | Confirmar chamada vem da Meta; não testar POST manual sem assinatura em prod |
| POST 401 `WEBHOOK_SIGNATURE_INVALID` | `META_APP_SECRET` errado ou body alterado | Verificar App Secret; assinatura calculada sobre **raw body** |
| POST 403 `WEBHOOK_APP_SECRET_MISSING` | `META_APP_SECRET` não definido em produção | Adicionar env no Vercel; redeploy |
| Mensagem não aparece no inbox | `phone_number_id` não resolve tenant | Verificar registo em `WhatsappPhoneNumber`; alinhar ID Meta ↔ BD |
| Mensagem não aparece no inbox | Canal não `ACTIVE` ou sem `accessToken` | Activar canal `/admin/whatsapp`; validar token |
| Outbound falha | Token expirado ou revogado | Regenerar token Meta; actualizar BD |
| Outbound falha | Número não registado na Cloud API | Seguir [WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md](../whatsapp/WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md) |
| Token expirado | Token temporário da API Setup | Usar System User ou re-autorizar Embedded Signup |
| Phone Number ID errado | ID de outro número/WABA | `GET` phone-numbers na Meta; corrigir provisionamento |
| WABA ID errado | WABA de outro BM | Confirmar BM do cliente; corrigir `wabaId` |
| Env ausente | Deploy incompleto | [ENVIRONMENT.md](../../apps/whatsapp-platform/docs/ops/ENVIRONMENT.md); validação arranque |
| Domínio sem HTTPS | URL HTTP ou certificado inválido | Corrigir domínio Vercel; actualizar Meta callback |
| BD indisponível | Pooler/direct URL errados | Verificar `WHATSAPP_DATABASE_URL`; `?pgbouncer=true` no pooler |
| Erro Prisma 42P05 | Pooler sem `pgbouncer=true` | Adicionar parâmetro à connection string |
| IA responde indevidamente | Automação activa no piloto | Pausar via `TenantOperationalConfig` ou `/settings/ai` |

---

## 13. Rollback

Ordem sugerida (do menos ao mais invasivo):

1. **Desactivar webhook na Meta** — WhatsApp → Configuration → remover callback ou dessubscrever `messages` (para inbound imediato).
2. **Pausar automação/IA** — config operacional do tenant ou env; evitar auto-replies durante incidente.
3. **Operar manualmente** — atendimento directo pelo WhatsApp Business / Meta Business Suite até restabelecer app.
4. **Rotacionar access token** — se suspeita de comprometimento; actualizar `WhatsappPhoneNumber.accessToken` e envs.
5. **Redeploy anterior** — Vercel: promote deploy estável ([GO_LIVE_WHATSAPP_PLATFORM.md](../../apps/whatsapp-platform/docs/ops/GO_LIVE_WHATSAPP_PLATFORM.md)).
6. **Preservar logs** — exportar logs Vercel/observabilidade antes de mudanças; incluir `trace_id`.
7. **Não apagar conversas** — `WaInboxThread` / `WaInboxMessage` são evidência operacional e comercial; backup BD antes de qualquer limpeza.

Incidentes: [INCIDENT_RESPONSE.md](../../apps/whatsapp-platform/docs/ops/INCIDENT_RESPONSE.md).

---

## 14. Segurança

- **Nunca** commitar tokens, App Secret, JWT ou verify token.
- **Nunca** logar secrets ou corpo completo de mensagens em produção.
- **Assinatura obrigatória em produção** — P0-01; `WHATSAPP_SKIP_WEBHOOK_SIGNATURE=1` **proibido** em Production.
- Limitar acesso ao inbox — roles `operator` / `manager`; admin plataforma só para ops DevFlow.
- Dados pessoais nas conversas (telefone, nome, conteúdo) — seguir [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) (P0-08).
- Rotacionar tokens após incidente ou offboarding de colaborador com acesso Meta/Vercel.
- Rate limit webhook activo por defeito — monitorizar abusos.

---

## 15. Definition of Done do piloto técnico

O ambiente piloto está **tecnicamente pronto** quando:

- [ ] GET verify funciona (Meta + curl)
- [ ] POST inbound funciona com assinatura válida (mensagem real)
- [ ] POST sem assinatura é **rejeitado** em produção
- [ ] Mensagem aparece no inbox do tenant correcto
- [ ] Humano responde e mensagem é entregue no WhatsApp
- [ ] Thread pode ser fechada com audit
- [ ] Logs básicos existem (`signature_validated`, `events_received`, `trace_id`)
- [ ] Rollback documentado e equipa sabe executar secção 13
- [ ] Envs conferidas contra secção 4 (checklist assinado)
- [ ] Checklist LGPD §10 assinado ([LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md))
- [ ] Este runbook referenciado no ticket do piloto

**Itens P0 relacionados:** handoff (P0-04 ✓), funil CRM (P0-05/P0-06 ✓), safe mode IA (P0-07 ✓), LGPD checklist (P0-08 ✓), observabilidade (P0-09 ✓ — [OBSERVABILITY-PILOT.md](./OBSERVABILITY-PILOT.md)), demo comercial app real (P0-10 ✓ — [REAL-APP-DEMO.md](./REAL-APP-DEMO.md)). Smoke test real: [SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md).

---

## Histórico

| Data | Alteração |
|------|-----------|
| 2026-06-09 | Versão inicial — P0-02; inclui validação assinatura P0-01 |
| 2026-06-10 | Referência LGPD-PILOT-CHECKLIST (P0-08) em §1, §7, §11, §14, §15 |
