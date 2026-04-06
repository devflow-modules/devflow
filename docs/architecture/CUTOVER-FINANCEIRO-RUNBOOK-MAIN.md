# Runbook — Cutover Financeiro direto na `main`

**Objetivo:** executar o corte portal × `apps/financeiro` em **sequência controlada**, com teste **após cada bloco** — não big bang no fim.

**Relacionados:** `EPICO-FINANCEIRO-CUTOVER.md`, `PR1-CUTOVER-FINANCEIRO-PLANO-TECNICO.md`, `INVENTARIO-ROTAS-MONOREPO.md`, `MATRIZ-DECISAO-ROTAS.md`.

**Reutilização:** este processo (blocos + gates + tags + log) serve de **framework interno** para futuros cutovers (ex.: maior isolamento do WhatsApp Platform, Investigamais, novos SaaS). Copie o runbook e adapte nomes de tag/rotas.

---

## 0. Antes de qualquer bloco — travar o estado atual

Fazer **antes** do Bloco A (uma pessoa registra, o time valida).

| # | Ação | Feito |
|---|------|-------|
| 0.1 | **Tag de rollback global:** `git tag pre-financeiro-cutover` (ou `pre-financeiro-cutover-YYYY-MM-DD`) no commit atual da `main` e `git push origin pre-financeiro-cutover` | ☐ |
| 0.2 | **Snapshot de rotas:** exportar lista (ex.: a partir de `INVENTARIO-ROTAS-MONOREPO.md` + `git ls-files '**/page.tsx' '**/route.ts'` focado em Financeiro) e guardar em gist/wiki/commit de doc | ☐ |
| 0.3 | **Snapshot de envs:** listar variáveis relevantes no provedor (Vercel/etc.) para portal e `apps/financeiro` — sem colar segredos no repo; referência a nomes e ambientes | ☐ |
| 0.4 | **URLs canônicas atuais:** documentar produção/staging hoje (portal + app Financeiro se já separado) | ☐ |
| 0.5 | **Deploy OK:** smoke mínimo em produção (ou staging canônico) — landing Financeiro, redirect `/ferramentas/financeiro/demo` → app, login, dashboard básico | ☐ |

**Regra:** sem 0.1–0.5 fechados, não iniciar Bloco A.

---

## 0.6 Mini-tags por bloco (rollback cirúrgico)

**Quando:** imediatamente **antes** de começar as mudanças daquele bloco (HEAD já passou no gate do bloco anterior).

**Nomes curtos (recomendado):**

```bash
git tag cutover-bloco-a && git push origin cutover-bloco-a   # antes de aplicar A
git tag cutover-bloco-b && git push origin cutover-bloco-b   # A ok no gate; antes de B
git tag cutover-bloco-c && git push origin cutover-bloco-c   # B ok no gate; antes de C
git tag cutover-bloco-d && git push origin cutover-bloco-d   # C ok no gate; antes de D
```

| Tag | Significado |
|-----|-------------|
| `cutover-bloco-a` | Pronto para iniciar A (muitas vezes coincide com `pre-financeiro-cutover`) |
| `cutover-bloco-b` | A validado; pronto para B |
| `cutover-bloco-c` | B validado; pronto para C |
| `cutover-bloco-d` | C validado; pronto para D |

**Rollback cirúrgico:** quebrou no **C** → voltar a `cutover-bloco-c` (último bom antes das mudanças de C) ou `git revert` só dos commits do C — **sem** desfazer A/B.

**Alias aceito:** `cutover-antes-bloco-*` = mesmo conceito que `cutover-bloco-*`.

Opcional após cada gate verde: `git tag cutover-pos-bloco-a` (fim validado do bloco A).

---

## 1. Mapa dos blocos (ordem fixa)

| Bloco | Conteúdo | Merge na `main` |
|-------|----------|-----------------|
| **A** | Canon e config (`NEXT_PUBLIC_FINANCEIRO_APP_URL`, billing por produto, docs, envs) | Um ou mais commits/PRs pequenos |
| **B** | Redirects + depreciação (rotas operacionais antigas na raiz); manter **landing** + **hub**; `/ferramentas/financeiro/demo` como **redirect** para o app | **Maior risco operacional** — loops, query, destino errado |
| **C** | Migração operacional (auth, dashboard, settings, invites, demais áreas autenticadas) | Core do sistema |
| **D** | Limpeza (duplicatas, matriz, links internos, sitemap/canonical se preciso) | |

