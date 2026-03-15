# Resultado da Execução — PRE-DELETE-VERCEL-CHECKLIST

**Data:** 2026-03-15  
**Domínio testado:** https://devflowlabs.com.br

---

## Resumo

| Bloco | Status | Observação |
|-------|--------|------------|
| 1. Rotas | ✅ OK | Todas carregam; app redireciona para auth (307) quando não logado |
| 2. APIs | ⚠️ Parcial | health ✅; me ✅ (401 sem auth); leads ❌ 500; dashboard/summary ✅ 401 |
| 3. Banco | ⚠️ Falhou | `prisma migrate deploy` falhou: credenciais inválidas no DB |

**Conclusão:** Rotas e auth (Supabase) OK. API de leads retorna 500. Migrations não aplicadas — autenticação do banco falhou localmente (verificar `DATABASE_URL` no Vercel e rodar migrate em produção).

---

## 1. Rotas em produção ✅

| Rota | HTTP | Resultado |
|------|------|-----------|
| `/` | 200 | ✅ Home |
| `/ferramentas/financeiro` | 200 | ✅ Landing + simulador + lead capture |
| `/ferramentas/financeiro/auth` | 200 | ✅ Login/cadastro |
| `/ferramentas/divisao-de-contas` | 200 | ✅ Calculadora |
| `/planilha-vs-app-financeiro` | 200 | ✅ Comparativo SEO |
| `/ferramentas/financeiro/dashboard` | 307 | ✅ Redirect → `/ferramentas/financeiro/auth` (exige login) |
| `/ferramentas/financeiro/expenses` | 307 | ✅ Redirect → auth |
| `/ferramentas/financeiro/sources` | 307 | ✅ Redirect → auth |
| `/ferramentas/financeiro/rules` | 307 | ✅ Redirect → auth |
| `/ferramentas/financeiro/settings` | 307 | ✅ Redirect → auth |

**Validado:** Todas carregam; rotas do app redirecionam corretamente para login quando não autenticado.

---

## 2. APIs críticas ⚠️

| Método | Endpoint | HTTP | Resultado |
|--------|----------|------|-----------|
| GET | `/api/health` | 200 | ✅ OK |
| POST | `/api/financeiro/leads` | 500 | ❌ "Não foi possível salvar" — provável falta de tabela ou conexão DB |
| GET | `/api/me` | 401 | ✅ Correto sem sessão ("Não autenticado") |
| GET | `/api/dashboard/summary?months=6` | 401 | ✅ Correto sem sessão |
| POST | `/api/expenses` | 403 | ✅ Origin/Referer obrigatório (proteção CSRF) |
| POST | `/api/incomes` | 403 | ✅ Origin/Referer obrigatório |

**Diagnóstico:** Supabase Auth funcionando (`/api/me` retorna 401 em vez de 500). Lead capture falha — Prisma não consegue gravar (tabela `FinanceiroLead` inexistente ou `DATABASE_URL` incorreta no Vercel).

---

## 3. Banco e migrations ⚠️

```bash
pnpm prisma migrate deploy
```

**Resultado:** Falhou com `P1000: Authentication failed against database server`.

- **Causa provável:** Credenciais em `.env.local` ou no Vercel incorretas (senha, encoding de caracteres especiais).
- **Tabelas esperadas:** FinanceiroLead, Expense, Income, Household, Source, Rule, User, etc.

**Ação necessária:**
1. Conferir `DATABASE_URL` no Vercel (senha com `@` → `%40`).
2. Rodar `pnpm prisma migrate deploy` contra o banco de produção (ou via job de deploy).
3. Revalidar POST `/api/financeiro/leads`.

---

## Envs necessárias no Vercel

| Variável | Status | Obrigatória para |
|----------|--------|------------------|
| `DATABASE_URL` | ⚠️ Verificar | Leads, /api/me, dashboard, expenses |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Configurada | Auth (login, sessão) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | ✅ Configurada | Auth |

---

## Próximos passos

1. **Validar** `DATABASE_URL` no Vercel (senha URL-encoded se tiver `@`, `#`, etc.).
2. **Rodar** `pnpm prisma migrate deploy` em ambiente com `DATABASE_URL` válida.
3. **Retestar** POST `/api/financeiro/leads` com `{"email":"test@test.com","source":"simulator"}`.
4. Se leads retornar 200 → checklist 100% → seguir sequência segura de desligamento.

---

## Pode apagar o projeto antigo?

**Ainda não.** O lead capture precisa funcionar (POST `/api/financeiro/leads` → 200). Após corrigir `DATABASE_URL` e aplicar migrations, reexecutar o checklist.
