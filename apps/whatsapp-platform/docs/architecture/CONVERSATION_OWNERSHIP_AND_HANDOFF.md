# Conversa — assignment, ownership, handoff e libertação

Fonte de verdade para **operação humana** sobre threads da inbox: modelo Prisma `WaInboxThread` + serviço `threadAssignmentService`. Não usar tabelas Supabase legadas (`agents`, `conversations`) para semântica de atribuição.

---

## 1. Linguagem canónica

| Termo | Significado | Persistência |
|--------|-------------|----------------|
| **Assignment (atribuição)** | Ação de definir **qual utilizador do tenant** é o responsável humano pela thread. | `WaInboxThread.assignedToUserId` |
| **Ownership (posse)** | Estado derivado: “quem é o dono humano **agora**”. Na prática é o mesmo campo: **não existe coluna separada** `owner_id`. | `assignedToUserId` |
| **Handoff** | Passagem de responsabilidade humana: **re-atribuir** a outro utilizador (ou para o mesmo). É uma nova chamada a `assignThread`, não um estado persistido à parte. IA/automação não preenchem `assignedToUserId`; quando o humano entra, a automação deixa de ser “dona” no sentido de UX (ver `human_handoff` em `aiAutomationService`). |
| **Release / libertação** | Remover o responsável humano: `unassignThread` → `assignedToUserId = null`. | update + audit + evento realtime |
| **Distribuição manual** | Qualquer atribuição feita por um operador (lista “Assumir”, cabeçalho “Atribuir”, API). Contrasta com fila automática futura; hoje **tudo passa por** `assignThread` / `unassignThread` ou rotas que os chamam. |

**Resposta directa:** *donos* no modelo actual = **um campo** (`assignedToUserId`). *Ownership* e *assignment* colapsam no mesmo facto persistido; a nuance é só linguagem (ação vs estado).

---

## 2. Relação com filas operacionais

- **Fila** (`queueId`): classificação/rota operacional da thread (WaInboxQueue).
- **Assignment**: quem trata entre humanos.
- Uma thread pode ter **fila** e **sem** humano atribuído (fila à espera de “Assumir”).
- Mudar fila: rotas `/api/inbox/conversations/[id]/queue` + `inboxOperationalQueueService` (ver `OPERATIONAL_QUEUES_CANONICAL.md`).

---

## 3. Serviços e rotas canónicas

| Responsabilidade | Onde |
|------------------|------|
| Atribuir / desatribuir + auditoria + realtime + sincronizar `whatsapp_agent_status` (busy / conversa actual) | `src/modules/inbox/threadAssignmentService.ts` — `assignThread`, `unassignThread` |
| Listagem de “agentes” para UI (utilizadores + presença + contagem de threads) | `src/modules/inbox/operationsAgentsService.ts` |
| API produto (inbox) | `POST /api/inbox/conversations/[id]/assign` — body `{ userId }`, `{ unassign: true }`, ou omitir `userId` para assumir como eu |
| API staff (admin) | `POST /api/admin/conversations/[id]/assign` — delega ao mesmo `assignThread` |
| Próxima da fila + atribuir ao utilizador autenticado | `GET /api/admin/queue/next` — chama `assignThread` (presença já no serviço) |
| Presença manual (available/busy/offline) | `GET/PATCH /api/admin/agent-status` |

---

## 4. Estados derivados (UX)

Estados como “A responder”, “Em atendimento” vêm de `waInboxConversationState` (pendência inbound + `assignedToUserId` + `status`), não de um enum “handoff”. Ver `docs/product/INBOX_STATE_MACHINE.md`.

---

## 5. O que foi removido / não usar

- **`src/modules/agents/*`** (Supabase `agents`): removido — sem consumidores; agente operacional = `User` + membership em filas + assignment em thread.
- **Duplicar `agentStatus.upsert` nas rotas** após `assignThread`: consolidado **dentro** de `threadAssignmentService` para uma única regra de presença ao atribuir/libertar.

---

## 6. Validação rápida

- Atribuir na inbox → `assignedToUserId` preenchido; opcionalmente verificar `whatsapp_agent_status` com `busy` e `current_conversation_id` = thread.
- Libertar → campo `null`; presença libertada se apontava para essa thread.
- Nenhum import de `@/modules/agents` (ESLint bloqueia reintrodução).