**Regra crítica:** aplicar **A → gate → B → gate → C → gate → D → gate final**. Não acumular A+B+C+D e só validar no fim.

**Commits:** preferir **um merge por bloco** (ou sub-PRs que somam um bloco) para permitir **revert pontual** do bloco que quebrou.

---

## 2. Checklist mínimo de teste (após **cada** bloco)

Marcar o que for aplicável ao bloco (ex.: redirects só após B).

### Rotas públicas

- [ ] `/ferramentas`
- [ ] `/ferramentas/financeiro`
- [ ] `/ferramentas/financeiro/demo` (portal → redirect para app canônico)
- [ ] Páginas SEO ligadas ao Financeiro (amostra: home → produtos → financeiro)

### Rotas autenticadas (quando existirem no ambiente testado)

- [ ] Login / auth
- [ ] Onboarding (se aplicável)
- [ ] Dashboard
- [ ] Settings
- [ ] Convites (fluxo crítico)
- [ ] Navegação interna entre páginas do Financeiro

### Redirects (a partir do Bloco B)

- [ ] Rota operacional antiga na raiz redireciona para o destino canônico
- [ ] Sem loop de redirect
- [ ] Query params preservados quando necessários (`next`, OAuth, etc.)

### Billing

- [ ] Financeiro **não** aponta para billing da raiz por engano (se billing já migrou)
- [ ] WhatsApp continua isolado (smoke rápido ou checklist de não-regressão)
- [ ] Links de upgrade / assinatura coerentes com o produto

### Infra

- [ ] Middleware (sessão, redirects esperados)
- [ ] Auth (Supabase / cookies no domínio certo)
- [ ] Variáveis de ambiente carregadas no deploy
- [ ] Links absolutos / canônicos corretos onde foram alterados
- [ ] Build + deploy verdes

### Automação (opcional, recomendado)

Script **`scripts/ops/validate-routes.sh`** — smoke de rotas públicas, redirect de rota protegida Financeiro → auth, `/precos`, e (quando descomentado) legados/billing.

```bash
chmod +x scripts/ops/validate-routes.sh
cp scripts/ops/validate-routes.financeiro.env.example scripts/ops/validate-routes.financeiro.env
# ajuste URLs em validate-routes.financeiro.env
set -a && source scripts/ops/validate-routes.financeiro.env && set +a
bash scripts/ops/validate-routes.sh
```

- **Bloco A:** superfície pública + auth redirect.  
- **Bloco B:** descomentar asserts em **Legacy redirects**.  
- **Bloco C/D:** asserts canônicos + billing conforme deploy.

Requer **`curl`** no PATH.

Variáveis úteis: **`STRICT_MODE`**, **`STRICT_MAX_PUBLIC_REDIRECTS`**, **`PERF_*`**, **`OUTPUT_JSON`**, **`MAX_REDIRECTS_ALLOWED`** (padrão 5 — falha se a cadeia `-L` tiver mais hops; reduz bugs de loop), **`CURL_FOLLOW_MAX`**, **`TRACE_REDIRECTS=true`** (imprime cadeia hop-a-hop + URL final; útil para “quase certo” vs canônico).

**Três níveis sugeridos:**

1. **Normal** — `bash scripts/ops/validate-routes.sh` (com env carregado).  
2. **Cutover / rigor** — `STRICT_MODE=true STRICT_MAX_PUBLIC_REDIRECTS=1` (e demais vars do `.env`).  
3. **Debug pesado** — `TRACE_REDIRECTS=true STRICT_MODE=true` (inspecionar cadeia completa).

Saída: linhas **`CHECKS=`** / **`FAILURES=`**; com **`OUTPUT_JSON=true`**, também uma linha JSON.

