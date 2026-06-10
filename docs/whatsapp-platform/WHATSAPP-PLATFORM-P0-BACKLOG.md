# WhatsApp Platform — P0 Backlog para Piloto Real

**Base:** [WHATSAPP-PLATFORM-AUDIT.md](./WHATSAPP-PLATFORM-AUDIT.md) (2026-06-09)  
**Objetivo:** backlog executável para colocar **1 cliente real** a operar com segurança mínima.  
**Regra:** itens abaixo descrevem trabalho **pendente** — não assume implementação já feita.

---

## 1. Objetivo do P0

P0 **não é escalar o produto**. É fechar o mínimo para **1 cliente real** operar com supervisão DevFlow e risco controlado.

Ao concluir o P0, deve ser possível:

| Capacidade | Estado esperado |
|------------|-----------------|
| Receber mensagem real | Webhook Meta validado → persistência |
| Persistir conversa | `WaInboxThread` + `WaInboxMessage` |
| Exibir no inbox | Operador vê thread e histórico |
| Resposta humana | Envio via Cloud API pelo app |
| Handoff básico | IA escala para fila/humano de forma previsível |
| Fechar conversa | Status `CLOSED` + audit |
| Auditar eventos | Logs estruturados sem PII desnecessária |
| Conectar lead comercial ao piloto | Diagnóstico site → CRM → tenant documentado |

O runtime canónico (`apps/whatsapp-platform`) **já implementa** a maior parte da stack; o P0 fecha **segurança, funil comercial, handoff e operação assistida**.

---

## 2. Escopo do piloto

### Entra no piloto

- **1 tenant** real (cliente piloto)
- **1 número** WhatsApp Cloud API (WABA do cliente ou DevFlow assistido)
- **1 operação assistida** — onboarding, configuração Meta e treino inicial feitos pela DevFlow
- **Inbox humano** — assign, resposta, fecho
- **Automação/IA controlada** — LLM ou rule-based com fallback explícito e supervisão
- **Dashboard básico** — manager dashboard existente (`/api/metrics/manager-dashboard`); sem prometer métricas stub
- **Onboarding manual** — signup/admin + provisionamento canal via `/admin/whatsapp` ou Embedded Signup assistido
- **Suporte DevFlow** — runbook, incident response, contacto técnico

### Não entra no piloto (explicitamente fora)

- Billing avançado / metered billing em produção
- Self-service completo (checkout → tenant sem intervenção)
- Multi-tenant sofisticado (vários clientes self-serve)
- Marketplace de templates
- Analytics avançado (intent distribution, BI)
- White-label / hostname dedicado
- IA autónoma sem supervisão humana
- Refatoração visual do site ou `/demo` mock

---

## 3. Backlog P0

