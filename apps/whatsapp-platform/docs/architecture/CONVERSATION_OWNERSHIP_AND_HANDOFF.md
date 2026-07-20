# Conversa — assignment, ownership, handoff e libertação

Fonte de verdade para **operação humana** sobre threads da inbox: modelo Prisma `WaInboxThread` + serviço `threadAssignmentService`. Não usar tabelas Supabase legadas (`agents`, `conversations`) para semântica de atribuição.

---

## 1. Linguagem canónica

| Termo | Significado | Persistência |
|--------|-------------|----------------|
| **Assignment (atribuição)** | Ação de definir **qual utilizador do tenant** é o responsável humano pela thread. | `WaInboxThread.assignedToUserId` |
| **Ownership (posse)** | Estado derivado: “quem é o dono humano **agora**”. Na prática é o mesmo campo: **não existe coluna separada** `owner_id`. | `assignedToUserId` |
| **Claim** | Assumir conversa **sem** responsável: `null → operador` (CAS first-writer-wins). | `assignThread` |
| **Transferência** | Passagem explícita: `responsável atual → novo responsável`. | `assignThread` |
| **Release / libertação** | Remover o responsável humano: `unassignThread` → `assignedToUserId = null`. | update + audit + evento realtime (só se mudou) |
| **Handoff** | Na UX, qualquer transferência ou claim que muda o responsável. IA/automação não “possuem” via `assignedToUserId`; com humano atribuído, resposta automática da IA permanece bloqueada pelos guards atuais. |

**Resposta directa:** *donos* no modelo actual = **um campo** (`assignedToUserId`). *Ownership* e *assignment* colapsam no mesmo facto persistido; a nuance é só linguagem (ação vs estado).

---

## 2. Política de produto (lifecycle)

### Claim

- Operador pode assumir **apenas** conversa sem responsável (`null → caller/target`).
- Se já houver responsável **diferente**, resultado `conflict` → HTTP **409**.
- Se já estiver atribuída ao próprio destino, sucesso **idempotente** (`changed: false`) sem audit/realtime/AgentStatus.

### Transferência

- Ação explícita: owner atual → novo responsável.
- Podem transferir: **responsável atual**, `manager`, `platform_admin` (e ator `system` em automações com `userId` explícito).
- Operador comum **não** pode transferir conversa alheia → `forbidden` → **403**.
- Destino deve existir no mesmo tenant e ter role operacional (`operator` | `manager` | `platform_admin`). Não há `isActive` no schema; não inventar.

### Liberação

- Podem liberar: responsável atual, `manager`, `platform_admin` (e `system`).
- Operador comum não libera conversa alheia → **403**.
- `null → null` é **no-op** (sem audit, realtime, métricas nem timestamps).

### Status e ownership

- **Fechar** conversa **não** remove `assignedToUserId`.
- **Reabrir** manualmente **não** remove `assignedToUserId`.
- `CLOSED` + inbound → `OPEN` **conserva** o responsável (continuidade em “Minhas conversas”; evita reativar IA sem contexto humano).
- Mudança de ownership em thread `CLOSED` é rejeitada (`closed` → HTTP **409**).

### IA

- Enquanto houver `assignedToUserId`, os guards atuais continuam a bloquear resposta automática da IA.
- Liberar (`assignedToUserId = null`) torna a conversa novamente elegível para IA, conforme esses guards.

### Concorrência (CAS)

- Claim: `updateMany` com `assignedToUserId: null` (+ `tenantId`/`id`, status ≠ CLOSED).
- Transferência/liberação: CAS com `assignedToUserId: previousAssigneeId`.
- Após CAS miss: reler e distinguir `not_found` | sucesso idempotente | `forbidden` | `conflict`.
- Contrato HTTP (rota inbox): **400** payload | **401** auth | **403** permissão | **404** thread/destino | **409** conflito/CLOSED | **200** sucesso real ou idempotente.

### Automação `userId: auto`

