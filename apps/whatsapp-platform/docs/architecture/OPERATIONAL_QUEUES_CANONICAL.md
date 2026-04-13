# Filas operacionais — fonte de verdade (WhatsApp Platform)

Este documento fixa o **domínio canónico** de filas de atendimento alinhado à Inbox Prisma. Não existe fila operacional paralela em outro módulo de código.

---

## 1. Modelo de dados (Prisma)

| Entidade | Tabela | Papel |
|----------|--------|--------|
| `WaInboxQueue` | `wa_inbox_queues` | Fila por tenant: nome, slug único por tenant, cor, SLA alvo (minutos), ativo/inativo. |
| `WaInboxQueueMembership` | `wa_inbox_queue_memberships` | Utilizadores que podem atender nessa fila. |
| `WaInboxThread` | `wa_inbox_threads` | Conversa/thread; campo opcional `queueId` associa a conversa a uma fila operacional. |

Relações: ver `prisma/schema.prisma` (`WaInboxQueue`, `WaInboxQueueMembership`, `WaInboxThread`).

---

## 2. Serviço e regras de negócio

- **`src/modules/inbox/inboxOperationalQueueService.ts`** — único sítio de lógica de negócio para CRUD de filas, métricas por fila, listagens usadas pela inbox e pela página de gestão.

Outros ficheiros em `modules/inbox/` que mencionam filas (ex. `waInboxQueueService.ts`) tratam de **comportamento de threads em fila** (pendentes, roteamento inbox), não do repositório Supabase legado `queues`.

---

## 3. UI e API canónicas

| Camada | Caminhos |
|--------|----------|
| Página | `src/app/queues/` (`page.tsx`, `QueuesClient.tsx`, `layout.tsx`) |
| API tenant | `src/app/api/queues/route.ts`, `src/app/api/queues/[id]/route.ts`, `src/app/api/queues/[id]/members/route.ts` |
| Atribuição de conversa | `src/app/api/inbox/conversations/[id]/queue/route.ts` (alterar `queueId` da thread) |

Autenticação e roles seguem `modules/auth` (ex.: operacional vs gestor para criar filas).

---

## 4. Relação conversa ↔ fila

1. Cada **thread** (`WaInboxThread`) pode ter `queueId` preenchido ou `null`.
2. A inbox filtra e apresenta filas operacionais obtidas via **`GET /api/queues`** (opções de refinamento em `inboxFetch.ts`).
3. Mudanças de fila na UX passam pelas rotas `/api/inbox/conversations/...` conforme implementação actual.

Não usar tabelas Supabase `queues` / `conversations` antigas para definir fila operacional na UX actual.

---

## 5. O que não é fonte de verdade

- Tabela Supabase **`queues`** e qualquer repositório que a leia para “filas operacionais” — **não** faz parte do domínio canónico da inbox actual.
- **`src/app/api/admin/queues/route.ts`** — endpoint de staff para listar threads pendentes (operacional interno), **não** substitui o CRUD de `WaInboxQueue`.

---

## 6. Evolução (roteamento automático / distribuição)

A distribuição automática de conversas para agentes (round-robin, carga) deve, quando existir, assentar em **`WaInboxQueue`**, `WaInboxQueueMembership` e threads Prisma — não recriar um segundo modelo de filas.

---

## Referências cruzadas

- `docs/architecture/LEGACY-CLEANUP.md` — secção de filas e remoção do módulo legado.
- `docs/architecture/CONVERSATION_OWNERSHIP_AND_HANDOFF.md` — quem trata a conversa (`assignedToUserId`) vs fila (`queueId`).
- `docs/whatsapp/WHATSAPP_QUEUES_AND_AGENTS.md` — visão histórica + ponte para este documento.
