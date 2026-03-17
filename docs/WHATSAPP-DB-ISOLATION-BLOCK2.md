# WhatsApp DB Isolation — Block 2 (Cutover e migração)

Conclusão da migração para o banco dedicado WhatsApp: estratégia, cutover, validação, rollback e cleanup. **Financeiro permanece intocado.**

---

## 1. Estratégia de migração (recomendação)

### Decisão: clean start vs migração de dados

| Cenário | Recomendação |
|--------|----------------|
| **Dados atuais são apenas dev/teste ou descartáveis** | **Clean start**: aplicar schema no banco dedicado (`prisma migrate deploy`), apontar envs para o novo DB e não copiar dados do shared. |
| **Existe produção/legado com tenants, conversas e billing reais** | **Migração de dados**: aplicar schema no dedicado, copiar dados na ordem de FKs (ver abaixo), validar integridade e depois cutover. |

**Como decidir:** conferir no banco compartilhado atual se as tabelas `whatsapp_*` têm dados que precisam ser preservados (tenants com `stripe_customer_id`, conversas, mensagens, FAQs). Se não houver ou forem só testes → **clean start**. Se houver → **migração de dados**.

---

## 2. Migração de dados (quando necessária)

### Ordem obrigatória (respeitando FKs)

1. `whatsapp_tenants`
2. `whatsapp_users`
3. `whatsapp_conversations`
4. `whatsapp_messages`
5. `whatsapp_faqs`
6. `whatsapp_conversation_queue`
7. `whatsapp_agent_status`
8. `whatsapp_message_feedback`

### Pré-requisitos

- Banco **destino** (dedicado WhatsApp) já existe e o schema foi aplicado:  
  `cd apps/whatsapp-webhook-api && WHATSAPP_DATABASE_URL="<novo>" WHATSAPP_DIRECT_URL="<novo>" pnpm prisma migrate deploy`
- Banco **origem** (shared) acessível em modo leitura (recomendado) para o script/export.

### Opção A — Script Node (recomendado para controle fino)

No repositório há o script `scripts/whatsapp-migrate-data-to-dedicated-db.mjs`.

- **Variáveis:**  
  - `SOURCE_DATABASE_URL` — conexão de leitura para o banco compartilhado (onde estão as `whatsapp_*`).  
  - `WHATSAPP_DATABASE_URL` — conexão de escrita para o banco dedicado WhatsApp.
- **Uso:**  
  `SOURCE_DATABASE_URL="postgresql://..." WHATSAPP_DATABASE_URL="postgresql://..." node scripts/whatsapp-migrate-data-to-dedicated-db.mjs`
- **Dependência:** `pnpm add -D pg` na raiz do monorepo (ou onde o script for executado).
- O script copia as 8 tabelas na ordem acima e faz log de contagem por tabela; usa `ON CONFLICT (id) DO NOTHING` para evitar duplicatas.

### Opção B — pg_dump + psql (somente dados)

```bash
# Exportar apenas dados das tabelas WhatsApp do banco origem (ordem não altera FKs no dump)
pg_dump "$SOURCE_DATABASE_URL" --data-only --column-inserts \
  -t whatsapp_tenants -t whatsapp_users -t whatsapp_conversations \
  -t whatsapp_messages -t whatsapp_faqs -t whatsapp_conversation_queue \
  -t whatsapp_agent_status -t whatsapp_message_feedback \
  -f whatsapp_data.sql

# No destino: desabilitar temporariamente triggers/FK para import
psql "$WHATSAPP_DATABASE_URL" -c "SET session_replication_role = replica;"
psql "$WHATSAPP_DATABASE_URL" -f whatsapp_data.sql
psql "$WHATSAPP_DATABASE_URL" -c "SET session_replication_role = DEFAULT;"
```

Ajuste a ordem dos `-t` se o dump gerar INSERTs em ordem que viole FKs; nesse caso, dividir em vários arquivos por tabela na ordem da seção 2 e importar na mesma ordem com `session_replication_role = replica`.

---

## 3. Validação pós-migração (integridade)

Executar no **banco dedicado** após a cópia:

- **Contagem por tabela:**

```sql
SELECT 'whatsapp_tenants' AS tbl, COUNT(*) FROM whatsapp_tenants
UNION ALL SELECT 'whatsapp_users', COUNT(*) FROM whatsapp_users
UNION ALL SELECT 'whatsapp_conversations', COUNT(*) FROM whatsapp_conversations
UNION ALL SELECT 'whatsapp_messages', COUNT(*) FROM whatsapp_messages
UNION ALL SELECT 'whatsapp_faqs', COUNT(*) FROM whatsapp_faqs
UNION ALL SELECT 'whatsapp_conversation_queue', COUNT(*) FROM whatsapp_conversation_queue
UNION ALL SELECT 'whatsapp_agent_status', COUNT(*) FROM whatsapp_agent_status
UNION ALL SELECT 'whatsapp_message_feedback', COUNT(*) FROM whatsapp_message_feedback;
```

