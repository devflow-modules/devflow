# Operação avançada da Inbox

Documentação do fluxo de atendimento, atribuição, status, tags e SLA da inbox WhatsApp Platform.

## Visão geral

A inbox permite operação em nível de equipe: atribuição de conversas, status (aberta/pendente/fechada), tags e indicadores de SLA (tempo de resposta).

## Fluxo de atendimento

1. **Cliente envia mensagem** → thread é criada ou atualizada com status **OPEN**; `lastCustomerMessageAt` é atualizado.
2. **Agente responde** → `lastAgentReplyAt` é atualizado; na primeira resposta do agente, `firstResponseAt` é preenchido.
3. **Status** pode ser alterado manualmente para **PENDING** (aguardando cliente) ou **CLOSED** (encerrada).

## Atribuição (Assign)

- **Atribuir a mim:** a conversa fica sob responsabilidade do usuário logado.
- **Atribuir a outro:** escolher um usuário do mesmo tenant na lista.
- **Desatribuir:** remover a atribuição.

**API:** `POST /api/inbox/conversations/:id/assign`

- Body `{}` ou `{ userId: "me" }` → atribui ao usuário logado.
- Body `{ userId: "<id>" }` → atribui ao usuário indicado.
- Body `{ unassign: true }` → desatribui.

**Serviço:** `threadAssignmentService.ts` — `assignThread`, `unassignThread`, `getAssignedThreads`, `listUsersByTenant`.

## Status

- **OPEN** — em atendimento / aguardando resposta do agente.
- **PENDING** — aguardando retorno do cliente.
- **CLOSED** — conversa encerrada.

**API:** `POST /api/inbox/conversations/:id/status`  
Body: `{ status: "OPEN" | "PENDING" | "CLOSED" }`.

**Regra automática:** `CLOSED` + nova mensagem **inbound** válida → `OPEN` (reabertura automática). O mesmo aplica-se a `PENDING` + inbound → `OPEN`. Implementação: `autoUpdateStatusOnNewMessage` → `updateThreadStatus` após persistir o inbound.

**Idempotência:** selecionar o status já atual (ex.: `OPEN` → `OPEN`, `CLOSED` → `CLOSED`) é no-op — não gera nova métrica, audit log, evento realtime nem automação `STATUS_CHANGED`. A persistência usa compare-and-set (`updateMany` com `status` esperado); em corrida, há retry limitado e a API pode responder `409` se o estado continuar divergente.

**Auditoria:** mudanças reais registam `status_change` com metadata `{ previousStatus, status }`. Logs antigos podem ter apenas `{ status }`.

## Tags

- Tags são **por tenant** (nome e cor).
- Várias tags podem ser associadas a uma conversa.

**APIs:**

- `GET /api/inbox/tags` — lista tags do tenant.
- `POST /api/inbox/tags` — cria tag (`{ name, color? }`).
- `GET /api/inbox/conversations/:id/tags` — tags da conversa.
- `POST /api/inbox/conversations/:id/tags` — adiciona/remove tag (`{ tagId, action: "add" | "remove" }`).

**Serviço:** `tagService.ts` — `createTag`, `listTagsByTenant`, `assignTagToThread`, `removeTagFromThread`, `getTagsForThread`.

## SLA

- **Tempo até 1ª resposta:** entre a primeira mensagem do cliente (ou abertura do thread) e `firstResponseAt`.
- **Tempo de resposta:** entre `lastCustomerMessageAt` e `lastAgentReplyAt`.
- **Aguardando resposta:** quando há `lastCustomerMessageAt` e ainda não há `lastAgentReplyAt` — exibido como “Aguardando há Xm”.

**Serviço:** `slaService.ts` — `calculateFirstResponseTime`, `calculateResponseTime`, `getSlaStatus`.  
Na UI, o header do chat exibe um texto resumido (ex.: “Respondido em 2m”, “Aguardando há 5m”).

## Filtros na lista de conversas

**API:** `GET /api/inbox/conversations`

Query params:

- `status` — OPEN | PENDING | CLOSED
- `assignedTo` — `me` (minhas), `unassigned` (sem dono) ou `<userId>`
- `tag` — id da tag
- `priority` — LOW | MEDIUM | HIGH
- `limit`, `offset` — paginação

Na sidebar da inbox, filtros rápidos: Todas, Minhas, Sem dono, Abertas, Pendentes, Fechadas.

## Modelos (Prisma)

- **WaInboxThread:** `assignedToUserId`, `status`, `priority`, `lastCustomerMessageAt`, `lastAgentReplyAt`, `firstResponseAt`.
- **WaInboxTag:** id, tenantId, name, color.
- **WaInboxThreadTag:** threadId, tagId (N:N).

## Multi-tenant

- Todas as operações são isoladas por `tenantId` (via JWT).
- Usuários listados para atribuição são apenas do mesmo tenant.
- Tags são por tenant.

## Referências

- Billing e métricas: [BILLING.md](./BILLING.md), [SAAS_METRICS.md](./SAAS_METRICS.md)
- Módulo inbox: `apps/whatsapp-platform/src/modules/inbox/`