**CI pós-deploy (GitHub Actions):** workflow **Validate routes (post-deploy)** — `.github/workflows/validate-routes-after-deploy.yml`. Dispara em **`push` em `main`/`master`** e **`workflow_dispatch`** (recomendado após o deploy terminar, ex. Vercel). Configure variáveis de repositório opcionais **`ROUTE_VALIDATE_BASE_URL`** e **`ROUTE_VALIDATE_FINANCEIRO_APP_URL`**; se vazias, o job usa defaults alinhados ao portal/Financeiro em produção (ajuste no YAML se os hosts mudarem). No dispatch manual dá para sobrescrever URLs e ligar **`trace_redirects`** para diagnóstico nos logs.

**Gate “deploy limpo”:** o job corre **`STRICT_MODE=true`** e **falha** se o script sair com código ≠ 0. No resumo do workflow (aba *Summary*) há a tabela de critérios e nota do webhook Stripe.

**Produção — checklist antes de o smoke ficar verde:**

1. **Portal (Vercel/host):** `NEXT_PUBLIC_FINANCEIRO_APP_URL` = URL pública do `apps/financeiro` (ex. `https://financeiro.devflowlabs.com.br`). Sem isso, `/ferramentas/financeiro/dashboard` continua a mandar para **auth na raiz** e o smoke “Portal → app (308)” falha.
2. **Demo (aquisição no portal):** `/ferramentas/financeiro/demo` deve **redirecionar** (1º hop) para o path do demo no host do app (`FINANCEIRO_APP_URL` + `/ferramentas/financeiro/...`). O script em modo **hosts separados** valida esse redirect, não um **200** na raiz. Se o check não se aplica (env incompleto), use `SKIP_FINANCEIRO_DEMO_CHECK=true` (ver cabeçalho de `scripts/ops/validate-routes.sh`).
3. **Stripe webhook (checkpoint):** decisão atual em **§2.2**.

**Comando local (URLs reais):**

```bash
BASE_URL=https://devflowlabs.com.br \
FINANCEIRO_APP_URL=https://financeiro.devflowlabs.com.br \
STRICT_MODE=true STRICT_MAX_PUBLIC_REDIRECTS=1 OUTPUT_JSON=true \
PERF_MAX_FINANCEIRO_LANDING=3 \
bash scripts/ops/validate-routes.sh
```

(Em dev **mesmo host** que produção, o script ainda pode exigir cadeia `-L` até **200**; ajuste `STRICT_MAX_PUBLIC_REDIRECTS` conforme o cabeçalho do script.)

---

## 2.1 Gate de avanço (hard stop)

**Decisão binária:** só avança para o próximo bloco se **todos** os itens do gate abaixo forem atendidos para o bloco atual.

### Bloqueia avanço (qualquer um = **parar**)

- ❌ Erro **crítico** em fluxo principal (login, dashboard, landing pública quebrada)
- ❌ **Redirect** errado, loop ou perda indevida de query
- ❌ **Auth** quebrado (login, callback, sessão)
- ❌ **Billing** inconsistente (produto errado, link para raiz quando não deve)
- ❌ Build/deploy vermelho ou erro crítico recorrente em **console/logs** no fluxo testado

### Libera avanço (todos necessários)

- ✅ Rotas principais do escopo do bloco **OK**
- ✅ Auth **OK** (se o bloco toca ou depende de auth)
- ✅ Redirects **OK** (a partir do bloco B, quando existirem)
- ✅ Nenhum erro crítico no console/logs nos fluxos exercitados

**Regra humana:** não usar “já começamos, vamos em frente” com gate vermelho — corrigir ou reverter o bloco atual antes de mergear o próximo.

---

## 2.2 Stripe — webhook (checkpoint)

**Estado no repositório:** `POST /api/billing/webhook` existe **só** no app (`apps/financeiro/src/app/api/billing/webhook`). A raiz do portal **não** expõe webhook nem proxy de billing.

**Stripe Dashboard:** o endpoint do produto Financeiro deve apontar para a URL pública do app (ex. `https://<host-financeiro>/api/billing/webhook`).

**Smoke:** após alterar URL, validar `customer.subscription.*` / `checkout.session.completed` / `invoice.*` conforme o contrato do handler do app.

**Não** registar dois endpoints Stripe ativos para o mesmo fluxo Financeiro sem coordenação (risco de eventos duplicados).

---

## 3. Smoke test final (obrigatório após Bloco D)

Fluxo ponta a ponta, em produção ou staging idêntico:

