# Inbox send reconcile — UNKNOWN_OUTCOME

Operação mínima para ledger `wa_inbox_send_requests` quando um envio fica em `SENDING` sem evidência conclusiva da Meta.

## Significado de `UNKNOWN_OUTCOME`

Estado **fail-closed**: o pedido **não** foi comprovado como falha pré-Meta nem como aceite Meta. A tentativa original **não** é elegível a `claimSendForMeta` (só `PENDING` / `FAILED_PRE_META`). Timeout de staleness **não** é prova de falha pré-Meta e **nunca** autoriza reenvio automático.

Não existe API Meta para consultar por `clientRequestId`. Sem `waMessageId`, não há lookup seguro.

## Máquina (resumo)

| Situação | Ação |
| --- | --- |
| `SENDING` recente (&lt;5 min default) | Intocado |
| `SENDING` stale + `waMessageId` | CAS → `META_ACCEPTED`, completa persistência local (sem Meta) |
| `SENDING` stale sem evidência | CAS → `UNKNOWN_OUTCOME` |
| `META_ACCEPTED` | Só persistência local |
| `COMPLETED` / `META_ACCEPTED` | Nunca reenviam |

## Superfícies

- `POST /api/cron/inbox-send-reconcile` — Bearer `CRON_SECRET` (igualdade exacta); `dryRun=1` não muta; lote máx. 50; **sem** escolha arbitrária de tenant no cron global.
- `GET\|POST /api/admin/inbox-send-requests` — manager+, tenant-scoped.
- `POST /api/admin/inbox-send-requests/[id]/acknowledge` — manager+, tenant-scoped; **não** chama Meta.

## Acknowledge (semântica)

Reconhecer **não** libera retry. O status permanece `UNKNOWN_OUTCOME`. Só grava `lastError` com prefixo `RESOLVED|` (actor + nota curta). Auditoria sem texto de mensagem, telefone, token ou payload Meta. Repetição é idempotente.

## Rollout

1. Aplicar migration `20260804160000_wa_inbox_send_unknown_outcome` em Production.
2. Só depois fazer deploy do código que escreve/lê `UNKNOWN_OUTCOME`.

## Riscos residuais

`updatedAt` é proxy do claim `SENDING` (não há `claimedAt` dedicado). Logs/métricas não incluem corpo de mensagem.
