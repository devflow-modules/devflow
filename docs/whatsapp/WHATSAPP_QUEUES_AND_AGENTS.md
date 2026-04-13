# Filas e atendentes — WhatsApp Platform

> **Actualização (consolidação de domínio):** a pilha operacional de **filas de atendimento** na Inbox e na página **Filas operacionais** é **100% Prisma** (`WaInboxQueue`, membros, `WaInboxThread.queueId`). O texto abaixo descreve o desenho **histórico** baseado em Supabase (`queues`, `agents`, `conversations`) usado em fases anteriores; **não** é a fonte de verdade do código actual.

**Fonte de verdade actual:** [`apps/whatsapp-platform/docs/architecture/OPERATIONAL_QUEUES_CANONICAL.md`](../../apps/whatsapp-platform/docs/architecture/OPERATIONAL_QUEUES_CANONICAL.md).

---

## 1. Schema (Supabase) — legado / referência histórica

- **queues** — filas por tenant: `id`, `tenant_id`, `name`, `slug`, `settings`, `max_size`, `created_at`, `updated_at`.
- **agents** — atendentes por tenant: `id`, `tenant_id`, `name`, `email`, `status` (`available` | `busy` | `offline`), `settings`, `created_at`, `updated_at`.
- **conversation_assignments** — histórico de atribuições: `conversation_id`, `agent_id`, `assigned_at`, `completed_at`.
- **conversations** — campos adicionados: `queue_id`, `assigned_agent_id`; status estendido: `open`, `waiting_queue`, `waiting`, `assigned`, `in_progress`, `resolved`, `closed`.

O módulo TypeScript `src/modules/queues/*` (repositório Supabase + routing + distribuição) **foi removido** por não ter consumidores e duplicar o conceito de fila face ao modelo Prisma.

---

## 2. Módulos (estado actual)

- **Filas operacionais canónicas:** `inboxOperationalQueueService` + rotas `/api/queues` (ver documento canónico).
- **agents / conversations (Supabase):** podem ainda existir chamadas pontuais noutros módulos; não definem a fila da Inbox Prisma.

---

## 3. APIs REST (canónicas para filas Prisma)

| Método | Rota | Descrição |
|--------|------|------------|
| GET | `/api/queues` | Listar filas + métricas (sessão; roles operacionais). |
| POST | `/api/queues` | Criar fila (gestores). |
| PATCH/DELETE | `/api/queues/[id]` | Atualizar / remover fila. |
| * | `/api/queues/[id]/members` | Membros da fila. |

Rotas `/api/agents` legadas (se existirem no projecto) referem-se ao modelo Supabase, não ao membership em `WaInboxQueueMembership`.

---

## 4. Fluxo de roteamento (webhook) — nota

Qualquer roteamento automático de novas mensagens para fila/agente deve alinhar com **threads Prisma** e `WaInboxQueue`, não com `resolveQueueForConversation` sobre a tabela Supabase `queues` (removido).

---

## 5. Dashboard

- **/queues** — gestão de filas operacionais (canónico).
- **/inbox** — atendimento com refinamento por fila.

Variáveis de ambiente: nenhuma nova obrigatória específica a este documento histórico.