| ID | Item | Tipo | Descrição | Critério de aceite | Caminho provável no código/docs | Risco se não fizer | Status inicial |
|----|------|------|-----------|-------------------|--------------------------------|--------------------|----------------|
| **P0-01** | Validação de assinatura Webhook Meta | Segurança / backend | Implementar verificação HMAC `X-Hub-Signature-256` no POST do webhook usando o App Secret Meta. Rejeitar payload inválido (401/403). Manter GET verify inalterado. | POST com assinatura inválida ou ausente → **rejeitado**; POST válido → fluxo actual; env documentado; testes unitários/integration cobrindo assinatura válida/inválida | `webhookSignature.ts`, `webhookHandler.ts`, `.env.example` | Spoofing de webhook; abuse; não conformidade Meta | **Concluído** (2026-06-09) — `META_APP_SECRET`; bypass dev `WHATSAPP_SKIP_WEBHOOK_SIGNATURE=1` |
| **P0-02** | Runbook de ambiente real | Documentação / ops | Consolidar checklist único: env Vercel, Meta (verify token, callback URL, WABA, phone number id), DB/migrations, deploy app canónico, rollback. Referenciar runbooks existentes sem drift do `whatsapp-webhook-api` legado. | Doc `docs/whatsapp-platform/PILOT-RUNBOOK.md` criado; cobre GET verify, POST inbound, outbound manual, rollback; checklist assinável pré go-live | [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md); refs: [WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md](../whatsapp/WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md), [GO_LIVE_WHATSAPP_PLATFORM.md](../../apps/whatsapp-platform/docs/ops/GO_LIVE_WHATSAPP_PLATFORM.md) | Deploy errado; onboarding inconsistente; rollback caótico | **Concluído** (2026-06-09) |
| **P0-03** | Smoke test inbound/outbound | QA / ops | Procedimento repetível: mensagem real (ou sandbox Meta) → aparece no inbox → operador responde → thread fecha. Pode ser checklist manual ou script/E2E. | Documento ou teste com passos numerados; evidência (screenshot/log) por etapa; executável por 1 pessoa em &lt; 30 min | [SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md), `tests/e2e/inbox.spec.ts` (mocks) | Go-live sem prova end-to-end; regressões silenciosas | **Documentado** (2026-06-09) — execução real pendente por ambiente |
| **P0-04** | Handoff automático mínimo | Backend / inbox | Quando LLM (`needs_human: true`) ou regra equivalente indicar escalonamento: marcar thread como pendente humana; mover para fila default ou assign a utilizador default do tenant; registar em audit/log. Não exigir operador a descobrir manualmente. | Thread com `needs_human` → deixa de receber auto-reply IA; aparece em fase `needs_response` / `unassigned`; evento em `WaInboxAuditLog` ou log estruturado; teste cobrindo caminho feliz | `needsHumanHandoffService.ts`, `aiAutomationService.ts`, `aiAutomationRules.ts` | Cliente perde confiança; IA responde quando devia escalar | **Concluído** (2026-06-09) |
| **P0-05** | Persistência do formulário `/contato` no CRM | Portal / CRM | Submit do diagnóstico cria lead via API interna (não só `wa.me`). Campos: nome, WhatsApp, empresa, segmento, volume, problema, horário. Origem canónica alinhada ao catálogo (`inbound_site` existente **ou** novo slug `site_contact` — ver nota). Status inicial `novo`. Interesse produto registado em `notes` ou campo dedicado (modelo `Lead` **não tem** campo `interest` hoje). | POST bem-sucedido cria `Lead` visível em `/admin/leads`; origem filtrável; falha de API mostra feedback ao utilizador; analytics mantido | `src/components/contato/diagnostico-form.tsx`, `POST /api/contato/diagnostico`, `src/lib/contato/*`, `src/lib/outbound-lead-origins.ts`, `prisma/schema.prisma` (`Lead`), `docs/crm/LEADS-CRM.md` | Leads perdidos; funil comercial cego | **Concluído** (2026-06-09) — `origin: inbound_site`; interesse `whatsapp_platform` em `notes`; deduplicação telefone = P1 |
| **P0-06** | Fluxo lead → tenant piloto | Ops / admin | Documentar e implementar ação admin para lead qualificado → tenant associado. `POST …/convert` passa a exigir `tenantId` + confirmação; grava `convertedToRef`; trilha em `notes`. Criação de tenant continua manual (signup/script/admin app). | Runbook `LEAD-TO-TENANT-PILOT.md`; UI modal em `/admin/leads`; API valida tenant na BD WhatsApp; lead rastreável; sem tokens Meta no CRM | `src/lib/lead-pilot-conversion.ts`, `src/app/api/admin/leads/[id]/convert/route.ts`, `GET /api/admin/leads/whatsapp-tenants`, `AdminLeadsClient.tsx`, `apps/whatsapp-platform/.../tenants/`, [LEAD-TO-TENANT-PILOT.md](./LEAD-TO-TENANT-PILOT.md) | Piloto depende de memória tribal; erro humano | **Concluído** (2026-06-09) — conversão assistida; tenant não auto-criado |
| **P0-07** | IA/fallback seguro para piloto | IA / produto | Safe mode por defeito: confiança mínima, temas sensíveis, erro LLM → handoff; decisão explícita `AiDecision`; logs auditáveis sem PII integral | Baixa confiança handoff; intent suporte handoff; erro LLM não lança; `PENDING` sem auto-reply; testes + docs | `aiPilotDecision.ts`, `aiGuard.ts`, `aiAutomationService.ts`, `AI_AUTOMATION.md`, `.env.example` | Resposta inadequada; risco reputacional | **Concluído** (2026-06-09) — `WHATSAPP_AI_SAFE_MODE` default on; FAQ ligado à IA = P1 |
| **P0-08** | Checklist LGPD mínimo | Compliance | Checklist operacional: dados tratados, acesso interno, logs, IA, retenção, demo, incidentes; gaps P1/P2 explícitos. | [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) criado; §10 assinável pré go-live; runbook referencia | `LGPD-PILOT-CHECKLIST.md`; contexto: `WaInboxMessage`, logs webhook, CRM `Lead`, safe mode IA | Risco legal/comercial; bloqueio enterprise | **Concluído** (2026-06-10) — checklist operacional; revisão jurídica/DPA = P1 |
| **P0-09** | Observabilidade mínima | Ops / backend | Padronizar logs: webhook recebido (tenantId, phone_number_id, message_id — **sem** corpo completo em prod); envio Cloud API (sucesso/erro); erros com `trace_id`. Revisar `WHATSAPP_WEBHOOK_VERBOSE` para não vazar PII. | Convenção documentada; exemplos de log esperado; campos mínimos listados; verbose desligado em prod por defeito | [OBSERVABILITY-PILOT.md](./OBSERVABILITY-PILOT.md), `whatsappLogger.ts`, `pilot-events.ts`, `webhookHandler.ts`, `sendMessageService.ts`, `waInboxWebhookPersistence.ts`, `aiAutomationService.ts`, `needsHumanHandoffService.ts` | Debug impossível ou vazamento PII | **Concluído** (2026-06-10) — eventos canónicos + correlation ID; CRM lead log = P1 |
| **P0-10** | Demo comercial no app real | Produto / vendas | Definir roteiro de demo usando app canónico (tenant demo controlado em staging — **não** só `/demo` mock do portal nem vitrine `NEXT_PUBLIC_DEMO_MODE`). Dados fictícios claramente identificados. | Playbook de demo actualizado; tenant demo vs piloto vs mock; checklist pré-call; roteiro 10–15 min | [REAL-APP-DEMO.md](./REAL-APP-DEMO.md), `scripts/provision-devflow-sales-tenant.ts`, `src/demo/fixtures.ts` (roteiro), portal `src/app/demo/` | Expectativa falsa; cliente vê mock enquanto produto real difere | **Concluído** (2026-06-10) — documentação operacional; seed/reset automatizado = P1 |