Comparar resultado com as contagens do banco origem.
- **FKs:**  
  - Todos os `tenant_id` em users, conversations, faqs, conversation_queue, agent_status devem existir em `whatsapp_tenants`.  
  - Todos os `conversation_id` em messages, conversation_queue e message_feedback devem existir em `whatsapp_conversations`.  
  - `user_id` em `whatsapp_agent_status` deve existir em `whatsapp_users`.
- **Campos críticos preservados:**  
  - Tenants: `api_key`, `stripe_customer_id`, `plan`, `active_until`, `phone_number_id`, `access_token`.  
  - Timestamps: `created_at`, `updated_at`, `timestamp` (messages), `queued_at`.  
  - Métricas: `response_time_ms`, `agent_id`, `intent` em messages; `rating` em message_feedback.  
  - FAQs e feedback: `tenant_id`, `conversation_id`, `message_id` coerentes com as contagens e FKs.

---

## 4. Checklist de cutover (exato)

- [ ] **4.1** Decidir modo: clean start ou migração de dados (conforme seção 1).
- [ ] **4.2** Se migração de dados: executar script/export na ordem da seção 2; rodar validações da seção 3.
- [ ] **4.3** Banco dedicado com schema aplicado:  
  `apps/whatsapp-webhook-api`: `WHATSAPP_DATABASE_URL` e `WHATSAPP_DIRECT_URL` apontando para o novo DB → `pnpm prisma migrate deploy`.
- [ ] **4.4** Atualizar **envs locais**:  
  - Remover/ignorar `DATABASE_URL`/`DIRECT_URL` para WhatsApp.  
  - Definir `WHATSAPP_DATABASE_URL`, `WHATSAPP_DIRECT_URL`, `WHATSAPP_SUPABASE_URL`, `WHATSAPP_SUPABASE_SERVICE_ROLE_KEY` (e opcionalmente `WHATSAPP_SUPABASE_ANON_KEY`) para o projeto Supabase/PostgreSQL dedicado.
- [ ] **4.5** Atualizar **envs de deploy** (ex.: Vercel):  
  - Nas variáveis do projeto do **whatsapp-webhook-api** e do **whatsapp-platform**, configurar as mesmas `WHATSAPP_*` com os valores do banco/Supabase dedicado.  
  - Não usar mais `DATABASE_URL`/`DIRECT_URL`/Supabase genérico para esses apps.
- [ ] **4.6** Redeploy **whatsapp-webhook-api** (preview ou produção, conforme ambiente).
- [ ] **4.7** Redeploy **whatsapp-platform** (preview ou produção).
- [ ] **4.8** Confirmar que todas as leituras/escritas do produto WhatsApp passam a usar apenas o novo banco (sem acessar o shared). Executar o checklist de validação de fluxos (seção 5).
- [ ] **4.9** Documentar horário do cutover e versões deployadas para possível rollback.

---

## 5. Checklist de validação de fluxos

Após o cutover, validar (em ambiente alvo: staging ou produção):

- [ ] **Signup** — novo usuário consegue se cadastrar e aparece em `whatsapp_users` / tenant.
- [ ] **Login** — login com email/senha e sessão OK.
- [ ] **GET /api/tenants/me** — retorna tenant correto (Prisma/Supabase do dedicado).
- [ ] **Onboarding** — fluxo de onboarding do tenant (passos e persistência no novo DB).
- [ ] **Tenant creation/read** — criar e ler tenant; dados só no banco dedicado.
- [ ] **Webhook inbound** — mensagem recebida pelo webhook é gravada e associada à conversa (conversations/messages).
- [ ] **Resposta automática** — resposta gerada e salva em `whatsapp_messages`.
- [ ] **FAQ** — resposta baseada em FAQ; uso de `whatsapp_faqs` e gravação de mensagem.
- [ ] **Escalação/fila** — conversa entrando em fila e aparecendo em `whatsapp_conversation_queue` e fluxo de agentes.
- [ ] **Agentes** — status em `whatsapp_agent_status`; atribuição e conclusão de conversa.
- [ ] **Métricas** — dashboards e rotas de métricas (ex.: `/admin/metrics`, `/api/ops/metrics`) usando dados do novo DB.
- [ ] **Feedback** — registro em `whatsapp_message_feedback` e exibição onde aplicável.
- [ ] **Export CSV** — exportação de conversas/mensagens usando dados do dedicado.
- [ ] **CRM webhook** — disparo para `crm_webhook_url` do tenant e qualquer persistência no novo DB.
- [ ] **Checkout / billing** — fluxo de plano (Stripe checkout) e atualização de tenant (plan, active_until, stripe_customer_id).
- [ ] **Stripe webhook** — evento Stripe que atualiza tenant (billing) persiste no banco dedicado.

