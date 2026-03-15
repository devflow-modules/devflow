# Homologação Final — App Financeiro DevFlow

**Contexto:** Validação operacional antes do desligamento definitivo do app antigo na Vercel.

**Protocolo de execução:** Veja [PROTOCOLO-HOMOLOGACAO-FINANCEIRO.md](./PROTOCOLO-HOMOLOGACAO-FINANCEIRO.md) — ordem correta, 3 perfis de usuário, dataset mínimo, regressão, stress e critério de corte.

**Uso:** Marque o status de cada item após testar. Execute na ordem: Auth → Onboarding → Dashboard → CRUD → Settings → Borda → Produção.

**Legenda de status:**
- `Pendente` — ainda não testado
- `Em teste` — rodando validação
- `Aprovado` — funcionou corretamente
- `Falhou` — problema bloqueante encontrado

---

## 1. Auth

| # | Item | Como validar | Status |
|---|------|--------------|--------|
| 1.1 | Login (email/senha ou OAuth) | Entrar com credenciais válidas em `/ferramentas/financeiro/auth` | Pendente |
| 1.2 | Carregamento de sessão | Recarregar página protegida → sessão mantida | Pendente |
| 1.3 | `/api/me` retorna usuário | DevTools → Network → ver resposta 200 com dados do user | Pendente |
| 1.4 | Redirecionamento pós-login | Após login → redireciona para dashboard ou onboarding | Pendente |
| 1.5 | Logout | Sair da conta → redireciona para auth e não acessa rotas protegidas | Pendente |
| 1.6 | Usuário sem casa → onboarding | Usuário novo sem household → vai para `/ferramentas/financeiro/onboarding` | Pendente |
| 1.7 | 401 em rota protegida | Sem sessão → redireciona para auth (não 500/404) | Pendente |

---

## 2. Onboarding

| # | Item | Como validar | Status |
|---|------|--------------|--------|
| 2.1 | Criar primeira household | Preencher nome e slug → POST `/api/households` → sucesso | Pendente |
| 2.2 | Household ativa definida | Após criar → `me/active-household` retorna a casa criada | Pendente |
| 2.3 | Redirecionamento pós-criação | Após criar → vai para dashboard | Pendente |
| 2.4 | Comportamento ao recarregar | Recarregar onboarding com sessão → não perde dados | Pendente |
| 2.5 | Erro de slug duplicado | Slug já existente → mensagem clara ao usuário | Pendente |
| 2.6 | Validação de formulário | Nome/slug vazios ou inválidos → bloqueia submit | Pendente |

---

## 3. Dashboard

| # | Item | Como validar | Status |
|---|------|--------------|--------|
| 3.1 | Summary carregando sem erro | GET `/api/dashboard/summary` → 200, sem crash na UI | Pendente |
| 3.2 | Gráfico de evolução (estado vazio) | Sem dados → gráfico exibe estado vazio ou mensagem adequada | Pendente |
| 3.3 | Gráfico de evolução (com dados) | Com receitas/despesas → gráfico renderiza corretamente | Pendente |
| 3.4 | Projeção de fluxo (estado vazio) | Sem dados → projeção exibe estado vazio | Pendente |
| 3.5 | Projeção de fluxo (com dados) | Com dados → projeção renderiza e permite trocar cenário/horizonte | Pendente |
| 3.6 | Metas refletindo dados | Metas de investimento/guarda → valores coerentes com receitas | Pendente |
| 3.7 | Troca de household atualiza tudo | Trocar casa no select → cards, gráficos e metas atualizam | Pendente |
| 3.8 | Cards Receitas/Despesas/Saldo | Valores corretos e atualizados após CRUD | Pendente |
| 3.9 | Fluxo por categoria | Despesas por categoria com barra e percentual | Pendente |
| 3.10 | Últimas regras aplicadas | Lista de rateios calculados exibida corretamente | Pendente |

---

## 4. CRUD

| # | Item | Como validar | Status |
|---|------|--------------|--------|
| **Expenses** | | | |
| 4.1 | Criar receita | Formulário receitas → submit → toast sucesso, lista atualiza | Pendente |
| 4.2 | Editar receita | Editar → salvar → valores persistidos | Pendente |
| 4.3 | Excluir receita | Excluir → confirmação → item some da lista | Pendente |
| 4.4 | Criar despesa | Formulário despesas → submit → toast sucesso, lista atualiza | Pendente |
| 4.5 | Editar despesa | Editar → salvar → valores persistidos | Pendente |
| 4.6 | Excluir despesa | Excluir → confirmação → item some da lista | Pendente |
| 4.7 | Marcar despesa como paga | Pagar → status PAID, dados de pagamento exibidos | Pendente |
| 4.8 | Desmarcar como paga | Desmarcar → status PENDING | Pendente |
| **Sources** | | | |
| 4.9 | Criar fonte | Nova fonte PJ/PF → salva e aparece na lista | Pendente |
| 4.10 | Editar fonte | Editar nome/tipo → persiste | Pendente |
| 4.11 | Excluir fonte | Excluir → confirmação → fonte some | Pendente |
| 4.12 | Adicionar dia de recebimento | Vincular fonte + dia (e opcional ciclo) → salva | Pendente |
| **Cycles** | | | |
| 4.13 | Criar ciclo (mensal) | Nome + dia âncora → salva | Pendente |
| 4.14 | Criar ciclo (semanal) | Nome + dia da semana → salva | Pendente |
| 4.15 | Editar ciclo | Editar → persiste | Pendente |
| 4.16 | Excluir ciclo | Excluir → ciclo some | Pendente |
| **Rules** | | | |
| 4.17 | Criar regra | Nova regra (CATEGORY_PERCENTAGE, etc.) → salva | Pendente |
| 4.18 | Editar regra | Editar → persiste | Pendente |
| 4.19 | Excluir regra | Excluir → regra some | Pendente |
| **Validação e UX** | | | |
| 4.20 | Validação de formulário | Campos obrigatórios vazios → bloqueia submit | Pendente |
| 4.21 | Feedback visual sucesso/erro | Toast ou mensagem clara em sucesso e erro | Pendente |
| 4.22 | Persistência após refresh | Dados criados/editados persistem após F5 | Pendente |

