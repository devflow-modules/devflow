# Padrão oficial para novas features do módulo Financeiro

Todo desenvolvimento de **nova feature** no domínio financeiro deve seguir esta ordem e estrutura. Objetivo: consistência, testabilidade e observabilidade.

---

## Fluxo de desenvolvimento (ordem obrigatória)

1. **Schema** — Validação e forma dos dados (Zod).
2. **Type/contract** — Tipos de domínio e DTOs (quando necessário).
3. **Service** — Lógica de negócio (sem Next.js, sem request/response).
4. **Route / page** — Camada HTTP ou UI: valida auth, valida input, chama service, devolve resposta.
5. **Test** — Testes do service (e, quando fizer sentido, da rota).
6. **Observability event** — Log de evento de domínio (ex.: `finance.expense.created`).

---

## Estrutura de uma feature

Exemplo: feature “arquivar despesa”.

### 1. Schema

Em `src/modules/financeiro/schemas/index.ts` (ou arquivo dedicado se crescer):

```ts
export const expenseArchiveSchema = z.object({
  archivedAt: z.string().datetime().optional(),
});
```

### 2. Type/contract

Em `src/modules/financeiro/types/domain.ts` ou no próprio service, se for uso interno:

```ts
export type ArchiveExpenseInput = { expenseId: string; archivedAt?: string };
```

### 3. Service

Em `src/modules/financeiro/services/expenses/archiveExpense.ts`:

- Recebe `prisma`, `householdId`, e DTO (ex.: `ArchiveExpenseInput`).
- Não recebe `NextRequest`, cookies ou headers.
- Retorna resultado tipado (ex.: entidade atualizada ou `{ ok: false, code: "..." }`).
- Opcional: chama `financeLogger.info("finance.expense.archived", { expenseId, householdId })`.

### 4. Route (ou page)

Em `src/app/api/expenses/[expenseId]/archive/route.ts`:

- Valida auth (ex.: `requireHouseholdMembership`).
- Valida input com o schema Zod.
- Obtém `prisma` do adapter `getPrisma()` (ou `prisma` de `adapters/prisma`).
- Chama o service com os dados já resolvidos.
- Retorna `sendSuccess` ou `sendError` (e, se aplicável, seta cookies via adapter).

### 5. Test

Em `src/modules/financeiro/__tests__/services/expenses/archiveExpense.test.ts`:

- Mock do `prisma` (e de `auditLog` se o service usar auditoria).
- Casos: sucesso, lista vazia / não encontrado, household incorreto, role (se houver regra de autorização no service).

### 6. Observability event

- Usar `financeLogger` de `@/modules/financeiro/adapters/observability`.
- Eventos no formato `finance.<entidade>.<ação>` (ex.: `finance.expense.archived`).
- Incluir no payload: `householdId`, `userId` (quando fizer sentido), `entityId`, e outros campos úteis para análise.

Exemplo no service:

```ts
import { financeLogger } from "@/modules/financeiro/adapters/observability";

// após operação bem-sucedida
financeLogger.info("finance.expense.archived", {
  expenseId,
  householdId,
  userId: auditContext.userId,
});
```

---

## Checklist por feature

- [ ] Schema Zod criado/atualizado em `schemas/`.
- [ ] Tipos/DTOs definidos em `types/` ou no service.
- [ ] Service em `services/<domínio>/` sem dependência de Next.js.
- [ ] Rota (ou page) valida auth e input e chama apenas o service.
- [ ] Teste(s) em `__tests__/services/<domínio>/` com Prisma (e auth, se aplicável) mockados.
- [ ] Evento de domínio registrado com `financeLogger` quando a operação for relevante (criação, atualização, exclusão, ações críticas).

---

## Nomenclatura de eventos (observabilidade)

Padrão: `finance.<entidade>.<ação>`.

Exemplos já previstos no adapter:

- `finance.expense.created` / `updated` / `deleted`
- `finance.income.created` / `updated` / `deleted`
- `finance.rule.created` / `updated` / `deleted`
- `finance.source.created` / `updated` / `deleted`
- `finance.household.created` / `finance.household.transfer`
- `finance.invite.sent` / `revoked` / `accepted`
- `finance.member.removed`
- `finance.dashboard.viewed`
- `finance.error` (para erros de service/handlers)

Novas ações (ex.: `archived`, `restored`) seguem o mesmo padrão.