### Nota P0-05 — origem `site_contact` vs catálogo actual

O catálogo canónico em `src/lib/outbound-lead-origins.ts` inclui `inbound_site` (“Site / inbound”), **não** `site_contact`. Decisão de implementação:

- **Opção A (menor diff):** usar `origin: "inbound_site"` no POST do diagnóstico. **Implementado** em `POST /api/contato/diagnostico`.
- **Opção B:** adicionar `site_contact` ao enum + labels + testes em `route.test.ts`.

Registar interesse `whatsapp_platform` em `notes` estruturado ou em `convertedToType` na conversão posterior — campo `interest` **não existe** no modelo `Lead` (confirmado em `prisma/schema.prisma`).

---

## 4. Ordem de execução recomendada

| Ordem | ID | Justificativa |
|-------|-----|---------------|
| 1 | P0-01 | Bloqueia risco de segurança antes de expor webhook público |
| 2 | P0-02 | Permite configurar ambiente real de forma repetível |
| 3 | P0-03 | Prova end-to-end antes de fechar funil comercial |
| 4 | P0-04 | Handoff mínimo necessário para operação assistida credível |
| 5 | P0-05 | Captura leads do site no CRM |
| 6 | P0-06 | Liga lead qualificado ao tenant piloto |
| 7 | P0-07 | Reduz risco de IA durante piloto |
| 8 | P0-08 | Compliance antes de dados reais de clientes finais |
| 9 | P0-09 | Suporte a incidentes durante piloto |
| 10 | P0-10 | Alinha vendas com produto real |

**Dependências críticas:**

- P0-03 depende de P0-01 + P0-02 (ambiente + segurança).
- P0-06 depende de P0-05 (lead existe no CRM).
- P0-10 pode paralelizar após P0-02 (tenant demo configurado).

---