---

## 5. Settings / Invites

| # | Item | Como validar | Status |
|---|------|--------------|--------|
| 5.1 | Criar convite | OWNER: email + role → POST `/api/invites` → link gerado | Pendente |
| 5.2 | Link copiado | Toast "link copiado" ou link exibido | Pendente |
| 5.3 | Aceitar convite por token | URL com `?token=xxx` → POST accept → redireciona para dashboard | Pendente |
| 5.4 | Permissão do membro novo | Membros têm acesso conforme role (MEMBER vs OWNER) | Pendente |
| 5.5 | Impedir ações indevidas | MEMBER não vê/cria convites ou transferência | Pendente |
| 5.6 | Listar convites pendentes | OWNER vê lista de convites com email, role, expiração | Pendente |
| 5.7 | Revogar convite | Revogar → convite some, token deixa de funcionar | Pendente |
| 5.8 | Transfer ownership | OWNER transfere para outro membro → sessão não quebra | Pendente |
| 5.9 | Criar nova household | Botão criar casa → formulário → nova casa criada | Pendente |
| 5.10 | Trocar casa ativa | Select de households → muda casa ativa e contexto | Pendente |
| 5.11 | Sair da casa | Sair → remove da casa, redireciona adequadamente | Pendente |

---

## 6. Cenários de borda

| # | Item | Como validar | Status |
|---|------|--------------|--------|
| 6.1 | Household sem dados | Nova casa → dashboard sem crash, gráficos vazios | Pendente |
| 6.2 | Household com muitos registros | Várias receitas/despesas → lista renderiza, sem timeout | Pendente |
| 6.3 | Token expirado | Convite com token expirado → mensagem clara | Pendente |
| 6.4 | API 401 | Sessão expirada em rota protegida → redireciona para auth | Pendente |
| 6.5 | API 403 | Ação sem permissão → mensagem adequada | Pendente |
| 6.6 | API 404/500 | Erro de servidor → feedback ao usuário (não tela em branco) | Pendente |
| 6.7 | Loading states | Skeleton/loading visível durante fetch | Pendente |

---

## 6b. Regressão invisível

Executar **após** concluir todos os testes acima: logout → login → refresh em rotas profundas.

| # | Item | Como validar | Status |
|---|------|--------------|--------|
| 6b.1 | Sessão mantida após refresh | F5 em `/dashboard`, `/expenses`, `/sources`, `/settings` → sessão ok | Pendente |
| 6b.2 | Household não undefined | Nenhum crash por household null | Pendente |
| 6b.3 | Sem hydration mismatch | Console sem erros de hydration | Pendente |
| 6b.4 | Sem cache quebrado | Dados exibidos após refresh estão corretos | Pendente |

---

## 6c. Stress leve

Adicionar 50 despesas + 20 receitas e validar performance:

| # | Item | Como validar | Status |
|---|------|--------------|--------|
| 6c.1 | Gráficos não quebram | Dashboard renderiza com volume alto | Pendente |
| 6c.2 | Listas com scroll | Expenses/sources scrollam sem travamento | Pendente |
| 6c.3 | Queries < 2s | Nenhuma requisição lenta visível | Pendente |
| 6c.4 | Sem re-render excessivo | UI responsiva, sem lag | Pendente |

---

## 7. Produção e smoke test

Executar **após deploy** em ambiente real:

| # | Item | Como validar | Status |
|---|------|--------------|--------|
| 7.1 | Variáveis de ambiente na Vercel | DATABASE_URL, Supabase, etc. configuradas | Pendente |
| 7.2 | Migrations aplicadas | Banco em produção com schema correto | Pendente |
| 7.3 | Login real em produção | Email/senha ou OAuth funcionando | Pendente |
| 7.4 | Criação de household em produção | End-to-end funcional | Pendente |
| 7.5 | Criação receita/despesa em produção | Dados persistem no banco real | Pendente |
| 7.6 | Dashboard em produção | Gráficos e cards carregam | Pendente |
| 7.7 | Convite real | Criar link → enviar → aceitar em outra sessão | Pendente |
| 7.8 | Refresh em rotas profundas | `/ferramentas/financeiro/expenses` → F5 → não 404 | Pendente |
| 7.9 | Mobile e desktop | Layout responsivo, navegação em ambos | Pendente |

---

## Critério de corte

O app antigo **pode ser desligado** quando:

- [ ] Todos os itens de **Auth** aprovados
- [ ] Todos os itens de **Onboarding** aprovados
- [ ] Todos os itens de **Dashboard** aprovados
- [ ] Todos os itens de **CRUD** aprovados
- [ ] Todos os itens de **Settings/Invites** aprovados
- [ ] Cenários de borda sem bloqueios críticos
- [ ] Regressão invisível aprovada
- [ ] Stress leve aprovado
- [ ] Smoke test em produção sem erros bloqueantes
- [ ] Zero itens em **Falhou**

---

## Histórico de execução

| Data | Responsável | Resultado | Observações |
|------|-------------|-----------|-------------|
| | | | |