1. Usuário entra pela **landing** do Financeiro (portal).  
2. Navega para **auth / app correto** (URL canônica).  
3. Acessa **dashboard**.  
4. Percorre **settings** e um fluxo interno representativo.  
5. **Billing** abre no contexto do **produto Financeiro** (não portal genérico / não WhatsApp).  
6. **Rotas antigas** na raiz **redirecionam** como planejado.  
7. **Portal:** hub, produtos, CTAs de demo (redirect) — nada essencial quebrado; **sem** painel operacional do Financeiro na raiz.

Registrar no **log de execução** (§5): data, executor, ambiente, resultado.

---

## 4. Log de execução (obrigatório)

Manter em issue/Notion/wiki **ou** preencher a partir de `CUTOVER-FINANCEIRO-LOG-TEMPLATE.md` (cópia por rodada; pode ficar fora do git se contiver dados sensíveis).

### Por bloco, registrar

| Campo | Conteúdo |
|-------|----------|
| **Bloco** | A / B / C / D |
| **Início / fim** | Data-hora (timezone) |
| **Commits / PRs** | SHAs ou links |
| **Arquivos alterados** | Lista ou link `git diff --name-only` |
| **Rotas impactadas** | Paths |
| **Problemas** | O que falhou, como foi corrigido |
| **Decisão** | Continuar / rollback / pausa |
| **Gate** | Verde ou vermelho + quem assinou |

**Utilidade:** aprendizado, playbook para **outros produtos**, auditoria pós-incidente.

---

## 5. Plano de rollback (trabalhando na `main`)

### 5.1 Tags

- **`pre-financeiro-cutover`** — estado antes de qualquer cutover.  
- **`cutover-bloco-*`** — ver §0.6.  
- Opcional: **`cutover-pos-bloco-*`** após cada gate verde.

### 5.2 Revert por bloco

- Manter **lista de commits ou PRs** por bloco no log de execução.  
- Se quebrar no **C**, reverter **só** os commits do C ou reset para `cutover-antes-bloco-c` — **sem** reverter A/B se estiverem sãos.  
- Evitar um único commit gigante que mistura A+B+C+D.

### 5.3 Rollback “nuclear”

- `git checkout pre-financeiro-cutover` + redeploy **só** se o estado intermediário for irrecuperável — **registrar no log** quando usado.

---

## 6. Mapeamento blocos ↔ épico (referência rápida)

| Runbook | Épico `EPICO-FINANCEIRO-CUTOVER` |
|---------|----------------------------------|
| Bloco A | Bloco 1 (canon) + decisão billing + env |
| Bloco B | Bloco 4 (redirects) — primeira leva |
| Bloco C | Bloco 3 (migração operacional) |
| Bloco D | Bloco 4 (limpeza final) + atualização matriz/governança |

---

## 7. Ordem prática sugerida (visão real)

| Fase | Duração orientativa | Ações |
|------|---------------------|--------|
| **Preparação** | 10–15 min | Tag `pre-financeiro-cutover`, validar deploy atual, confirmar envs, `cutover-bloco-a` |
| **Bloco A** | Curto | Canon + env + docs; gate; `cutover-bloco-b` |
| **Bloco B** | Cuidado máximo | Redirects; testar loop, query, destino; gate; `cutover-bloco-c` |
| **Bloco C** | Core | Auth, dashboard, fluxos; gate; `cutover-bloco-d` |
| **Bloco D** | Limpeza | Duplicatas, matriz, SEO básico; gate |
| **Smoke final** | Obrigatório | Fluxo completo usuário + billing + rotas antigas + portal |

---

## 8. Comunicação no time

- Anunciar janela de cutover e **congelamento** de mudanças paralelas em rotas Financeiro na `main` durante cada bloco sensível.  
- **Não avançar** bloco com gate vermelho (§2.1).

---

## 9. Leitura estratégica (produto)

Após o cutover bem feito, o **Financeiro** fica produto **isolado** de verdade: possibilidade de vender e deployar separado do portal, com menos risco de regressão cruzada — impacto direto em **receita e escalabilidade**. O mesmo runbook escala para outros SaaS da DevFlow.

---

*Runbook operacional; ajuste nomes de tag ao padrão do time.*
