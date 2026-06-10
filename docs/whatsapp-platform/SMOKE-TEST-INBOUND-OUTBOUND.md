# WhatsApp Platform — Smoke Test Inbound/Outbound

**Versão:** 1.0 · **Data:** 2026-06-09  
**App canónico:** `apps/whatsapp-platform`  
**Depende de:** [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) (P0-02) · validação assinatura webhook (P0-01)

Procedimento operacional para validar, em **ambiente real ou staging**, o fluxo mínimo de ponta a ponta antes de declarar um piloto tecnicamente pronto.

---

## 1. Objetivo

Este smoke test confirma que a WhatsApp Platform consegue, com **1 tenant** e **1 número Cloud API**:

```
WhatsApp (testador) → webhook Meta → persistência → inbox → resposta humana → WhatsApp (testador)
```

Inclui atribuição e fechamento de thread.

**Não substitui** testes automatizados (`tests/e2e/inbox.spec.ts` usa mocks) nem cobre automação avançada, billing, analytics ou multi-tenant em escala.

**Tempo estimado:** 15–30 minutos por execução (1 operador + 1 testador com telemóvel).

---

## 2. Escopo

### Incluído

| Área | O que valida |
|------|----------------|
| Webhook GET | Já validado no [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) §8 — pré-requisito |
| POST inbound | Evento real assinado pela Meta (`webhook_signature_validated`) |
| Persistência | `WaInboxMessage` + `WaInboxThread` |
| Inbox UI | Thread visível em `/inbox` |
| Atribuição | Assign operador (`/api/inbox/conversations/[id]/assign`) |
| Outbound humano | Envio via Cloud API (`/api/inbox/conversations/[id]/send`) |
| Fechamento | Status `CLOSED` (`/api/inbox/conversations/[id]/status`) |
| Logs mínimos | Eventos canónicos — [OBSERVABILITY-PILOT.md](./OBSERVABILITY-PILOT.md) |

### Não incluído

- Testes de carga / burst (ver `webhookHandler.loadburst.test.ts` — unitário, não substitui este smoke)
- Billing / Stripe / quotas
- IA avançada, playbooks, automação complexa
- Segmentação, campanhas, templates HSM
- Multi-equipa / filas avançadas / SLA configurável por fila
- LGPD operacional: [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) (P0-08 — assinatura §10 recomendada antes do smoke em produção)

---

## 3. Pré-requisitos

Confirmar **antes** de iniciar:

- [ ] **P0-01 concluído** — POST webhook valida `X-Hub-Signature-256` com `META_APP_SECRET`
- [ ] **P0-02 concluído** — ambiente configurado conforme [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md)
- [ ] `META_APP_SECRET` definido no ambiente alvo
- [ ] **`WHATSAPP_SKIP_WEBHOOK_SIGNATURE` ausente** em produção/staging piloto
- [ ] Tenant piloto criado (manual — ver runbook §7)
- [ ] Número WhatsApp Cloud API **ACTIVE** com `phoneNumberId` + `accessToken` na BD
- [ ] Utilizador **operador** (ou manager) com login JWT no tenant piloto
- [ ] PostgreSQL operacional (`WHATSAPP_DATABASE_URL`)
- [ ] Webhook callback activo na Meta apontando para `/api/webhook/whatsapp`
- [ ] Token de envio válido (canal ACTIVE)
- [ ] Telemóvel de teste capaz de enviar/receber WhatsApp para o número piloto

**Referências técnicas (opcional para quem debuga):**

- Persistência inbound: `waInboxWebhookPersistence.ts`
- Handler webhook: `webhookHandler.ts`
- UI inbox: `src/components/inbox/InboxShell.tsx`

---

## 4. Dados do teste

Preencher **no início** de cada execução (copiar bloco para ticket/issue). **Não** colar valores reais em documentação versionada.

```md
- Data/hora:
- Ambiente: (produção / staging / local)
- URL: (NEXT_PUBLIC_WHATSAPP_APP_URL)
- Tenant: (tenantId + nome)
- Cliente: (nome comercial)
- Número Cloud API: (E.164, ex. +5511…)
- Phone Number ID:
- Operador: (email / userId)
- Número de teste que enviará mensagem: (E.164 testador)
- Thread ID: (WaInboxThread.id — preencher após Fluxo A)
- Message ID inbound: (waMessageId — preencher após Fluxo A)
- Message ID outbound: (waMessageId — preencher após Fluxo C)
```

