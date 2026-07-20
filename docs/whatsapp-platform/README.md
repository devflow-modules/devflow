# Docs — WhatsApp Platform

Índice canónico do produto WhatsApp Platform no monorepo.

## Ler primeiro (governança)

| Documento | Função |
|-----------|--------|
| [DOCUMENTATION-MAP.md](./DOCUMENTATION-MAP.md) | Classificação de docs, fontes de verdade, resolução de conflitos |
| [CURRENT-SCOPE.md](./CURRENT-SCOPE.md) | Escopo ativo, personas, capabilities, mocks, deferidos, piloto |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Ownership app/packages, fronteiras, fluxos, tenancy |

## Divisão das árvores de documentação

| Árvore | Responsabilidade |
|--------|------------------|
| `docs/whatsapp/` | Ecossistema, portal/CRM, playbooks Meta/comerciais |
| `docs/whatsapp-platform/` | Produto, escopo, arquitetura transversal, piloto |
| `apps/whatsapp-platform/docs/` | Runtime, deploy, security, billing de implementação, design system |

Não mover ficheiros só por reorganização — actualizar o [DOCUMENTATION-MAP.md](./DOCUMENTATION-MAP.md) quando a classificação mudar.

## Piloto e operação

- [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) — runbook operacional: env, Meta, webhook, inbox e smoke para piloto real
- [SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md) — smoke ponta a ponta: inbound, assign, outbound, fecho
- [LEAD-TO-TENANT-PILOT.md](./LEAD-TO-TENANT-PILOT.md) — lead CRM qualificado → tenant piloto
- [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) — checklist operacional mínimo de privacidade/LGPD
- [OBSERVABILITY-PILOT.md](./OBSERVABILITY-PILOT.md) — eventos e campos de log mínimos (sem PII/tokens)
- [REAL-APP-DEMO.md](./REAL-APP-DEMO.md) — demo comercial no app real com tenant demo

## Domínio (inbox, IA, billing)

- [INBOX_PORT_MULTI_TENANT.md](./INBOX_PORT_MULTI_TENANT.md) — inbox Cloud API multi-tenant, rotas `/api/inbox/*`
- [INBOX_UI.md](./INBOX_UI.md) — UI `/inbox`, React Query, envio
- [INBOX_OPERATIONS.md](./INBOX_OPERATIONS.md) — operações de inbox
- [INBOX_COLLABORATION.md](./INBOX_COLLABORATION.md) — colaboração multi-agente
- [INBOX_REALTIME.md](./INBOX_REALTIME.md) — realtime / SSE
- [AI_AUTOMATION.md](./AI_AUTOMATION.md) — IA automática por tenant
- [AUTOMATION_ENGINE.md](./AUTOMATION_ENGINE.md) — motor de regras
- [BILLING.md](./BILLING.md) — uso por tenant, Stripe, limites
- [BILLING_PLANS.md](./BILLING_PLANS.md) — planos
- [BILLING_AND_GATING.md](./BILLING_AND_GATING.md) — feature gating
- [METERED_BILLING.md](./METERED_BILLING.md) — cobrança variável
- [STRIPE_INTEGRATION.md](./STRIPE_INTEGRATION.md) — integração Stripe
- [SAAS_METRICS.md](./SAAS_METRICS.md) — métricas SaaS

## Auditorias e backlog (não são spec viva)

- [WHATSAPP-PLATFORM-AUDIT.md](./WHATSAPP-PLATFORM-AUDIT.md) — auditoria de maturidade (evidência)
- [WHATSAPP-PLATFORM-P0-BACKLOG.md](./WHATSAPP-PLATFORM-P0-BACKLOG.md) — backlog P0 piloto (verificar status)
- [PRODUCT-UI-AUDIT.md](./PRODUCT-UI-AUDIT.md) — auditoria visual vs Product UI System

## Cursor

- Regra: `.cursor/rules/05-whatsapp-platform.mdc`
- Design: `.cursor/rules/whatsapp-platform-design.mdc`
- Skill: `.cursor/skills/whatsapp-platform-safe-change.md`
