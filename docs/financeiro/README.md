# Financeiro — documentação

**Apps:** `apps/financeiro` (Next dedicado — **fonte de verdade operacional**). Na raiz do monorepo, `src/modules/financeiro` cobre só **aquisição** (landing, leads, ferramentas públicas) e integrações mínimas; rotas operacionais e auth de produto vivem no app.

---

## Operação e auth

| Doc | Descrição |
|-----|-----------|
| [SUPABASE_URLS.md](./SUPABASE_URLS.md) | Site URL e Redirect URLs (Supabase Auth) |
| [GO_LIVE_FINANCEIRO.md](./GO_LIVE_FINANCEIRO.md) | Checklist go-live |
| [FINANCEIRO_RELATORIO_VALIDACAO_FINAL.md](./FINANCEIRO_RELATORIO_VALIDACAO_FINAL.md) | Validação (smoke, E2E, isolamento) |
| [SPRINT-HOMOLOGACAO.md](./SPRINT-HOMOLOGACAO.md) | Sprint homologação |
| [SPRINT-OPERACIONAL.md](./SPRINT-OPERACIONAL.md) | Sprint operacional |

## Produto (visão e release)

| Doc | Descrição |
|-----|-----------|
| [README do app](../../apps/financeiro/README.md) | Narrativa de produto (nível portfólio) |
| [CHANGELOG.md](./CHANGELOG.md) | Versões e entregas |
| [FINANCEIRO-ARCHITECTURE.md](./FINANCEIRO-ARCHITECTURE.md) | Motores score / insights / checklist + storage + analytics |
| [FINANCEIRO-POSICIONAMENTO.md](./FINANCEIRO-POSICIONAMENTO.md) | Problema, proposta e diferenciais |
| [CASE-LINKEDIN.md](./CASE-LINKEDIN.md) | Rascunhos de post / case público |
| [screenshots/README.md](./screenshots/README.md) | Material visual (3 estados mobile) |
| [ONBOARDING-SIMULACAO-3-PERFIS.md](./ONBOARDING-SIMULACAO-3-PERFIS.md) | Simulação guiada — 3 perfis (fricção + melhorias) |

## Produto e API

| Doc | Descrição |
|-----|-----------|
| [FINANCEIRO-PRODUCT-SPEC.md](./FINANCEIRO-PRODUCT-SPEC.md) | Especificação do produto |
| [FINANCEIRO-DATA-MODEL.md](./FINANCEIRO-DATA-MODEL.md) | Modelo de dados |
| [FINANCEIRO-API-MAP.md](./FINANCEIRO-API-MAP.md) | Mapa de APIs |
| [FINANCEIRO-MODULE-ARCHITECTURE.md](./FINANCEIRO-MODULE-ARCHITECTURE.md) | Arquitetura do módulo |
| [FINANCEIRO-DOMAIN-EVENTS.md](./FINANCEIRO-DOMAIN-EVENTS.md) | Domain events |
| [FINANCEIRO-FEATURE-STANDARD.md](./FINANCEIRO-FEATURE-STANDARD.md) | Padrão de features |
| [FINANCEIRO-APP-VS-GROWTH.md](./FINANCEIRO-APP-VS-GROWTH.md) | App vs growth |
| [FINANCEIRO-PRODUCT-ANALYTICS.md](./FINANCEIRO-PRODUCT-ANALYTICS.md) | Product analytics |
| [RELATORIO-PADROES-DESIGN-PARA-FINANCEIRO.md](./RELATORIO-PADROES-DESIGN-PARA-FINANCEIRO.md) | Design system |

SQL RLS: `apps/financeiro/prisma/sql/RLS_FINANCEIRO.sql`.