**Mensagem de teste sugerida (texto fixo, fácil de identificar):**

> `Smoke test DevFlow — [DATA] — inbound`

Resposta outbound sugerida:

> `Smoke test DevFlow — [DATA] — outbound OK`

---

## 5. Fluxo A — Inbound

### Passos

| # | Acção | Como verificar |
|---|--------|----------------|
| 1 | Testador envia mensagem real para o número Cloud API | WhatsApp entregue no telemóvel do testador (✓ único) |
| 2 | Confirmar webhook POST | Logs deploy: request `POST /api/webhook/whatsapp` → HTTP **200** |
| 3 | Confirmar assinatura | Log `signature_validated` (não `signature_missing` / `signature_invalid`) |
| 4 | Confirmar persistência | BD: registo em `wa_inbox_messages` com `direction=inbound` ou UI com mensagem |
| 5 | Confirmar thread | BD: `wa_inbox_threads` criada ou `lastCustomerMessageAt` actualizado |
| 6 | Operador abre `/inbox` | Thread visível na lista (filtro default ou `needs_response`) |
| 7 | Abrir thread | Texto, horário, remetente (telefone) e tenant correctos |

**Dica:** anotar `Thread ID` e `Message ID inbound` na secção 4.

**Realtime:** a UI pode actualizar via SSE (`/api/realtime/stream`). Se não actualizar sozinha, recarregar a página após alguns segundos.

### Critério de aceite

- [ ] Mensagem aparece no inbox **correcto** em **≤ 10 segundos** (recarregar permitido; SSE opcional)
- [ ] Sem erro de assinatura nos logs
- [ ] Thread **não** aparece em outro tenant
- [ ] Logs **não** contêm corpo completo da mensagem nem tokens

---

## 6. Fluxo B — Atribuição

### Passos

| # | Acção | Como verificar |
|---|--------|----------------|
| 1 | Operador abre a thread do Fluxo A | Painel de conversa carregado |
| 2 | Atribuir ao operador actual (“Assumir” / assign) | UI mostra nome/e-mail do assignee |
| 3 | Confirmar mudança visual | Badge ou linha de assignee actualizada |
| 4 | Recarregar `/inbox` (F5) | Assignee persiste |
| 5 | Confirmar tenant | URL/sessão ainda no tenant piloto; thread id inalterado |

**API:** `POST /api/inbox/conversations/[id]/assign` (body `{ userId }` ou assumir sessão actual).

### Critério de aceite

- [ ] Operador atribuído aparece correctamente na thread
- [ ] Estado persiste após reload
- [ ] Nenhuma outra thread do tenant foi alterada inadvertidamente

---

## 7. Fluxo C — Outbound humano

### Passos

| # | Acção | Como verificar |
|---|--------|----------------|
| 1 | Na thread atribuída, escrever resposta de teste | Campo de composição activo |
| 2 | Enviar mensagem | UI mostra outbound no histórico (lado agente) |
| 3 | Confirmar Cloud API | Sem toast/erro de envio na UI; log sem falha crítica de send |
| 4 | Testador confirma no WhatsApp | Mensagem recebida no telemóvel |
| 5 | Confirmar persistência | Outbound no histórico após reload |
| 6 | Confirmar ordenação | Inbound antes de outbound; timestamps coerentes |

**API:** `POST /api/inbox/conversations/[id]/send`

Anotar `Message ID outbound` se visível (detalhe da mensagem ou BD).

### Critério de aceite

- [ ] Mensagem chega ao WhatsApp do testador
- [ ] Mensagem outbound aparece no histórico da thread
- [ ] Erro de envio (se houver) fica registado na UI ou logs — smoke **reprovado** se falhar entrega
- [ ] Conteúdo sensível **não** aparece em logs públicos (Vercel)

---

## 8. Fluxo D — Fechamento

### Passos

| # | Acção | Como verificar |
|---|--------|----------------|
| 1 | Fechar / resolver conversa na UI | Acção “Fechar” ou equivalente |
| 2 | Confirmar status | Thread marcada como fechada (`CLOSED`) |
| 3 | Recarregar inbox | Status persiste |
| 4 | Confirmar fila activa | Thread sai de `needs_response` / aparece em filtro “fechadas” conforme UI |
| 5 | *(Opcional)* Reabrir se UI suportar | Status volta a `OPEN`; histórico de mensagens intacto |

**API:** `POST /api/inbox/conversations/[id]/status` com `{ status: "CLOSED" }`

