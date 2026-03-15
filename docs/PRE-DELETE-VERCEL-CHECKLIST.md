# Checklist Final — Antes de Apagar o Projeto Antigo na Vercel

**Critério prático:** A migração está funcionalmente muito perto de 100%, mas **só se considera 100% após este checklist passar em produção**.

**Pode apagar o projeto antigo somente se os 3 blocos abaixo estiverem OK.**

O ponto de corte real é este checklist, não o build. Não apague no escuro.

---

## 1. Rotas em produção

Testar no domínio novo (devflowlabs.com.br ou o que for):

| Rota | Deve carregar |
|------|----------------|
| `/` | Home |
| `/ferramentas/financeiro` | Landing + simulador |
| `/ferramentas/financeiro/auth` | Login / cadastro |
| `/ferramentas/divisao-de-contas` | Calculadora |
| `/planilha-vs-app-financeiro` | Comparativo SEO |

**Rotas do app (exigem login):**

| Rota | Deve carregar |
|------|----------------|
| `/ferramentas/financeiro/dashboard` | Dashboard |
| `/ferramentas/financeiro/expenses` | Receitas e despesas |
| `/ferramentas/financeiro/sources` | Fontes |
| `/ferramentas/financeiro/rules` | Regras |
| `/ferramentas/financeiro/settings` | Configurações |

**Validar:**
- [ ] Todas carregam sem erro
- [ ] Sem redirect quebrado
- [ ] Sem links apontando para domínio antigo

---

## 2. APIs críticas

Testar em produção:

| Método | Endpoint | Nota |
|--------|----------|------|
| POST | `/api/financeiro/leads` | Lead capture (body: `{ "email": "test@test.com", "source": "simulator" }`) |
| GET | `/api/me` | Requer sessão |
| GET | `/api/dashboard/summary?months=6` | Requer sessão |
| POST | `/api/expenses` | Requer sessão |
| POST | `/api/incomes` | Requer sessão |
| GET | `/api/health` | Pode testar sem auth |

- [ ] APIs respondem 200 (ou 401 quando sem sessão, nunca 500)
- [ ] Lead capture funciona

---

## 3. Banco e migrations

```bash
pnpm prisma migrate deploy
```

**Tabelas esperadas (além das outras):**
- [ ] FinanceiroLead
- [ ] Expense
- [ ] Income
- [ ] Household
- [ ] Source
- [ ] Rule

---

## Critério: pode apagar?

Só se **todas** as verificações acima estiverem OK.

---

## Sequência segura de desligamento

1. **Passar o checklist** — todos os 3 blocos OK em produção
2. **Renomear** o projeto antigo na Vercel → `finance-old`
3. **Esperar 24h** — monitorar se algo quebra
4. **Deletar** o projeto antigo (se nada quebrar)
5. **Taguear** o corte:

   ```bash
   git tag financeiro-migration-complete
   git push origin financeiro-migration-complete
   ```

---

## Arquitetura final (DevFlow)

```
DevFlow
├── ferramentas
│   ├── divisao-de-contas
│   └── financeiro (landing + simulador + lead capture)
├── SEO
│   └── planilha-vs-app-financeiro
├── app
│   ├── /ferramentas/financeiro/dashboard
│   ├── /ferramentas/financeiro/expenses
│   ├── /ferramentas/financeiro/sources
│   ├── /ferramentas/financeiro/rules
│   └── /ferramentas/financeiro/settings
└── api
    ├── financeiro/leads
    ├── dashboard/summary
    ├── dashboard/cash-flow-projection
    ├── expenses
    ├── incomes
    ├── households
    └── ...
```

---

## Conclusão

- [ ] Rotas OK
- [ ] APIs OK  
- [ ] Banco OK

**→ Pode apagar o projeto antigo da Vercel.**

---

**Regra objetiva:** Se o `PRE-DELETE-VERCEL-CHECKLIST` passar inteiro, pode deletar com segurança.
