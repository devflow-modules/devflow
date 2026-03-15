# Resultado da Execução — PRE-DELETE-VERCEL-CHECKLIST

**Data:** 2026-03-15  
**Domínio testado:** https://devflowlabs.com.br

---

## Resumo

| Bloco | Status | Observação |
|-------|--------|------------|
| 1. Rotas | ✅ OK | Todas carregam; app redireciona para auth (307) quando não logado |
| 2. APIs | ⚠️ Parcial | health ✅; me ✅ (401 sem auth); leads ❌ 500 |
| 3. Banco | ❌ Falhou | `prisma migrate deploy` → P1000 (auth failed) mesmo com Session Pooler |

**Conclusão:** Rotas e Supabase Auth OK. Migrations não aplicadas — P1000 persiste com Session Pooler (IPv4). Lead capture em 500. Bloqueador: credenciais do banco.

---

## 1. Rotas em produção ✅

| Rota | HTTP | Resultado |
|------|------|-----------|
| `/` | 200 | ✅ Home |
| `/ferramentas/financeiro` | 200 | ✅ Landing + simulador + lead capture |
| `/ferramentas/financeiro/auth` | 200 | ✅ Login/cadastro |
| `/ferramentas/divisao-de-contas` | 200 | ✅ Calculadora |
| `/planilha-vs-app-financeiro` | 200 | ✅ Comparativo SEO |
| `/ferramentas/financeiro/dashboard` | 307 | ✅ Redirect → auth |
| `/ferramentas/financeiro/expenses` | 307 | ✅ Redirect → auth |
| `/ferramentas/financeiro/sources` | 307 | ✅ Redirect → auth |
| `/ferramentas/financeiro/rules` | 307 | ✅ Redirect → auth |
| `/ferramentas/financeiro/settings` | 307 | ✅ Redirect → auth |

---

## 2. APIs críticas ⚠️

| Método | Endpoint | HTTP | Resultado |
|--------|----------|------|-----------|
| GET | `/api/health` | 200 | ✅ OK |
| POST | `/api/financeiro/leads` | 500 | ❌ "Não foi possível salvar" |
| GET | `/api/me` | 401 | ✅ Correto sem sessão |

**Diagnóstico:** Leads falha porque migrations não foram aplicadas (tabela inexistente ou conexão quebrada).

---

## 3. Banco e migrations ❌

```bash
pnpm prisma migrate deploy
```

**Resultado:** `P1000: Authentication failed` — host `aws-1-sa-east-1.pooler.supabase.com:5432` (Session Pooler, IPv4).

- **Setup atual:** `directUrl` no schema; DIRECT_URL com Session Pooler.
- **Causa provável:** Senha incorreta ou usuário/formato diferente para Session Pooler.
- **Tabelas esperadas:** FinanceiroLead, Expense, Income, Household, Source, Rule, User, etc.

**Ações recomendadas:**
1. **Redefinir senha** no Supabase → Project Settings → Database → Reset database password.
2. **Copiar novamente** a connection string do Session Pooler após reset.
3. **URL-encode** caracteres especiais (`@` → `%40`).
4. Rodar `pnpm prisma migrate deploy` novamente.

---

## Envs necessárias no Vercel

| Variável | Obrigatória para |
|----------|------------------|
| `DATABASE_URL` | Runtime (pooler 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Migrations (Session Pooler 5432 ou direct 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | Auth |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Auth |

---

## Próximos passos

1. Corrigir credenciais do banco (redefinir senha no Supabase se necessário).
2. Rodar `pnpm prisma migrate deploy` com sucesso.
3. Retestar POST `/api/financeiro/leads` → deve retornar 200.
4. Reexecutar checklist completo.
5. Se tudo OK → sequência segura de desligamento (rename projeto antigo → 24h → delete → tag).

---

## Pode apagar o projeto antigo?

**Ainda não.** O lead capture precisa retornar 200 e as migrations precisam ser aplicadas. Após corrigir credenciais e rodar migrate com sucesso, reexecutar o checklist.