### Critério de aceite

- [ ] Thread fecha correctamente
- [ ] Status persiste após reload
- [ ] Histórico de mensagens **não** é apagado

---

## 9. Checklist final

Marcar ao concluir todos os fluxos:

- [ ] Webhook POST recebeu evento real
- [ ] Assinatura validada (`webhook_signature_validated`)
- [ ] Tenant resolvido (`webhook_tenant_resolved`)
- [ ] Inbound persistido (`inbound_message_persisted` + `meta_message_id`)
- [ ] Outbound com sucesso (`outbound_send_success`) ou erro rastreável (`cloud_api_error`)
- [ ] Logs **sem** tokens, secrets ou corpo integral de mensagem
- [ ] Mensagem inbound persistida
- [ ] Thread criada/atualizada
- [ ] Thread aparece no inbox
- [ ] Tenant correcto
- [ ] Operador atribuído
- [ ] Resposta humana enviada
- [ ] Mensagem recebida no WhatsApp
- [ ] Outbound persistido
- [ ] Thread fechada
- [ ] Logs sem conteúdo sensível desnecessário
- [ ] Nenhum erro crítico no servidor durante o teste
- [ ] Resultado registrado (secção 10)

---

## 10. Registro de resultado

Copiar para ticket, issue ou planilha do piloto:

```md
## Resultado do smoke test

- Data:
- Ambiente:
- Responsável:
- Resultado: Aprovado / Reprovado / Parcial
- Evidências: (IDs thread/messages, trace_id de logs — sem PII)
- Problemas encontrados:
- Ações corretivas:
- Próxima execução:
```

**Aprovado:** todos os critérios de aceite dos Fluxos A–D + checklist §9.  
**Parcial:** inbound OK mas outbound ou fecho falhou — documentar e não declarar go-live.  
**Reprovado:** falha de assinatura, tenant errado ou inbox sem mensagem.

---

## 11. Troubleshooting rápido

| Sintoma | Causa provável | Acção |
|---------|----------------|--------|
| Webhook 401 `WEBHOOK_SIGNATURE_MISSING` | POST sem header Meta | Ambiente prod: só Meta envia POST válido; verificar callback |
| Webhook 401 `WEBHOOK_SIGNATURE_INVALID` | `META_APP_SECRET` errado | Alinhar secret Meta ↔ Vercel; redeploy |
| Webhook 403 `WEBHOOK_APP_SECRET_MISSING` | Secret não definido | Adicionar `META_APP_SECRET` |
| POST 200 mas inbox vazio | `tenant_unresolved` ou canal inactivo | Ver [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) §12; activar canal |
| Thread em tenant errado | `phoneNumberId` mapeado a outro tenant | Corrigir `WhatsappPhoneNumber` |
| Outbound não chega | Token expirado / canal não ACTIVE | Renovar token; `/admin/whatsapp` |
| Token expirado | Token temporário Meta | System User ou re-auth Embedded Signup |
| Phone Number ID errado | Provisionamento incorrecto | Conferir ID na Meta vs BD |
| Utilizador sem permissão | Role ou tenant JWT incorrecto | Login no tenant piloto; role `operator`+ |
| BD indisponível | Connection string / pooler | Ver `WHATSAPP_DATABASE_URL`, `?pgbouncer=true` |
| SSE/realtime não actualiza | SSE desligado ou rede | Recarregar inbox; opcional — não bloqueia smoke se mensagem aparece ≤10s após reload |
| IA responde antes do humano | Automação activa | Pausar IA tenant ou assign antes de testar outbound isolado |

Detalhe ampliado: [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) §12.

---

## 12. Definition of Done do P0-03

| Critério | Estado |
|----------|--------|
| Documento `SMOKE-TEST-INBOUND-OUTBOUND.md` criado | ✅ |
| [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) referencia este smoke test | ✅ (secção 11) |
| [README.md](./README.md) referencia este smoke test | ✅ |
| Backlog P0-03 actualizado | ✅ — **Documentado; execução real pendente** por ambiente |
| Executável por terceiro sem contexto oral | ✅ |

**Nota:** a **primeira execução real** em staging/produção deve ser registada na secção 10 e referenciada no ticket do piloto. Até lá, o item P0-03 considera-se **documentação concluída**, não **piloto validado**.

---

## Histórico

| Data | Alteração |
|------|-----------|
| 2026-06-09 | Versão inicial — P0-03 |
