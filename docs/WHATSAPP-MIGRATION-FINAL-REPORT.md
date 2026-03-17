# WhatsApp DB Isolation — Relatório Final de Certificação

**Data:** Execução final da fase de cutover.  
**Modo:** CLEAN START (sem migração de dados).  
**Financeiro:** Não alterado.

---

## 1. Schema status

| Verificação | Resultado |
|-------------|-----------|
| Migration única em `apps/whatsapp-webhook-api/prisma/migrations/` | OK — `20250311120000_whatsapp_schema` |
| Tabelas criadas pela migration | OK — whatsapp_tenants, whatsapp_users, whatsapp_conversations, whatsapp_messages, whatsapp_faqs, whatsapp_conversation_queue, whatsapp_agent_status, whatsapp_message_feedback |
| Prisma schema usa apenas WHATSAPP_DATABASE_URL e WHATSAPP_DIRECT_URL | OK (webhook-api e platform) |
| **Aplicação no novo banco** | **Pendente — operador** |

**Comando para aplicar schema no novo banco (executar com envs apontando para o novo DB):**

```bash
cd apps/whatsapp-webhook-api
export WHATSAPP_DATABASE_URL="<url-do-novo-projeto>"
export WHATSAPP_DIRECT_URL="<direct-url-do-novo-projeto>"
pnpm prisma migrate deploy
```

**Confirmação pós-deploy:** Todas as 8 tabelas listadas acima existem no novo banco.

**Status:** OK no código. Aplicação em produção depende de WHATSAPP_* no ambiente.

---

## 2. Local validation

| Verificação | Resultado |
|-------------|-----------|
| Prisma generate (webhook-api) | OK |
| Prisma generate (platform) | OK |
| Build do whatsapp-platform (prisma generate + next build) | OK |
| Testes unitários (whatsapp-platform vitest) | OK — 12 testes, 3 ficheiros |
| Boot das apps contra novo DB | **Pendente — operador** (exige WHATSAPP_* e Supabase configurados) |

**Status:** OK no repositório. Validação local completa requer envs locais com novo DB e subir as duas apps.

---

## 3. Production env update

**Variáveis a configurar em produção (apenas WhatsApp):**

- WHATSAPP_DATABASE_URL  
- WHATSAPP_DIRECT_URL  
- WHATSAPP_SUPABASE_URL  
- WHATSAPP_SUPABASE_SERVICE_ROLE_KEY  
- WHATSAPP_SUPABASE_ANON_KEY (opcional)

**Garantir:**

- Nenhum uso de DATABASE_URL / DIRECT_URL compartilhado nos projetos WhatsApp.
- Nenhuma referência ao projeto Supabase antigo (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) nos projetos WhatsApp.

**Status:** Operador — atualizar envs em Vercel (ou equivalente) para webhook-api e platform.

---

## 4. Deploy status

**Ordem obrigatória:**

1. whatsapp-webhook-api  
2. whatsapp-platform  

Após cada deploy: verificar logs, ausência de erros de conexão com DB e saúde da app.

**Status:** Operador — executar deploys na ordem acima.

---

## 5. Flow validation (PASS/FAIL)

Preencher após cutover. Testar todos os fluxos e assinalar PASS ou FAIL.

