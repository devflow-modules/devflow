---
name: whatsapp-platform-safe-change
description: >-
  Alterações seguras em apps/whatsapp-platform: auth, billing, tenant,
  webhooks Meta, Cloud API e UI alinhada ao design system. Usar quando o
  utilizador pedir mudanças no produto WhatsApp Platform ou caminhos
  whatsapp-platform/**. Obriga mapa de impacto e quality gates por tipo.
---

# WhatsApp Platform — mudança segura

Leia:

1. [`AGENTS.md`](../../AGENTS.md)
2. [`.cursor/rules/05-whatsapp-platform.mdc`](../rules/05-whatsapp-platform.mdc)
3. [`.cursor/rules/whatsapp-platform-design.mdc`](../rules/whatsapp-platform-design.mdc) (se UI)
4. [`docs/whatsapp-platform/CURRENT-SCOPE.md`](../../docs/whatsapp-platform/CURRENT-SCOPE.md)
5. [`docs/whatsapp-platform/ARCHITECTURE.md`](../../docs/whatsapp-platform/ARCHITECTURE.md)

## 0. Mapa de impacto (obrigatório antes da primeira edição)

Produzir e manter no raciocínio do agente (e no PR quando útil):

```text
Domain:
App owner:
Core / package potencial:
Persistência (schema / estado):
Tenant:
Auth / roles:
Auditoria:
UI / cache:
Testes (gates mínimos):
Docs a actualizar:
Fora do escopo:
```

Usar a cheatsheet de blast radius em `ARCHITECTURE.md` §7. Exemplo de conclusão esperada para “reabrir conversa encerrada”:

```text
Domain: inbox/conversations
App owner: apps/whatsapp-platform
Core potencial: packages/whatsapp-core (só se regra pura partilhável)
Persistência: estado da conversa (OPEN/PENDING/CLOSED)
Tenant: obrigatório
Auth: agente do tenant
Auditoria: registar reabertura
UI: invalidar/actualizar React Query
Testes: test:node + test:ui + test:e2e:inbox
Docs: inbox operations (+ CURRENT-SCOPE se capacidade nova)
Fora do escopo: billing, portal público, webhook Meta
```

Se o owner correcto for um package (`whatsapp-core`, `billing-core`, …) e não o app, **não** implementar a regra só no app.

## 1. Inspecção

Antes de editar: serviços, route handlers, middleware e testes no mesmo domínio (`src/modules/**`, `src/app/**`, `*.test.ts` vizinhos, packages afectados).

## 2. Preservar

- Auth (JWT/sessão do app) e roles
- Billing (Stripe, quotas, idempotência)
- Isolamento por tenant em queries e handlers
- Audit logs onde existirem
- Webhook (GET verify + POST, assinatura, retries Meta)
- Pressupostos Cloud API documentados em `apps/whatsapp-platform/docs/`
- Fronteiras: portal sem Prisma WhatsApp; UI sem authz autoritativa; cliente sem `tenantId`/`phoneNumberId`/limites autoritativos

## 3. Schema / superfícies

- **Prisma / schema** — não alterar salvo pedido explícito; migrations não destrutivas sem aprovação humana.
- **`apps/whatsapp-webhook-api`** — `legacy-compatible`; não adicionar features de produto.
- **White-label / UX cliente** — não expor margens, billing interno ou identificadores sensíveis.

## 4. Quality gates por tipo de mudança

Correr em `apps/whatsapp-platform` (e testes do package se o package mudou):

| Mudança | Gates mínimos |
|---------|----------------|
| Domínio puro | `pnpm test:node` |
| Componente/UI | `pnpm test:ui`, lint, design system |
| Inbox | `pnpm test:node`, `pnpm test:ui`, `pnpm test:e2e:inbox` |
| Fluxo crítico visual | E2E relevante + `pnpm test:a11y` / `test:a11y:product-ui` |
| Webhook Meta | `pnpm test:node`, `pnpm smoke`, `pnpm ops:check-channel` |
| Billing | `pnpm test:node` (+ testes `billing-core`), revisão de idempotência |
| Prisma | `pnpm db:generate`, validação de migration, testes de isolamento |
| Design system | lint visual + `pnpm test:a11y:product-ui` |

Quando a lógica mudar: **actualizar ou acrescentar testes directos** (Vitest) ao módulo afectado — não só snapshots.

Smoke manual mínimo adicional quando UI ou fluxos críticos mudarem (onboarding, inbox, billing) se E2E/env não cobrirem.

## 5. Documentação

- Capacidade nova/alterada → `CURRENT-SCOPE.md`
- Ownership/fronteira → `ARCHITECTURE.md` + esta skill/regra se necessário
- Doc novo → linha em `DOCUMENTATION-MAP.md`
- Não tratar decks comerciais ou `/demo` do portal como critério de aceite do runtime

## Não fazer

- Não editar código sem o mapa de impacto da secção 0.
- Não relaxar tenant nem assinatura de webhook “para facilitar”.
- Não logar tokens, corpo assinado de webhook ou PII desnecessária.
- Não misturar refactor grande com correção pontual no mesmo PR.
- Não alterar URLs canónicas de webhook/OAuth sem `apps/whatsapp-platform/docs/DEPLOY_APP_SUBDOMAIN.md`.
- Não implementar feature nova em `apps/whatsapp-webhook-api` ou no Prisma do portal para ops WhatsApp.

## Princípios gerais

- Diffs pequenos e revistos; seguir padrões do módulo.
- Issues/labels: [`docs/operations/GITHUB_LABELS.md`](../../docs/operations/GITHUB_LABELS.md).
