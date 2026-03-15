# Protocolo de Homologação — Financeiro DevFlow

**Companheiro do:** [HOMOLOGACAO-FINANCEIRO-CHECKLIST.md](./HOMOLOGACAO-FINANCEIRO-CHECKLIST.md)

Este documento define **como executar** o checklist para evitar falsos positivos. Usado em rollout de SaaS.

---

## 1. Ordem correta de execução

Execute exatamente nesta sequência:

| Ordem | Bloco | Motivo |
|-------|-------|--------|
| 1️⃣ | **Auth** | Base de tudo: sem sessão, nada funciona |
| 2️⃣ | **Onboarding** | Dashboard e CRUD dependem de household ativa |
| 3️⃣ | **Dashboard** | Depende de Auth + Onboarding |
| 4️⃣ | **CRUD** | Depende de sources e cycles para receitas/despesas |
| 5️⃣ | **Settings / Invites** | Depende de members e roles |
| 6️⃣ | **Cenários de borda** | Valida edge cases após fluxo principal |
| 7️⃣ | **Produção** | Smoke test no ambiente real |

**Regra:** não pule blocos. Se Auth falhar, corrija antes de seguir.

---

## 2. Ambiente de teste — 3 perfis de usuário

Use **3 contas** para cobrir todos os fluxos:

| Perfil | Papel | Uso |
|--------|-------|-----|
| **Usuário A** | Owner (criador da household) | Onboarding, convites, transfer ownership, metas da família |
| **Usuário B** | Member (entra via convite) | Aceitar convite, permissões limitadas, meta pessoal |
| **Usuário C** | Usuário novo (sem household) | Onboarding do zero, redirecionamento |

**Setup:**
1. Usuário A faz login → cria household
2. Usuário A convida Usuário B
3. Usuário B aceita convite
4. Usuário C faz login → vai para onboarding (não tem casa)

---

## 3. Dataset mínimo de teste

Antes de testar **Dashboard** e **CRUD**, crie os dados abaixo na household do Usuário A.

### Sources
| Nome | Tipo |
|------|------|
| Salário | PF |
| Freelance | PJ |

### Cycle
| Nome | Tipo | Âncora |
|------|------|--------|
| Mensal | MONTHLY | dia 15 |

### Payment Days
| Fonte | Dia |
|-------|-----|
| Salário | 5 |
| Freelance | 20 |

### Incomes
| Source | Valor |
|--------|-------|
| Salário | 5000 |
| Freelance | 1200 |

### Expenses
| Categoria | Valor |
|-----------|-------|
| Aluguel | 1500 |
| Internet | 120 |
| Mercado | 900 |
| Streaming | 60 |

### Rules (exemplo 50-30-20)
| Nome | Tipo | Valor |
|------|------|-------|
| Necessidades | CATEGORY_PERCENTAGE | 40% |
| Lazer | CATEGORY_PERCENTAGE | 30% |
| Investimentos | CATEGORY_PERCENTAGE | 20% |
| Reserva | CATEGORY_PERCENTAGE | 10% |

**Objetivo:** garantir que gráficos e projeções renderizem com dados reais.

---

## 4. Teste de regressão invisível

Após terminar **todos** os testes do checklist:

1. **Logout**
2. **Login** novamente
3. **Refresh** em páginas profundas:

```
/ferramentas/financeiro/dashboard
/ferramentas/financeiro/expenses
/ferramentas/financeiro/sources
/ferramentas/financeiro/settings
```

**O que observar:**
- Sessão mantida
- Household não fica `undefined`
- Sem cache quebrado
- Sem hydration mismatch no console

**Problemas comuns:** sessão perdida após refresh, household undefined em rotas profundas.

---

## 5. Teste de stress leve

Adicione volume para validar performance:

| Tipo | Quantidade |
|------|------------|
| Despesas | 50 |
| Receitas | 20 |

**Validar:**
- Gráficos não quebram
- Scroll em listas funciona
- Queries não ficam lentas (>2s)
- Sem re-render excessivo

**Revela:** índices faltando, queries N+1, listas sem virtualização.

---

## 6. Smoke test de produção

Depois do deploy em produção:

### Fluxo mínimo
1. Login
2. Criar household (ou usar existente)
3. Criar receita
4. Criar despesa
5. Dashboard atualiza
6. Criar convite
7. Aceitar convite (outra sessão)
8. Transfer ownership

### Ambientes
- [ ] Desktop
- [ ] Mobile
- [ ] Aba anônima (sem cache)

---

## 7. Critério profissional de corte

Só desligar o app antigo se **todos** estiverem ✅:

```
Auth           ✓
Onboarding     ✓
Dashboard      ✓
CRUD           ✓
Settings       ✓
Edge cases     ✓
Smoke prod     ✓
```

**Sem exceção.** Se um item falhar, corrija antes do corte.

---

## 8. Documentação de estado

Antes do corte, confirme que a documentação de referência está salva:

- [FINANCEIRO-MVP-ARCHITECTURE.md](./FINANCEIRO-MVP-ARCHITECTURE.md)
- [FINANCEIRO-API-MAP.md](./FINANCEIRO-API-MAP.md)
- [FINANCEIRO-DATA-MODEL.md](./FINANCEIRO-DATA-MODEL.md)

---

## 9. Checklist rápido de pré-corte

Antes de marcar "pronto para desligar":

- [ ] 3 perfis (A, B, C) testados
- [ ] Dataset mínimo criado
- [ ] Regressão (logout → login → refresh) ok
- [ ] Stress leve (50 despesas, 20 receitas) ok
- [ ] Smoke em produção ok
- [ ] Mobile + desktop validados
- [ ] Zero itens em "Falhou" no checklist