---

## 6. Confirmação: nenhum dado novo no banco antigo

- Após cutover, **não** definir `DATABASE_URL`/`DIRECT_URL`/Supabase genérico para os serviços WhatsApp; assim o código não conecta ao shared.
- Opcional: em período de observação, checar no banco compartilhado que as tabelas `whatsapp_*` não aumentam de volume (ou que só há writes conhecidos de rollback/emergência).

---

## 7. Plano de rollback

### Gatilhos objetivos para rollback

- Aumento relevante de erros 5xx ou falhas em health check dos apps WhatsApp.
- Falha de fluxos críticos: webhook não persiste mensagens, login/tenants quebrados, Stripe webhook não atualiza tenant.
- Decisão de negócio (incidência grave e necessidade de voltar ao estado anterior).

### Passos de rollback (checklist)

- [ ] **7.1** Restaurar envs anteriores nos projetos de deploy (whatsapp-webhook-api e whatsapp-platform):  
  - Recolocar `DATABASE_URL` e `DIRECT_URL` (e, se o platform ainda usava, `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`) apontando para o **banco compartilhado** (e Supabase antigo, se aplicável).  
  - Nota: o código atual (pós–Block 1) usa apenas `WHATSAPP_*`. Para rollback rápido, duas opções: (a) reverter o deploy para uma versão anterior que ainda use `DATABASE_URL`/Supabase genérico, ou (b) temporariamente definir `WHATSAPP_DATABASE_URL`/`WHATSAPP_DIRECT_URL`/`WHATSAPP_SUPABASE_*` com os valores do **shared** (reativando o banco antigo como “alvo” do WhatsApp).
- [ ] **7.2** Redeploy **whatsapp-webhook-api** com as envs restauradas.
- [ ] **7.3** Redeploy **whatsapp-platform** com as envs restauradas.
- [ ] **7.4** Validar login, webhook e um fluxo de conversa contra o banco antigo.
- [ ] **7.5** Comunicar e registrar o rollback; replanejar cutover após análise.

---

## 8. Plano de cleanup (banco compartilhado)

- **Não** dropar ou truncar tabelas `whatsapp_*` no shared imediatamente após o cutover.
- **Congelar** as tabelas WhatsApp no shared: considerar tornar as tabelas (ou o schema) somente leitura se possível, ou pelo menos não mais escritas pelo código em produção.
- **Marcar como legado:** documentar no repositório e no runbook que as tabelas `whatsapp_*` no banco compartilhado estão descontinuadas a partir da data do cutover e que o source of truth é o banco dedicado.
- **Remoção futura:** definir um prazo (ex.: 30–90 dias após cutover estável, sem rollback). Antes de remover:  
  - Garantir backups do shared com essas tabelas.  
  - Confirmar que nenhum processo (relatórios, scripts, Financeiro) depende delas.  
  - Remover então as tabelas (ou o schema) em uma janela de manutenção, com rollback possível via restore de backup se necessário.

---

## 9. Riscos e mitigações

| Risco | Mitigação |
|-------|------------|
| Perda de dados na migração | Backup completo do banco origem antes da cópia; validar contagens e FKs (seção 3). |
| Downtime no cutover | Cutover apenas com envs + redeploy; sem alteração de código. Manter janela curta e comunicada. |
| Env errada em produção | Checklist 4.4 e 4.5; conferir em staging primeiro; usar nomes explícitos `WHATSAPP_*`. |
| Rollback lento | Documentar passos 7.1–7.5 e ter versão anterior ou envs “old” prontas para reverter. |
| Financeiro impactado | Nenhuma alteração em código ou config do Financeiro; envs e tabelas do WhatsApp isoladas. |
| Escrita acidental no shared | Não configurar `DATABASE_URL`/Supabase genérico para apps WhatsApp; código já usa só `WHATSAPP_*`. |
| Schema desalinhado no dedicado | Rodar `prisma migrate deploy` no webhook-api antes de migração de dados e cutover. |

---

## 10. Resumo dos entregáveis Block 2

- **Modo recomendado:** clean start ou migração de dados (decisão conforme seção 1).
- **Cutover:** checklist exato na seção 4.
- **Validação:** checklist de fluxos na seção 5; validação de integridade na seção 3.
- **Rollback:** checklist na seção 7 e gatilhos objetivos.
- **Cleanup:** congelar tabelas legadas no shared, marcar como legado, remover apenas após prazo e checagens (seção 8).
- **Riscos e mitigações:** tabela na seção 9.
- **Script de migração de dados:** `scripts/whatsapp-migrate-data-to-dedicated-db.mjs` (uso opcional; ver seção 2).