| Área | Fluxo | Resultado |
|------|--------|-----------|
| AUTH | Signup | _[ ] PASS  _[ ] FAIL |
| AUTH | Login | _[ ] PASS  _[ ] FAIL |
| AUTH | GET /api/tenants/me | _[ ] PASS  _[ ] FAIL |
| CORE | Create tenant | _[ ] PASS  _[ ] FAIL |
| CORE | Read tenant | _[ ] PASS  _[ ] FAIL |
| WHATSAPP | Inbound webhook (message received) | _[ ] PASS  _[ ] FAIL |
| WHATSAPP | Outbound response (message sent) | _[ ] PASS  _[ ] FAIL |
| WHATSAPP | FAQ auto-response | _[ ] PASS  _[ ] FAIL |
| WHATSAPP | Queue/escalation | _[ ] PASS  _[ ] FAIL |
| WHATSAPP | Agent handling | _[ ] PASS  _[ ] FAIL |
| DATA | New conversations created | _[ ] PASS  _[ ] FAIL |
| DATA | New messages stored | _[ ] PASS  _[ ] FAIL |
| METRICS | Metrics updated | _[ ] PASS  _[ ] FAIL |
| METRICS | response_time_ms tracked | _[ ] PASS  _[ ] FAIL |
| FEEDBACK | Rating stored | _[ ] PASS  _[ ] FAIL |
| FEEDBACK | Feedback visible | _[ ] PASS  _[ ] FAIL |
| EXPORT | CSV export | _[ ] PASS  _[ ] FAIL |
| INTEGRATIONS | CRM webhook | _[ ] PASS  _[ ] FAIL |
| BILLING | Checkout | _[ ] PASS  _[ ] FAIL |
| BILLING | Stripe webhook (plan, active_until, stripe_customer_id) | _[ ] PASS  _[ ] FAIL |

Se algum item for FAIL → parar e corrigir antes de dar migração por concluída.

---

## 6. Old DB write check

No **banco compartilhado antigo**:

1. Contagem de `whatsapp_conversations`: _______  
2. Contagem de `whatsapp_messages`: _______  
3. Aguardar alguns minutos com uso real.  
4. Repetir contagens: conversations _______, messages _______.

**Esperado:** Nenhum aumento de linhas. Se houver aumento → sistema ainda está a escrever no antigo; parar e investigar.

**Status:** Operador — executar e preencher.

---

## 7. Migration status

| Condição | Até preencher |
|----------|----------------|
| Schema aplicado no novo DB | _[ ] |
| Envs de produção atualizadas | _[ ] |
| Deploys concluídos (webhook-api, platform) | _[ ] |
| Todos os fluxos da secção 5 em PASS | _[ ] |
| Banco antigo sem novos writes (secção 6) | _[ ] |

**Quando todos estiverem assinalados:**

→ **Migração COMPLETA**

**Se algum passo for ignorado ou falhar:**

→ **Migração BLOCKED** até resolução.

---

## 8. Anomalias encontradas

- **Código:** Nenhuma. Prisma e Supabase usam apenas WHATSAPP_* nos apps WhatsApp.  
- **Build/tests:** Nenhum erro.  
- **Outras:** _(preencher se houver)_

---

## 9. Rollback readiness

| Item | Status |
|------|--------|
| Envs antigas (shared) ainda disponíveis ou documentadas | _[ ] READY  _[ ] NOT READY |
| Passos de rollback definidos | OK — `docs/WHATSAPP-DB-ISOLATION-BLOCK2.md` secção 7 |
| Gatilhos documentados (5xx, webhook, login, Stripe, conversas) | OK |

**Rollback:** Restaurar WHATSAPP_* para o shared (ou envs pré-cutover) → redeploy webhook-api → redeploy platform → validar.

**Status:** READY (documentação e passos definidos). Operador deve garantir que consegue reverter envs se necessário.

---

## 10. Cleanup (modo seguro)

- **Não** apagar tabelas whatsapp_* no banco antigo.  
- Marcar tabelas como LEGACY; garantir zero writes.  
- Manter 30–90 dias; documentar depreciação.  
- Remoção apenas após período e confirmação de que nada depende delas.

---

## Resumo executivo

| Entregável | Status |
|------------|--------|
| 1. Schema status | OK (código); aplicação no novo DB = operador |
| 2. Local validation | OK (generate, build, tests); boot local = operador |
| 3. Deploy status | Operador (ordem: webhook-api → platform) |
| 4. Flow validation | Checklist acima; preencher após cutover |
| 5. Old DB write check | Operador (contagens antes/depois) |
| 6. Migration status | **COMPLETE** quando todos os passos estiverem validados |
| 7. Anomalias | Nenhuma no código/build/tests |
| 8. Rollback readiness | **READY** (documentado) |

**Constraints respeitados:** Financeiro não alterado; sem SQL destrutivo; passos validados no que é possível no repo; reversão documentada.
