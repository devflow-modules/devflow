# Filas e atendentes — WhatsApp Platform

Documentação do módulo de filas e agentes (Fase 2 do sprint operacional).

---

## 1. Schema (Supabase)

- **queues** — filas por tenant: `id`, `tenant_id`, `name`, `slug`, `settings`, `max_size`, `created_at`, `updated_at`.
- **agents** — atendentes por tenant: `id`, `tenant_id`, `name`, `email`, `status` (`available` | `busy` | `offline`), `settings`, `created_at`, `updated_at`.
- **conversation_assignments** — histórico de atribuições: `conversation_id`, `agent_id`, `assigned_at`, `completed_at`.
- **conversations** — campos adicionados: `queue_id`, `assigned_agent_id`; status estendido: `open`, `waiting_queue`, `waiting`, `assigned`, `in_progress`, `resolved`, `closed`.

Executar o conteúdo de `apps/whatsapp-platform/supabase/schema.sql` no projeto Supabase. Em bases já existentes, rodar migrações para adicionar `queues`, `agents`, `conversation_assignments` e a coluna `queue_id` em `conversations`.

---

## 2. Módulos

- **queues** — `queuesRepository` (CRUD), `queueRoutingService` (resolve fila por tenant/mensagem), `distributionService` (selectNextAgent: round_robin, least_loaded, random).
- **agents** — `agentsRepository` (CRUD), `countActiveConversationsByAgent`.
- **conversations** — `setConversationQueue`, `assignConversationToAgent`, `listConversationsByStatus`.

---

## 3. APIs REST

| Método | Rota | Descrição |
|--------|------|------------|
| GET | /api/queues?tenant_id= | Listar filas do tenant |
| POST | /api/queues | Criar fila (body: tenant_id, name, slug, max_size?) |
| GET | /api/agents?tenant_id= | Listar agentes do tenant |
| POST | /api/agents | Criar agente (body: tenant_id, name, email?, status?) |

Rotas PATCH/DELETE para `/api/queues/[id]` e `/api/agents/[id]` podem ser adicionadas conforme necessidade.

---

## 4. Fluxo de roteamento (webhook)

1. Nova mensagem → `findOrCreateConversation`.
2. (Opcional) `resolveQueueForConversation(tenantId)` → retorna fila padrão ou por intent.
3. Se fila existir: `setConversationQueue(conversationId, queueId)`.
4. `selectNextAgent(tenantId, queueId)` → agente disponível (ex.: least_loaded).
5. Se agente existir: `assignConversationToAgent(conversationId, agentId)`.

O webhook atual ainda não aplica filas/agentes automaticamente; a infraestrutura está pronta para integrar quando habilitado.

---

## 5. Dashboard

- **/dashboard** — visão geral; exibir totais de filas, conversas pendentes e agentes (quando as páginas forem conectadas aos novos endpoints).
- **/conversations** — listar por status (waiting_queue, assigned, in_progress).
- **/agents** — listar agentes com status e contagem de conversas ativas.

Variáveis de ambiente: nenhuma nova obrigatória; opcional `WHATSAPP_QUEUE_MAX_SIZE` para limite global por fila.
