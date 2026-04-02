# Changelog — Financeiro

Todas as mudanças relevantes do produto **Financeiro** (dashboard inteligente, motores de domínio e app) são registradas aqui.

## [v0.3] — Smart Dashboard

### Adicionado

- Onboarding in-product no dashboard (banner + CTAs + destaque nos blocos score/insights/checklist; `localStorage` `financeiro_onboarding_step`; eventos `financeiro_onboarding_*`)
- Health Score do mês (0–100) com faixa e mensagem acionável
- Insights automáticos (regras determinísticas sobre receitas, despesas e frescor dos dados)
- Checklist mensal com progresso visual
- Fluxo operacional: ações rápidas, “continuar de onde parei”, cards de seção

### Melhorado

- Navegação com retomada de contexto (última rota / última ação no dispositivo)
- Dashboard pensado mobile-first
- CTAs contextuais alinhados ao checklist e aos insights

### Técnico

- Testes de domínio (score, insights, checklist) e consistência entre motores
- Vitest com ambiente `node` por padrão; jsdom explícito só onde há DOM
- CI: jobs paralelos `lint:ci` + `test` com `--max-warnings 0` no escopo Financeiro
- Ajustes de hooks (ex.: `useSyncExternalStore` para viewport, contexto household estável)

---

## [v0.2] — Base operacional

### Adicionado

- Households, convites, fontes, regras, despesas e rendas
- APIs com validação Zod e respostas padronizadas
- Eventos de domínio e métricas de produto (catálogo documentado)

### Melhorado

- Isolamento do módulo e documentação de API / modelo de dados

---

## [v0.1] — Fundação

### Adicionado

- App dedicado `apps/financeiro` + na raiz do repo, pasta `src/modules/financeiro` para aquisição (landing, leads); operação canónica no app
- Auth Supabase, Prisma e RLS documentados