## 5. Definition of Done do P0

O P0 está **Done** quando todos os critérios abaixo forem verdadeiros:

- [x] Webhook **rejeita** assinatura Meta inválida (P0-01)
- [ ] Cliente piloto **configurado manualmente** com runbook seguido (P0-02)
- [ ] Mensagem **real** entra e aparece no inbox (P0-03)
- [ ] Humano **responde** pelo app e mensagem chega ao WhatsApp (P0-03)
- [ ] Thread pode ser **fechada** com audit (P0-03)
- [x] Handoff básico **funciona** quando IA escala (P0-04)
- [ ] Submit de `/contato` **cria lead** no CRM (P0-05)
- [ ] Fluxo lead qualificado → tenant piloto **documentado ou implementado** (P0-06)
- [x] Política IA/fallback piloto **definida e aplicada** (P0-07)
- [x] Checklist LGPD **existente** (P0-08 — [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md); assinatura §10 pendente por piloto)
- [x] Logs mínimos **padronizados** (P0-09 — [OBSERVABILITY-PILOT.md](./OBSERVABILITY-PILOT.md))
- [x] Demo comercial **no app real** documentada (P0-10 — [REAL-APP-DEMO.md](./REAL-APP-DEMO.md); seed automatizado = P1)
- [ ] Smoke test **documentado** (P0-03 — [SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md))
- [ ] Smoke test **executado** uma vez em ambiente real/staging com resultado registado (§10)

---

## 6. Issues sugeridas

Títulos prontos para GitHub (copiar/colar):

1. `[P0][WhatsApp] Validar assinatura X-Hub-Signature-256 no webhook Meta`
2. `[P0][WhatsApp] Criar runbook de piloto real (PILOT-RUNBOOK.md)`
3. `[P0][WhatsApp] Documentar smoke test inbound/outbound`
4. `[P0][Inbox] Implementar handoff automático mínimo por needs_human`
5. `[P0][CRM] Persistir formulário de diagnóstico no CRM interno`
6. `[P0][Ops] Documentar fluxo lead qualificado → tenant piloto`
7. `[P0][AI] Definir fallback seguro para respostas automáticas no piloto`
8. `[P0][Compliance] Criar checklist LGPD para piloto (LGPD-PILOT-CHECKLIST.md)`
9. `[P0][Observability] Padronizar logs mínimos de webhook/envio`
10. `[P0][Demo] Preparar tenant demo no app real (playbook comercial)`

### Template de issue (opcional)

```markdown
## Contexto
Backlog P0 — [link docs/whatsapp-platform/WHATSAPP-PLATFORM-P0-BACKLOG.md]

## Critério de aceite
- [ ] …

## Caminhos no repo
- …

## Fora de escopo desta issue
- …
```

---

## 7. Fora de escopo

Não entra neste backlog P0 (remeter para P1+ ou backlog de produto):

- Refatoração visual do site (`src/components/sections/*`, home, landing)
- Novos planos pagos ou alteração de pricing Stripe
- Checkout self-service portal → app sem assistência
- Multi-tenant avançado (provisionamento em massa, billing por tenant automático)
- Builder visual de fluxo / automação no-code
- BI avançado, intent analytics, `getIntentDistribution` real
- App mobile
- White-label / hostname customizado
- Integração FAQ → IA (CRUD existe; ligação é P1)
- Correção de métricas stub (`avgResponseTimeMs: 0`, intents vazios)
- Arquivar `apps/whatsapp-webhook-api` legado
- Migrações destrutivas ou alterações de schema sem aprovação explícita

---

## Referências

- [WHATSAPP-PLATFORM-AUDIT.md](./WHATSAPP-PLATFORM-AUDIT.md)
- [docs/whatsapp/DEMO_AND_CLIENT_READINESS_PLAYBOOK.md](../whatsapp/DEMO_AND_CLIENT_READINESS_PLAYBOOK.md)
- [docs/crm/LEADS-CRM.md](../crm/LEADS-CRM.md)
- [docs/products/PRODUCT-GOVERNANCE.md](../products/PRODUCT-GOVERNANCE.md)

---

*Backlog derivado da auditoria — actualizar status de cada P0-XX à medida que issues forem concluídas.*
