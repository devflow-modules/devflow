# Relatório final — Validação Financeiro (Smoke + Real + RLS)

**Última execução:** 2026-03-18  
**Escopo:** `apps/financeiro` — API `/api/*`, serviços Prisma, app Next (porta 3001).

---

## Resumo executivo — **GO**

| Dimensão | Resultado |
|----------|-----------|
| Smoke HTTP + UI entrada | **OK** — `/api/health` + tela de auth; ver ressalvas UX |
| Fluxo Marques Soares (cálculos) | **OK** — E2E dedicado |
| Isolamento household (User B) | **OK** — E2E serviços + API pattern |
| `User.supabaseId` | **OK** na base auditada (script) |
| E2E Vitest | **7/7 passando** |

**Status:** **GO** — com ressalva: rota `/login` retorna 404 (login real em `/ferramentas/financeiro/auth`). Validação RLS via **PostgREST + JWT** não foi executada aqui (apenas isolamento por `householdId` na API/serviços).

---

## Tarefa 1 — Smoke (executado)

| # | Passo | Resultado |
|---|--------|------------|
| — | `GET /api/health` | `200`, `db: connected` |
| — | Navegador `/ferramentas/financeiro/auth` | Formulário Entrar + Google; sem erro crítico no console (apenas DevTools/HMR) |
| — | `/ferramentas/financeiro/contas` sem sessão | Redireciona para auth (**OK**) |
| — | `/login` | **404** — UX ruim para quem espera `/login` |

**Login completo → criar conta → …** não executado (credenciais não utilizadas nesta automação). Completar manualmente se quiser validar console pós-login.

---

## Tarefa 2 — Marques Soares (executado via E2E)

Teste `Cenário Marques Soares: 70/30, R$200 pago por Gustavo…` em `e2e/financeiro-full-flow.e2e.ts`:

- Acerto Alexia → Gustavo **R$ 60**
- Pagamento **R$ 30** → `PARTIAL`
- Pagamento **R$ 30** → `COMPLETED`
- Estorno **R$ 30** no 2º pagamento → volta `PARTIAL`
- `closeAccountMonth` **2026-04** → OK + timeline com vários eventos

---

## Tarefa 3 — Isolamento / “RLS lógico” (executado)

E2E **User B** (usuário e household B sem acesso a A):

- `getAccount(accA, householdB)` → `null`
- `listAccounts(householdB)` não inclui conta de A
- `listSettlements(accA, householdB)` → `[]`
- `listPayments(accA, householdB)` → `[]`
- Despesas com `householdId = B` e `accountId` de A → **0**

**RLS no Postgres (role `authenticated` direto):** não testado neste sprint; políticas em `RLS_FINANCEIRO.sql`.

---

## Tarefa 4 — `supabaseId` (executado)

Script:

```bash
cd apps/financeiro && pnpm run validate:supabase-user
```

Equivalente SQL (Supabase):

```sql
SELECT id, email, "supabaseId" FROM "User" ORDER BY "createdAt" DESC LIMIT 50;
```

**Resultado na base auditada:** todos os usuários com `supabaseId` preenchido; contagem `sem supabaseId = 0`. Conferência `supabaseId = auth.users.id` linha a linha: fazer no SQL Editor se necessário.

---

## Tarefa 5 — E2E completo (executado)

```bash
cd apps/financeiro
pnpm exec dotenv -e ../../.env.local -e .env -- sh -c 'export FINANCEIRO_TEST_DATABASE_URL="$DIRECT_URL" && pnpm run test:e2e'
```

**7 testes:** fluxo 1–9, Marques Soares, isolamento B, idempotência, overpay, estorno excessivo, PARTIAL sem duplicar par.

---

## Problemas / UX / segurança

| ID | Tipo | Descrição |
|----|------|-----------|
| U1 | UX | **`/login` → 404**; documentar ou redirecionar para `/ferramentas/financeiro/auth`. |
| S1 | Info | Isolamento em produção = **API + householdId**; Prisma não passa por RLS. |
| S2 | OK | Nenhum vazamento nos serviços testados entre households A/B. |

---

## Decisão final

- [x] Tarefa 1 parcial (health + auth + redirect; login completo manual opcional)  
- [x] Tarefa 2 Marques Soares (E2E)  
- [x] Tarefa 3 isolamento B (E2E)  
- [x] Tarefa 4 `supabaseId` (script)  
- [x] Tarefa 5 E2E 7/7  

**Status:** **GO** (com ressalva U1).

---

*E2E e script alteram apenas DB de teste (E2E) ou leitura (validate). Servidor dev usado só para smoke local.*