- **Não** escolher o “primeiro utilizador do tenant”.
- Nesta versão: erro explícito `automatic_assignment_not_configured`.
- Round-robin / filas de routing: **follow-up** (fora de escopo).
- Assignment por automação com `userId` explícito passa pelas mesmas validações (tenant, destino operacional, CAS) com `callerRole: "system"`.

---

## 3. Resultado discriminado

```ts
type AssignmentResult =
  | { ok: true; changed: boolean }
  | {
      ok: false;
      reason:
        | "not_found"
        | "target_not_found"
        | "forbidden"
        | "conflict"
        | "closed";
    };
```

Não usar exceções para resultados operacionais esperados.

---

## 4. Matriz de autorização (resumo)

| Ação | Sem owner | Sou owner | Outro owner |
|------|-----------|-----------|-------------|
| Claim (para mim) | ✅ (CAS) | no-op | 409 conflict |
| Transferir | ✅ (atribuir)¹ | ✅ | ❌ operador / ✅ manager+ |
| Liberar | no-op | ✅ | ❌ operador / ✅ manager+ |

¹ Em unassigned, atribuir a um destino operacional é permitido a quem chama a API com auth válida (claim/assign); a UI mostra “Assumir” e o menu de responsável.

---

## 5. Relação com filas operacionais

- **Fila** (`queueId`): classificação/rota operacional da thread (WaInboxQueue).
- **Assignment**: quem trata entre humanos.
- Uma thread pode ter **fila** e **sem** humano atribuído (fila à espera de “Assumir”).
- Mudar fila: rotas `/api/inbox/conversations/[id]/queue` + `inboxOperationalQueueService` (ver `OPERATIONAL_QUEUES_CANONICAL.md`).

---

## 6. Serviços e rotas canónicas

| Responsabilidade | Onde |
|------------------|------|
| Claim / transferir / desatribuir + auditoria + realtime + `whatsapp_agent_status` | `src/modules/inbox/threadAssignmentService.ts` |
| Listagem de “agentes” para UI | `src/modules/inbox/operationsAgentsService.ts` |
| API produto (inbox) | `POST /api/inbox/conversations/[id]/assign` — `{ userId }`, `{ unassign: true }`, ou omitir `userId` / `"me"` para assumir |
| API staff (admin) | `POST /api/admin/conversations/[id]/assign` — mesmo serviço |
| Próxima da fila + atribuir | `GET /api/inbox/queue/next` — `assignThread` com role do JWT |
| Presença manual | `GET/PATCH /api/admin/agent-status` |

---

## 7. Auditoria e realtime

- Assign/transfer: metadata `{ previousAssigneeId, assignedToUserId }`.
- Unassign: `{ previousAssigneeId, assignedToUserId: null }`.
- UI (`ChatAuditTab`): `Sem responsável → Ana`, `Ana → Bruno`, `Bruno → Sem responsável`; fallback para logs legados só com `assignedToUserId`.
- Evento `conversation.assigned` permanece compatível; campo opcional `previousAssigneeId` nos payloads novos.
- Side effects (audit, realtime, AgentStatus) **somente** quando `changed: true`.

---

## 8. UI (inbox)

- **Assumir:** thread sem responsável e `status !== CLOSED`.
- **Liberar:** owner atual, ou manager/platform_admin.
- **Transferir (menu):** owner da própria conversa; manager/platform_admin qualquer; operador comum **não** altera owner alheio.
- Sem controlos de ownership em `CLOSED` (somente leitura do responsável).
- Erros de assign: alerta acessível (`role="alert"`), PT-BR, limpar em nova tentativa.

---

## 9. O que foi removido / não usar

- **`src/modules/agents/*`** (Supabase `agents`): removido.
- **Overwrite last-write-wins** sem CAS / “roubo” silencioso: proibido pela política acima.
- **`userId: auto`** como “primeiro user do tenant”: bloqueado.

---

## 10. Validação rápida

- Dois operadores assumem a mesma unassigned → um **200**, outro **409**.
- Fechar e reabrir (manual ou inbound) → `assignedToUserId` intacto.
- Libertar → campo `null`; IA elegível de novo conforme guards.
- Nenhum import de `@/modules/agents` (ESLint bloqueia reintrodução).
